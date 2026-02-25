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
          className="px-6 py-3 transition-colors"
          style={{ border: '1px solid var(--border-card)', color: 'var(--text-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
