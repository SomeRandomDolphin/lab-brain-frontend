"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/store/session";
import { cn } from "@/lib/utils";

export function SummonButton({ sessionId }: { sessionId: string }) {
  const summoned = useSessionStore((s) => s.summoned);
  const setSummoned = useSessionStore((s) => s.setSummoned);
  const mode = useSessionStore((s) => s.mode);
  const [loading, setLoading] = useState(false);
  // Local-only optimistic flag for the instant between clicking "Resume
  // listening" and the real "mode_change" SSE event arriving (a round trip,
  // so a few hundred ms). Deliberately NOT calling setMode(...) here: that
  // store field is typed as ConvMode (an enum/union defined in @/types),
  // and fabricating a value for it from this component risks getting the
  // exact member wrong. useSSE.ts's setMode(msg.mode) is already correctly
  // typed against real server events, so let that be the only writer.
  const [resuming, setResuming] = useState(false);

  // Poll summon state every 3s
  useEffect(() => {
    const iv = setInterval(async () => {
      const r = await api.getSummon(sessionId).catch(() => null);
      if (r) setSummoned(r.summoned);
    }, 3000);
    return () => clearInterval(iv);
  }, [sessionId, setSummoned]);

  // Clear the optimistic flag once the real mode_change event confirms we
  // actually left QA.
  useEffect(() => {
    if (mode !== "qa") setResuming(false);
  }, [mode]);

  // `summoned` gets cleared server-side the instant a question enters QA
  // (see capture.clear_summon, called from _handle_segment before the
  // reply task even starts) — well before the reply is generated. So the
  // button already looks "off" while `mode` still says "qa" for however
  // long the LLM call takes. If that reply is ever slow, dropped, or the
  // pipeline never gets a chance to auto-revert, there was previously no
  // control on screen that reflected or fixed this — the mode indicator
  // elsewhere just kept saying "Q&A" with nothing to click. Track that gap
  // explicitly so the same button can resolve it.
  const stuckInQa = mode === "qa" && !summoned && !resuming;

  const toggle = useCallback(async () => {
    setLoading(true);
    try {
      if (summoned || stuckInQa) {
        // api.deleteSummon now resolves to capture.dismiss_agent() server-
        // side, which forces the dialogue state out of QA immediately
        // rather than clear_summon()'s narrower "just clear the flag".
        await api.deleteSummon(sessionId);
        setSummoned(false);
        setResuming(true); // optimistic UI only — see comment above
      } else {
        await api.postSummon(sessionId);
        setSummoned(true);
      }
    } finally {
      setLoading(false);
    }
  }, [summoned, stuckInQa, sessionId, setSummoned]);

  const active = summoned || stuckInQa;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={stuckInQa ? "Resume listening" : summoned ? "Dismiss agent" : "Summon agent"}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
        active
          ? "bg-signal/15 border-signal/30 text-signal-light shadow-signal"
          : "glass border-white/10 text-neutral-500 hover:text-white hover:border-white/20"
      )}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" fill="currentColor" />
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
      {stuckInQa ? "Resume listening" : summoned ? "Agent active" : "Summon"}
    </button>
  );
}