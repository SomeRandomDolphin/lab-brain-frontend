"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useSession } from "@/hooks/useSession";
import { useSSE } from "@/hooks/useSSE";
import { useSessionStore } from "@/store/session";
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
import { initials } from "@/lib/utils";

export default function SessionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { start, stop, starting, stopping, error } = useSession();
  const { sessionId, isLive, summary, summaryLoading } = useSessionStore();

  // Connect SSE when session is active
  useSSE(sessionId);

  // Gate: must be logged in
  useEffect(() => {
    if (!user) router.replace("/auth/login");
  }, [user, router]);

  // Auto-start on mount
  const startedRef = useRef(false);
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      start();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen bg-ink-950 flex flex-col overflow-hidden">
      {/* Ambient layer */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-signal/5 blur-[120px] transition-opacity duration-1000" style={{ opacity: isLive ? 1 : 0.4 }} />
        <div className="absolute bottom-[-5%] right-[5%] w-[400px] h-[400px] rounded-full bg-active/4 blur-[100px]" />
      </div>

      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-5 py-3 border-b border-white/5 glass-strong">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-signal flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" fill="white" />
                <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="2 2" />
              </svg>
            </div>
            <span className="text-sm font-semibold">Lab Brain</span>
          </Link>

          {sessionId && (
            <span className="hidden sm:block text-xs font-mono text-neutral-600 border border-white/5 px-2 py-0.5 rounded">
              {sessionId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isLive && <ModeIndicator />}
          <MetricsBar />
          <div className="w-7 h-7 rounded-full bg-signal/20 border border-signal/30 flex items-center justify-center text-xs font-semibold text-signal-light">
            {user ? initials(user.name) : "?"}
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="relative z-10 flex-1 flex overflow-hidden">

        {/* Left panel — transcript */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
          {/* Agent reply banner (sticky top) */}
          <AgentReplyBanner />

          {/* Transcript scroll area */}
          <div className="flex-1 overflow-y-auto">
            {(starting || (!isLive && !error && !sessionId)) ? (
              <ConnectingState />
            ) : error ? (
              <ErrorState error={error} onRetry={start} />
            ) : (
              <TranscriptPanel />
            )}
          </div>

          {/* Bottom controls */}
          <div className="border-t border-white/5 glass-strong px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isLive && <Waveform />}
              {sessionId && <SpeakerChips />}
            </div>

            <div className="flex items-center gap-3">
              {sessionId && <SummonButton sessionId={sessionId} />}
              <EndButton
                isLive={isLive}
                stopping={stopping}
                onStop={async () => {
                  await stop();
                }}
              />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="hidden lg:flex w-72 xl:w-80 flex-col border-l border-white/5 overflow-y-auto">
          <EnvironmentPanel />
        </div>
      </div>

      {/* Summary modal */}
      {(summary !== null || summaryLoading) && <SummaryModal />}
    </div>
  );
}

function ConnectingState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 h-full">
      <div className="mb-6">
        <div className="w-16 h-16 rounded-full border-2 border-signal/30 border-t-signal animate-spin mx-auto" />
      </div>
      <p className="text-sm text-neutral-400">Connecting to LiveKit…</p>
      <p className="text-xs text-neutral-600 mt-2">Setting up audio and camera</p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 h-full">
      <div className="text-4xl mb-4">⚠️</div>
      <p className="text-sm text-danger font-medium mb-2">Connection failed</p>
      <p className="text-xs text-neutral-500 text-center max-w-xs mb-5">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-signal text-white text-sm hover:bg-signal-light transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

function EndButton({
  isLive, stopping, onStop,
}: {
  isLive: boolean; stopping: boolean; onStop: () => void;
}) {
  return (
    <button
      onClick={onStop}
      disabled={stopping || !isLive}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-danger/90 hover:bg-danger disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
    >
      {stopping ? (
        <>
          <div className="w-3.5 h-3.5 border border-white/50 border-t-white rounded-full animate-spin" />
          Ending…
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="2" width="10" height="10" rx="1.5" fill="currentColor" />
          </svg>
          End session
        </>
      )}
    </button>
  );
}
