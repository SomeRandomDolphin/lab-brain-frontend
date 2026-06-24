"use client";
/**
 * /auth/callback
 *
 * Supabase redirects here after:
 *   - Email confirmation (sign-up)
 *   - Magic link sign-in
 *   - OAuth provider (Google, GitHub, etc.) if you enable them later
 *
 * The URL contains a `code` query param. We exchange it for a session,
 * then send the user to the dashboard.
 *
 * Set this URL as the "Redirect URL" in your Supabase project:
 *   Authentication → URL Configuration → Redirect URLs
 *   → http://localhost:5173/auth/callback   (dev)
 *   → https://yourdomain.com/auth/callback  (prod)
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // exchangeCodeForSession picks up the `code` in the URL automatically
    supabase.auth
      .exchangeCodeForSession(window.location.href)
      .then(({ error }) => {
        if (error) {
          setError(error.message);
        } else {
          router.replace("/dashboard");
        }
      });
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
        <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center">
          <div className="text-3xl mb-4">⚠️</div>
          <p className="text-sm font-medium text-danger mb-2">Link expired or invalid</p>
          <p className="text-xs text-neutral-500 mb-5">{error}</p>
          <a
            href="/auth/login"
            className="text-sm text-signal-light hover:underline"
          >
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-signal/30 border-t-signal animate-spin" />
        <p className="text-sm text-neutral-400">Completing sign-in…</p>
      </div>
    </div>
  );
}
