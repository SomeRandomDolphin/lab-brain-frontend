"use client";
import { useState } from "react";
import { useSessionStore } from "@/store/session";
import { useShallow } from "zustand/react/shallow";

export function InviteToast() {
  // Previously a bare useSessionStore() call — re-rendered on every store
  // change (e.g. the "listening" flood) even though this only cares about
  // 2 fields that change rarely (once per session).
  const { sessionId, isGuest } = useSessionStore(
    useShallow((s) => ({ sessionId: s.sessionId, isGuest: s.isGuest }))
  );
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only hosts see this; guests already know the session ID
  if (!sessionId || isGuest || dismissed) return null;

  async function copy() {
    if (!sessionId) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(sessionId);
      } else {
        // navigator.clipboard.writeText() only exists in a secure context
        // (https:// or localhost). This app is reached remotely over
        // Tailscale via a plain http://<tailscale-ip> URL, so
        // navigator.clipboard is undefined there (or the call rejects) —
        // the old code swallowed that in a bare .catch(() => {}) and then
        // set copied=true unconditionally right after, so the button
        // showed "✓ Copied!" even though nothing was actually copied.
        // Fall back to the legacy selection + execCommand path, which
        // still works without a secure context.
        const ta = document.createElement("textarea");
        ta.value = sessionId;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand('copy') failed");
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Leave copied=false — the session ID is still visible and
      // select-all (`select-all` class below) so the user can copy it
      // manually if both paths above are unavailable.
    }
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