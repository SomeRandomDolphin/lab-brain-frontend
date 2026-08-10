"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { authService } from "@/lib/auth";
import { api } from "@/lib/api";
import { initials } from "@/lib/utils";
import { PrivacyConsentModal } from "@/components/dashboard/PrivacyConsentModal";

interface SessionRecord {
  session_id:    string;
  started_iso:   string;
  ended_iso:     string;
  total_records: number;
  transcripts:   number;
  vision_frames: number;
  agent_replies: number;
  summaries:     number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, loading } = useAuthStore();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [showTosModal, setShowTosModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.replace("/auth/login"); return; }

    // tosAccepted is null/undefined until the user has answered the privacy
    // modal once (see POST /privacy/tos-consent). Re-check on every mount,
    // not just first login, in case they land here on a fresh session.
    if (user && user.tosAccepted == null) {
      setShowTosModal(true);
    }

    api.listSessions()
      .then((r) => setSessions(r.sessions ?? []))
      .catch(() => {});

    api.getMetrics()
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setLoadingMetrics(false));
  }, [user, router]);

  async function handleTosDecision(accepted: boolean) {
    const result = await api.setTosConsent(accepted); // POST /privacy/tos-consent
    useAuthStore.getState().updateUser({
      tosAccepted: accepted,
      tosAcceptedAt: result.tosAcceptedAt,
    });
    setShowTosModal(false);
  }

  async function handleLogout() {
    await authService.logout();
    logout();
    router.push("/");
  }

  const totalSegments = metrics
    ? Object.values(metrics).reduce((acc: number, m: unknown) => {
        const mv = m as Record<string, unknown>;
        return acc + (typeof mv?.segments === "number" ? mv.segments : 0);
      }, 0)
    : 0;

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">
      {showTosModal && <PrivacyConsentModal onDecide={handleTosDecision} />}

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-[20%] w-[600px] h-[400px] rounded-full bg-signal/6 blur-[120px]" />
        <div className="absolute bottom-0 right-[10%] w-[400px] h-[400px] rounded-full bg-active/5 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-signal flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="white" />
              <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="2 2" />
            </svg>
          </div>
          <span className="font-semibold text-sm">Lab Brain</span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-400">{user?.name}</span>
          <div
            className="w-8 h-8 rounded-full bg-signal/20 border border-signal/30 flex items-center justify-center text-xs font-semibold text-signal-light cursor-default"
            title={user?.email}
          >
            {user ? initials(user.name) : "?"}
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-neutral-500 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gradient">
              Good {greeting()}, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">Your research workspace</p>
          </div>
          <Link
            href="/session"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-signal hover:bg-signal-light text-white text-sm font-semibold transition-all shadow-signal"
          >
            <span className="w-2 h-2 rounded-full bg-white/60" />
            New session
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Sessions", value: sessions.length, unit: "" },
            { label: "Transcribed", value: totalSegments, unit: "segments" },
            { label: "Backend", value: "●", unit: "connected" },
            { label: "ASR model", value: "WhisperX", unit: "" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4">
              <div className="text-xs text-neutral-500 mb-1">{s.label}</div>
              <div className="text-xl font-bold text-white">
                {loadingMetrics && s.label === "Transcribed" ? "—" : s.value}
              </div>
              {s.unit && <div className="text-xs text-neutral-600 mt-0.5">{s.unit}</div>}
            </div>
          ))}
        </div>

        {/* Past sessions */}
        <div>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wider">
            Past sessions
          </h2>

          {sessions.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-neutral-600 text-sm">
              No sessions yet. Start one to see it here.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.slice().reverse().map((s) => (
                <div
                  key={s.session_id}
                  className="glass rounded-xl px-5 py-3.5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-neutral-600" />
                    <div>
                      <div className="text-sm font-medium text-white">
                        Session #{s.session_id}
                      </div>
                      <div className="text-xs text-neutral-600 mt-0.5">
                        {s.total_records} records · {s.transcripts}T · {s.vision_frames}V · {s.agent_replies}A
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/sessions/${s.session_id}`}
                    className="text-xs text-signal-light hover:underline"
                  >
                    View records
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}