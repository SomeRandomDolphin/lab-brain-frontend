"use client";
import { useState } from "react";
import Link from "next/link";
import { authService } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] rounded-full bg-signal/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-signal flex items-center justify-center shadow-signal">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" fill="white" />
                <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="2 2" />
              </svg>
            </div>
            <span className="font-semibold text-lg">Lab Brain</span>
          </Link>
          <h1 className="text-2xl font-bold text-gradient">Reset password</h1>
          <p className="text-sm text-neutral-500 mt-1.5">
            {sent ? "Email sent" : "Enter your email to receive a reset link"}
          </p>
        </div>

        <div className="glass-strong rounded-3xl p-7 shadow-panel">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-4">📬</div>
              <p className="text-sm text-neutral-300 mb-1">Check your inbox at</p>
              <p className="text-sm font-medium text-signal-light mb-5">{email}</p>
              <p className="text-xs text-neutral-600 mb-6 leading-relaxed">
                Click the link in the email to set a new password.
              </p>
              <Link href="/auth/login" className="text-xs text-neutral-500 hover:text-white transition-colors">
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger animate-fade-in">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5" htmlFor="email">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@lab.org"
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
                      Sending…
                    </span>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>
              <p className="text-center text-xs text-neutral-500 mt-5">
                <Link href="/auth/login" className="text-signal-light hover:underline">
                  ← Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
