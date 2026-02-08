"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
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
