"use client";
/**
 * /auth/reset-password?token=<reset_token>
 *
 * The backend emails a link of the form:
 *   http://localhost:5173/auth/reset-password?token=<opaque_token>
 *
 * We read the token from the URL, let the user enter a new password,
 * then POST /auth/reset-password with both.
 */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "@/lib/auth";
import { Suspense } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!resetToken) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-danger mb-4">Missing or invalid reset token.</p>
        <Link href="/auth/forgot-password" className="text-xs text-signal-light hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setSubmitting(true);
    try {
      await authService.resetPassword(resetToken, password);
      router.replace("/auth/login?reset=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger animate-fade-in">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-rim text-sm placeholder:text-neutral-600 focus:border-signal/50 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5" htmlFor="confirm">
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-rim text-sm placeholder:text-neutral-600 focus:border-signal/50 focus:outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-signal hover:bg-signal-light disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-signal"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
              Saving…
            </span>
          ) : (
            "Update password"
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] rounded-full bg-signal/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-signal mx-auto mb-4 flex items-center justify-center shadow-signal">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="white" />
              <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="2 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gradient">Set new password</h1>
          <p className="text-sm text-neutral-500 mt-1.5">Choose a strong password for your account</p>
        </div>

        <div className="glass-strong rounded-3xl p-7 shadow-panel">
          <Suspense fallback={
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 rounded-full border-2 border-signal/30 border-t-signal animate-spin" />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
