"use client";
import { useState } from "react";
import { useSessionStore } from "@/store/session";

export function InviteToast() {
  const { sessionId, isGuest } = useSessionStore();
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only hosts see this; guests already know the session ID
  if (!sessionId || isGuest || dismissed) return null;

  function copy() {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl glass-strong border border-white/10 shadow-panel">
        <div className="text-xs text-neutral-400 whitespace-nowrap">
          Session ID:
        </div>
        <code className="text-xs font-mono text-white bg-ink-900 px-2 py-0.5 rounded-lg border border-white/10 select-all">
          {sessionId}
        </code>
        <button
          onClick={copy}
          className="text-xs text-signal-light hover:text-white transition-colors whitespace-nowrap"
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-neutral-600 hover:text-neutral-400 transition-colors ml-1"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
