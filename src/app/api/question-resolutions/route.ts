import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashQuestion } from "@/lib/utils/strings";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, weekStart } = body;

  if (!action || !weekStart) {
    return NextResponse.json({ error: "Missing action or weekStart" }, { status: 400 });
  }

  if (action === "resolve") {
    const { questionText, resolution } = body;
    if (!questionText) {
      return NextResponse.json({ error: "Missing questionText" }, { status: 400 });
    }

    const questionHash = await hashQuestion(questionText);
    const { data, error } = await supabase
      .from("question_resolutions")
      .upsert(
        {
          user_id: user.id,
          week_start: weekStart,
          question_hash: questionHash,
          question_text: questionText,
          resolution: resolution ?? null,
          resolved_at: new Date().toISOString(),
        },
        { onConflict: "user_id,week_start,question_hash" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to save resolution" }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  if (action === "unresolve") {
    const { questionHash } = body;
    if (!questionHash) {
      return NextResponse.json({ error: "Missing questionHash" }, { status: 400 });
    }

    const { error } = await supabase
      .from("question_resolutions")
      .delete()
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .eq("question_hash", questionHash);

    if (error) {
      return NextResponse.json({ error: "Failed to delete resolution" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
