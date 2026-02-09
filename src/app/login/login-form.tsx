"use client";

import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const unauthorized = searchParams.get("error") === "unauthorized";

  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-8">Weekly Notes</h1>
        {unauthorized && (
          <p className="text-red-600 mb-4">Access denied. This app is invite-only.</p>
        )}
        <button
          onClick={handleLogin}
          className="border border-gray-300 px-6 py-3 hover:bg-gray-50 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
