import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasGranolaConnection } from "@/lib/granola-oauth";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connected = await hasGranolaConnection(supabase, user.id);
  return NextResponse.json({ connected });
}
