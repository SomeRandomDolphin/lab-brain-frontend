"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/lib/auth";
import { useAuthStore } from "@/store/auth";

// Same Suspense-boundary requirement as login/page.tsx and
// app/session/page.tsx — useSearchParams() needs one or `next build` fails.
export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RegisterPageInner />
    </Suspense>
  );
}

/**
 * Only ever redirect to a path *within this app* — see the matching check
 * in login/page.tsx for why (open-redirect via a crafted `redirect` param).
 */
function safeRedirect(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Carried over from login/page.tsx's "Create one" link when someone
  // without an account clicks a shared meeting link — see
  // app/session/page.tsx's login gate for where this originates.
  const redirectTo = safeRedirect(searchParams.get("redirect"));

  const { login, user, loading } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(redirectTo);
  }, [user, loading, router, redirectTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setSubmitting(true);
    try {
      const { user: u, token } = await authService.register(name, email, password);
      login(u, token);
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[15%] right-[25%] w-[450px] h-[450px] rounded-full bg-signal/10 blur-[110px]" />
        <div className="absolute bottom-[20%] left-[15%] w-[350px] h-[350px] rounded-full bg-active/7 blur-[90px]" />
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
          <h1 className="text-2xl font-bold text-gradient">Create your account</h1>
          <p className="text-sm text-neutral-500 mt-1.5">Join your research team on Lab Brain</p>
        </div>

        <div className="glass-strong rounded-3xl p-7 shadow-panel">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Jane Smith"
                className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-rim text-sm placeholder:text-neutral-600 focus:border-signal/50 focus:outline-none transition-colors"
              />
            </div>

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
              <label className="block text-xs font-medium text-neutral-400 mb-1.5" htmlFor="password">
                Password
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
                Confirm password
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
              className="w-full py-2.5 rounded-xl bg-signal hover:bg-signal-light disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-signal mt-2"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-neutral-500 mt-5">
            Already have an account?{" "}
            <Link
              href={redirectTo !== "/dashboard" ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}` : "/auth/login"}
              className="text-signal-light hover:underline"
            >
              Sign in
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