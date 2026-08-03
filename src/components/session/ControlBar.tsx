"use client";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session";
import { useShallow } from "zustand/react/shallow";

interface Props {
  onToggleMic: () => void;
  onToggleCam: () => void;
  onShareScreen: () => void;
  onEnd: () => void;
  stopping: boolean;
  isGuest: boolean;
}

export function ControlBar({
  onToggleMic,
  onToggleCam,
  onShareScreen,
  onEnd,
  stopping,
  isGuest,
}: Props) {
  // Previously a bare useSessionStore() call — this bar sits in the hot
  // control area and was re-rendering on every "listening"/"perception"
  // update in the store even though it only reads these 3 fields.
  const { micEnabled, camEnabled, sessionId } = useSessionStore(
    useShallow((s) => ({
      micEnabled: s.micEnabled,
      camEnabled: s.camEnabled,
      sessionId: s.sessionId,
    }))
  );

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Mic toggle */}
      <ControlButton
        active={micEnabled}
        inactiveClass="bg-danger/90 hover:bg-danger border-danger/50"
        activeClass="glass border-white/10 hover:bg-white/10"
        onClick={onToggleMic}
        title={micEnabled ? "Mute microphone" : "Unmute microphone"}
        label={micEnabled ? "Mute" : "Unmuted"}
      >
        {micEnabled ? <MicIcon /> : <MicOffIcon />}
      </ControlButton>

      {/* Camera toggle */}
      <ControlButton
        active={camEnabled}
        inactiveClass="bg-danger/90 hover:bg-danger border-danger/50"
        activeClass="glass border-white/10 hover:bg-white/10"
        onClick={onToggleCam}
        title={camEnabled ? "Turn off camera" : "Turn on camera"}
        label={camEnabled ? "Camera" : "No cam"}
      >
        {camEnabled ? <CamIcon /> : <CamOffIcon />}
      </ControlButton>

      {/* Screen share */}
      <ControlButton
        active={true}
        activeClass="glass border-white/10 hover:bg-white/10"
        inactiveClass="glass border-white/10"
        onClick={onShareScreen}
        title="Share screen"
        label="Share"
      >
        <ShareIcon />
      </ControlButton>

      {/* Session ID copy */}
      {sessionId && (
        <button
          onClick={() => navigator.clipboard.writeText(sessionId).catch(() => {})}
          title="Copy session ID to invite others"
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl glass border border-white/10 hover:bg-white/8 transition-all"
        >
          <InviteIcon />
          <span className="text-[10px] text-neutral-500">Invite</span>
        </button>
      )}

      {/* Spacer */}
      <div className="w-px h-8 bg-white/8 mx-1" />

      {/* End / Leave button */}
      <button
        onClick={onEnd}
        disabled={stopping}
        title={isGuest ? "Leave session" : "End session for everyone"}
        className={cn(
          "flex flex-col items-center gap-1 px-5 py-2 rounded-2xl border font-semibold transition-all",
          "bg-danger/90 hover:bg-danger border-danger/50 text-white text-xs",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        {stopping ? (
          <div className="w-5 h-5 border border-white/50 border-t-white rounded-full animate-spin" />
        ) : (
          <PhoneDownIcon />
        )}
        <span className="text-[10px]">{isGuest ? "Leave" : "End"}</span>
      </button>
    </div>
  );
}

// ── Shared button ─────────────────────────────────────────────────────────────

function ControlButton({
  children,
  active,
  activeClass,
  inactiveClass,
  onClick,
  title,
  label,
}: {
  children: React.ReactNode;
  active: boolean;
  activeClass: string;
  inactiveClass: string;
  onClick: () => void;
  title: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex flex-col items-center gap-1 w-14 py-2 rounded-2xl border transition-all",
        active ? activeClass : inactiveClass
      )}
    >
      {/* Icon color: grey while on/active, white while off/inactive — the
          inactive background is already `bg-danger`, so a red icon on a red
          background is what was making it disappear. */}
      <span className={active ? "text-neutral-400" : "text-white"}>
        {children}
      </span>
      <span className="text-[10px] text-neutral-400">{label}</span>
    </button>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M2 2l20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V5a3 3 0 00-5.94-.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 16.95A7 7 0 015 10M12 19v3M9 22h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CamIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M17 11l5-3v8l-5-3V11z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function CamOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M2 2l20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 7H4a2 2 0 00-2 2v6a2 2 0 002 2h11M17 14.5l5 3V7l-4 2.5M11 7h6a2 2 0 012 2v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="white" strokeWidth="1.5" />
      <path d="M8 21h8M12 17v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 10l3-3 3 3M12 7v6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InviteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3M20 21c0-2.21-1.79-4-4-4h-4M8 11c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zM12 21v-2c0-2.21-1.79-4-4-4H4c-2.21 0-4 1.79-4 4v2" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 8v6M22 11h-6" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PhoneDownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M10.68 13.31a16 16 0 003.01 3.01l1.46-1.46a1.29 1.29 0 011.32-.31c1.34.45 2.78.69 4.23.69a1.3 1.3 0 011.3 1.3v3.75A1.3 1.3 0 0120.7 21 17.7 17.7 0 013 3.3a1.3 1.3 0 011.3-1.3h3.75A1.3 1.3 0 019.35 3.3c0 1.46.24 2.9.69 4.23.12.37.03.78-.32 1.32L8.26 10.3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2L2 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}