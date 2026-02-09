import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeGranolaAuth } from "@/lib/granola-oauth";
import { formatWeekStart, getMonday } from "@/lib/utils/dates";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const currentWeek = formatWeekStart(getMonday());
  const weekUrl = `${appUrl}/week/${currentWeek}`;

  if (error) {
    const desc = url.searchParams.get("error_description") ?? error;
    return NextResponse.redirect(
      `${weekUrl}?granola_error=${encodeURIComponent(desc)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${weekUrl}?granola_error=${encodeURIComponent("No authorization code received")}`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const redirectUri = `${appUrl}/auth/granola/callback`;

  try {
    await completeGranolaAuth(code, redirectUri, supabase, user.id);
    return NextResponse.redirect(`${weekUrl}?granola=connected`);
  } catch (err) {
    console.error("Granola OAuth callback failed:", err);
    return NextResponse.redirect(
      `${weekUrl}?granola_error=${encodeURIComponent("Failed to complete Granola connection")}`
    );
  }
}
