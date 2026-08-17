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
  const [loadingSessions, setLoadingSessions] = useState(true);
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
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
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

  // Newest-first. Sorting explicitly by started_iso rather than relying on
  // API return order, which isn't guaranteed to stay stable.
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.started_iso).getTime() - new Date(a.started_iso).getTime()
  );

  // Real aggregate stats, derived directly from the typed session records
  // rather than a separately-fetched metrics blob of unknown shape — these
  // fields (transcripts/vision_frames/agent_replies) are exactly what the
  // per-session list already gives us, so there's no risk of the tiles
  // silently showing 0 because a field name didn't match.
  const totalTranscripts  = sumField(sessions, "transcripts");
  const totalVisionFrames = sumField(sessions, "vision_frames");
  const totalAgentReplies = sumField(sessions, "agent_replies");
  const avgDurationSec    = averageDurationSeconds(sessions);

  const stats: { label: string; value: string | number; unit: string }[] = [
    { label: "Sessions", value: sessions.length, unit: sessions.length === 1 ? "session" : "sessions" },
    { label: "Transcribed", value: totalTranscripts, unit: "segments" },
    { label: "Vision frames", value: totalVisionFrames, unit: "captured" },
    { label: "Agent replies", value: totalAgentReplies, unit: "sent" },
  ];
  // Only show an average-length tile once there's at least one session with
  // a computable duration — showing "0:00" for a brand-new account with no
  // sessions yet would read as broken rather than empty.
  if (avgDurationSec !== null) {
    stats.push({ label: "Avg. length", value: formatDuration(avgDurationSec), unit: "per session" });
  }

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
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4">
              <div className="text-xs text-neutral-500 mb-1">{s.label}</div>
              <div className="text-xl font-bold text-white">
                {loadingSessions ? "—" : s.value}
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

          {loadingSessions ? (
            <div className="glass rounded-2xl p-10 text-center text-neutral-600 text-sm animate-pulse">
              Loading sessions…
            </div>
          ) : sessions.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-neutral-600 text-sm">
              No sessions yet. Start one to see it here.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedSessions.map((s) => (
                <div
                  key={s.session_id}
                  className="glass rounded-xl px-5 py-3.5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-neutral-600" />
                    <div>
                      <div className="text-sm font-medium text-white flex items-center gap-2">
                        Session #{s.session_id}
                        <span className="text-xs font-normal text-neutral-500">
                          {formatSessionTime(s.started_iso)}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-600 mt-0.5">
                        {s.total_records} records · {s.transcripts}T · {s.vision_frames}V · {s.agent_replies}A
                        {" · "}
                        {formatDuration(durationSeconds(s)) ?? "—"}
                      </div>
                    </div>
                  </div>
                  <Link
                    // GET /lkc/sessions/{id} (api.getSession) doesn't return
                    // started_iso/ended_iso today — only session_id, count,
                    // records. We already have started_iso reliably from
                    // this list call, so pass it along via the URL rather
                    // than have the detail page guess a timestamp out of
                    // raw record fields. If the backend ever adds
                    // started_iso to that endpoint directly, this query
                    // param becomes redundant (harmless) and can be
                    // dropped in favor of reading it straight off the
                    // response.
                    href={`/dashboard/sessions/${s.session_id}?started=${encodeURIComponent(s.started_iso)}`}
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

// Renders e.g. "Aug 17, 9:04 AM". Falls back to "" on a bad/missing
// timestamp instead of showing "Invalid Date" in the UI.
function formatSessionTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Sum a numeric field across sessions, treating missing/non-numeric values as 0. */
function sumField(sessions: SessionRecord[], field: keyof SessionRecord): number {
  return sessions.reduce((acc, s) => {
    const v = s[field];
    return acc + (typeof v === "number" ? v : 0);
  }, 0);
}

/** Duration of a single session in seconds, or null if either timestamp is missing/invalid. */
function durationSeconds(s: SessionRecord): number | null {
  if (!s.started_iso || !s.ended_iso) return null;
  const start = new Date(s.started_iso).getTime();
  const end = new Date(s.ended_iso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return (end - start) / 1000;
}

/** Average duration across all sessions with a computable duration, or null if none qualify. */
function averageDurationSeconds(sessions: SessionRecord[]): number | null {
  const durations = sessions.map(durationSeconds).filter((d): d is number => d !== null);
  if (durations.length === 0) return null;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

/** Renders e.g. "42:03" or "1:02:15". Returns empty string for a missing/invalid input. */
function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null || Number.isNaN(totalSeconds)) return "";
  const total = Math.round(totalSeconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}