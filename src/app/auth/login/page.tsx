"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already authenticated → go straight to dashboard
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user: u, token } = await authService.login(email, password);
      login(u, token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] rounded-full bg-signal/10 blur-[100px]" />
        <div className="absolute bottom-[10%] right-[20%] w-[300px] h-[300px] rounded-full bg-active/8 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
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
          <h1 className="text-2xl font-bold text-gradient">Welcome back</h1>
          <p className="text-sm text-neutral-500 mt-1.5">Sign in to your research workspace</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-7 shadow-panel">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5" htmlFor="email">
                Email
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-neutral-400" htmlFor="password">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-[11px] text-neutral-600 hover:text-signal-light transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-rim text-sm placeholder:text-neutral-600 focus:border-signal/50 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-signal hover:bg-signal-light disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-signal mt-2"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-neutral-500 mt-5">
            No account?{" "}
            <Link href="/auth/register" className="text-signal-light hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-signal/30 border-t-signal animate-spin" />
    </div>
  );
}
