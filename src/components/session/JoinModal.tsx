"use client";
import { useState } from "react";
import { PreCheck } from "./PreCheck";
import type { DeviceChoice } from "@/hooks/useDevicePreview";

interface Props {
  onJoin: (sessionId: string, devices: DeviceChoice) => void;
  onHost: (devices: DeviceChoice) => void;
  loading: boolean;
  error: string | null;
  /** Session ID pulled from a `/session?join=<id>` meeting link. */
  initialSessionId?: string;
}

type Step = "choose" | "precheck";

export function JoinModal({ onJoin, onHost, loading, error, initialSessionId }: Props) {
  const [tab, setTab] = useState<"host" | "join">(initialSessionId ? "join" : "host");
  const [sessionId, setSessionId] = useState(initialSessionId ?? "");
  // Arriving via a meeting link (`initialSessionId` set) skips straight to
  // the device-check screen below with the ID already filled in — but it
  // still requires the person to press "Join now" there. Previously this
  // component auto-called onJoin() from a mount effect the instant a link
  // was present, which (a) dropped people straight into the room with no
  // chance to check mic/camera first, and (b) — combined with a since-fixed
  // remount bug in the parent page — could re-trigger itself into a
  // reconnect loop. There is now no code path that calls onJoin/onHost
  // without an explicit click on the confirm button inside <PreCheck>.
  const [step, setStep] = useState<Step>(initialSessionId ? "precheck" : "choose");

  function handleChooseJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId.trim()) return;
    setStep("precheck");
  }

  function handleConfirm(devices: DeviceChoice) {
    if (tab === "host") onHost(devices);
    else onJoin(sessionId.trim(), devices);
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-950 flex items-center justify-center p-4">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] rounded-full bg-signal/8 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] rounded-full bg-active/6 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-signal shadow-signal flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="white" />
              <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="2 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gradient">Lab Brain</h1>
          <p className="text-sm text-neutral-500 mt-1">Research session meeting</p>
        </div>

        {/* Tabs — only shown on the chooser step; the precheck step already
            knows which mode it's in. */}
        {step === "choose" && (
          <div className="glass-strong rounded-3xl p-2 mb-4">
            <div className="flex rounded-2xl overflow-hidden bg-ink-900/50 p-1">
              <button
                onClick={() => setTab("host")}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === "host"
                    ? "bg-signal text-white shadow-signal"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                Start new session
              </button>
              <button
                onClick={() => setTab("join")}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === "join"
                    ? "bg-signal text-white shadow-signal"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                Join existing
              </button>
            </div>
          </div>
        )}

        <div className="glass-strong rounded-3xl p-7 shadow-panel">
          {step === "choose" && error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger animate-fade-in">
              {error}
            </div>
          )}

          {step === "choose" ? (
            tab === "host" ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-4xl mb-3">🧪</div>
                  <h2 className="text-base font-semibold text-white mb-1">Host a new session</h2>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Creates a new LiveKit room. You&apos;ll get a session ID you can share with
                    collaborators so they can join.
                  </p>
                </div>
                <button
                  onClick={() => setStep("precheck")}
                  className="w-full py-3 rounded-xl bg-signal hover:bg-signal-light text-white text-sm font-semibold transition-all shadow-signal"
                >
                  Continue
                </button>
              </div>
            ) : (
              <form onSubmit={handleChooseJoin} className="space-y-4">
                <div className="text-center py-2">
                  <h2 className="text-base font-semibold text-white mb-1">Join a session</h2>
                  <p className="text-xs text-neutral-500">
                    Enter the session ID shared by the host. You&apos;ll join as{" "}
                    {/* Display identity now comes from the logged-in account,
                        not a typed name — see api.ts::getToken. */}
                    your account.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5" htmlFor="sid">
                    Session ID
                  </label>
                  <input
                    id="sid"
                    type="text"
                    required
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="e.g. a3f9b2c1"
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-rim text-sm font-mono placeholder:text-neutral-600 focus:border-signal/50 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!sessionId.trim()}
                  className="w-full py-3 rounded-xl bg-signal hover:bg-signal-light disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-signal"
                >
                  Continue
                </button>
              </form>
            )
          ) : (
            <PreCheck
              mode={tab}
              sessionLabel={tab === "join" ? `Session ${sessionId}` : "New session"}
              loading={loading}
              error={error}
              confirmLabel={tab === "host" ? "Start session" : "Join now"}
              onBack={initialSessionId ? undefined : () => setStep("choose")}
              onConfirm={handleConfirm}
            />
          )}
        </div>
      </div>
    </div>
  );
}