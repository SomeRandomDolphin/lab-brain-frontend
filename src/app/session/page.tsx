"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useSession } from "@/hooks/useSession";
import { useSSE } from "@/hooks/useSSE";
import { useSessionStore } from "@/store/session";
import { useShallow } from "zustand/react/shallow";
import { VideoGrid } from "@/components/session/VideoGrid";
import { ControlBar } from "@/components/session/ControlBar";
import { JoinModal } from "@/components/session/JoinModal";
import { InviteToast } from "@/components/session/InviteToast";
import { ModeIndicator } from "@/components/session/ModeIndicator";
import { TranscriptPanel } from "@/components/session/TranscriptPanel";
import { AgentReplyBanner } from "@/components/session/AgentReplyBanner";
import { SpeakerChips } from "@/components/session/SpeakerChips";
import { MetricsBar } from "@/components/session/MetricsBar";
import { SummonButton } from "@/components/session/SummonButton";
import { SummaryModal } from "@/components/session/SummaryModal";
import { Waveform } from "@/components/session/Waveform";
import { EnvironmentPanel } from "@/components/session/EnvironmentPanel";
import Link from "next/link";
import { initials, cn } from "@/lib/utils";

export default function SessionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { start, join, stop, toggleMic, toggleCam, shareScreen, starting, stopping, error } = useSession();
  // Previously: const { sessionId, isLive, isGuest, summary, summaryLoading } = useSessionStore();
  // That subscribes to the ENTIRE store — any set() call anywhere (e.g. the
  // high-frequency `listening`/`perception` updates from useSSE) re-rendered
  // this whole page and everything under it. useShallow scopes the
  // subscription to just these 5 fields and only re-renders when one of
  // THEM actually changes value.
  const { sessionId, isLive, isGuest, summary, summaryLoading } = useSessionStore(
    useShallow((s) => ({
      sessionId: s.sessionId,
      isLive: s.isLive,
      isGuest: s.isGuest,
      summary: s.summary,
      summaryLoading: s.summaryLoading,
    }))
  );

  // Whether to show the pre-call modal (before any session started)
  const [showModal, setShowModal] = useState(true);
  // Whether to show the transcript panel as a right sidebar
  const [showTranscript, setShowTranscript] = useState(true);
  // Tracks whether we just ended a session — keeps the session page mounted
  // so <SummaryModal> stays visible. Cleared when the user dismisses the
  // summary or starts/joins a new session.
  const [hasEnded, setHasEnded] = useState(false);

  // Connect SSE when we have a session
  useSSE(sessionId);

  // Gate: must be logged in
  useEffect(() => {
    if (!user) router.replace("/auth/login");
  }, [user, router]);

  // Hide modal once we're connected
  useEffect(() => {
    if (isLive) setShowModal(false);
  }, [isLive]);

  function handleHost() {
    setHasEnded(false);
    start();
  }

  // No more displayName param — identity now comes from the authenticated
  // account, not a client-typed name. See useSession.ts::join and
  // components/session/JoinModal.tsx.
  function handleJoin(sid: string) {
    setHasEnded(false);
    join(sid);
  }

  async function handleEnd() {
    await stop();
    if (isGuest) {
      router.push("/dashboard");
    } else {
      // Keep the session page mounted so <SummaryModal> can display.
      // The modal's onClose will clear this flag and return to the lobby.
      setHasEnded(true);
    }
  }

  // Show the pre-call chooser until connected
  if (showModal || (!isLive && !starting && !hasEnded)) {
    return (
      <JoinModal
        onHost={handleHost}
        onJoin={handleJoin}
        loading={starting}
        error={error}
      />
    );
  }

  return (
    <div className="h-screen bg-ink-950 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-5 py-2.5 border-b border-white/5 glass-strong flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-signal flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" fill="white" />
                <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="2 2" />
              </svg>
            </div>
            <span className="text-sm font-semibold hidden sm:block">Lab Brain</span>
          </Link>

          {/* Live indicator */}
          {isLive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger/10 border border-danger/20">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
              <span className="text-[11px] font-semibold text-danger uppercase tracking-wide">Live</span>
            </div>
          )}

          {isGuest && (
            <span className="text-xs text-neutral-600 border border-white/5 px-2 py-0.5 rounded">
              Guest
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isLive && <ModeIndicator />}
          <MetricsBar />

          {/* Transcript toggle */}
          <button
            onClick={() => setShowTranscript((v) => !v)}
            title="Toggle transcript"
            className={cn(
              "p-1.5 rounded-lg border text-xs transition-all",
              showTranscript
                ? "glass border-signal/30 text-signal-light"
                : "glass border-white/10 text-neutral-500 hover:text-white"
            )}
          >
            <TranscriptIcon />
          </button>

          <div className="w-7 h-7 rounded-full bg-signal/20 border border-signal/30 flex items-center justify-center text-xs font-semibold text-signal-light">
            {user ? initials(user.name) : "?"}
          </div>
        </div>
      </header>

      {/* Main — video grid + optional transcript sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video area (takes all remaining space) */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Invite toast: shown to host until dismissed */}
          <InviteToast />

          {/* Video grid */}
          <div className="flex-1 overflow-hidden">
            {starting ? (
              <ConnectingState />
            ) : error && !isLive ? (
              <ErrorState error={error} onRetry={handleHost} />
            ) : (
              <VideoGrid />
            )}
          </div>

          {/* Agent reply banner floats above the control bar */}
          <div className="relative">
            <AgentReplyBanner />
          </div>

          {/* Bottom control bar — Google Meet style */}
          <div className="glass-strong border-t border-white/5 px-6 py-4 flex items-center justify-between flex-shrink-0">
            {/* Left — clock + speakers */}
            <div className="flex items-center gap-3 w-48">
              <LiveClock />
              {sessionId && <SpeakerChips />}
            </div>

            {/* Centre — main controls */}
            <ControlBar
              onToggleMic={toggleMic}
              onToggleCam={toggleCam}
              onShareScreen={shareScreen}
              onEnd={handleEnd}
              stopping={stopping}
              isGuest={isGuest}
            />

            {/* Right — waveform + summon */}
            <div className="flex items-center gap-3 w-48 justify-end">
              {isLive && <Waveform />}
              {sessionId && !isGuest && <SummonButton sessionId={sessionId} />}
            </div>
          </div>
        </div>

        {/* Transcript sidebar */}
        {showTranscript && (
          <div className="w-80 xl:w-96 flex-shrink-0 flex flex-col border-l border-white/5 overflow-hidden">
            {/* Sidebar header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Transcript
              </h2>
              <button
                onClick={() => setShowTranscript(false)}
                className="text-neutral-700 hover:text-neutral-400 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Transcript panel fills remaining height */}
            <div className="flex-1 overflow-y-auto">
              <TranscriptPanel />
            </div>

            {/* Environment panel — bottom of sidebar */}
            <div className="flex-shrink-0 border-t border-white/5 max-h-64 overflow-y-auto">
              <EnvironmentPanel />
            </div>
          </div>
        )}
      </div>

      {/* Summary modal (end of session) */}
      {(summary !== null || summaryLoading) && (
        <SummaryModal onClose={() => setHasEnded(false)} />
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function ConnectingState() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-ink-950">
      <div className="w-14 h-14 rounded-full border-2 border-signal/30 border-t-signal animate-spin" />
      <p className="text-sm text-neutral-400">Connecting to room…</p>
      <p className="text-xs text-neutral-700">Requesting camera and microphone</p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-ink-950">
      <div className="text-4xl">⚠️</div>
      <p className="text-sm text-danger font-medium">Connection failed</p>
      <p className="text-xs text-neutral-500 text-center max-w-xs">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-signal text-white text-sm hover:bg-signal-light transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <span className="text-xs font-mono text-neutral-500">
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

function TranscriptIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3h10M2 6.5h7M2 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}