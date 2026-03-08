import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UPLOAD_ALLOWED_TYPES, UPLOAD_MAX_SIZE } from "@/lib/constants";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const weekId = formData.get("weekId") as string | null;
  const dayOfWeek = formData.get("dayOfWeek") as string | null;

  if (!file || !weekId || dayOfWeek === null) {
    return NextResponse.json({ error: "Missing file, weekId, or dayOfWeek" }, { status: 400 });
  }

  // Verify week belongs to authenticated user
  const { data: week } = await supabase
    .from("weeks")
    .select("id")
    .eq("id", weekId)
    .eq("user_id", user.id)
    .single();

  if (!week) {
    return NextResponse.json({ error: "Week not found" }, { status: 404 });
  }

  if (!UPLOAD_ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > UPLOAD_MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/notes/${weekId}/${dayOfWeek}/${timestamp}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("task-images")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("task-images")
    .getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
