import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { initiateGranolaAuth } from "@/lib/granola-oauth";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/auth/granola/callback`;

  try {
    const authorizationUrl = await initiateGranolaAuth(
      redirectUri,
      supabase,
      user.id
    );
    return NextResponse.json({ authorizationUrl });
  } catch (err) {
    console.error("Granola OAuth initiation failed:", err);
    return NextResponse.json(
      { error: "Failed to initiate Granola connection" },
      { status: 500 }
    );
  }
}
