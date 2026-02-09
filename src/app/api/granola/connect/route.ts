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
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Granola OAuth initiation failed:", message, stack);
    return NextResponse.json(
      { error: `Failed to initiate Granola connection: ${message}` },
      { status: 500 }
    );
  }
}
