"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/store/session";
import { cn } from "@/lib/utils";

export function SummonButton({ sessionId }: { sessionId: string }) {
  const summoned = useSessionStore((s) => s.summoned);
  const setSummoned = useSessionStore((s) => s.setSummoned);
  const [loading, setLoading] = useState(false);

  // Poll summon state every 3s
  useEffect(() => {
    const iv = setInterval(async () => {
      const r = await api.getSummon(sessionId).catch(() => null);
      if (r) setSummoned(r.summoned);
    }, 3000);
    return () => clearInterval(iv);
  }, [sessionId, setSummoned]);

  const toggle = useCallback(async () => {
    setLoading(true);
    try {
      if (summoned) {
        await api.deleteSummon(sessionId);
        setSummoned(false);
      } else {
        await api.postSummon(sessionId);
        setSummoned(true);
      }
    } finally {
      setLoading(false);
    }
  }, [summoned, sessionId, setSummoned]);

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={summoned ? "Dismiss agent" : "Summon agent"}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
        summoned
          ? "bg-signal/15 border-signal/30 text-signal-light shadow-signal"
          : "glass border-white/10 text-neutral-500 hover:text-white hover:border-white/20"
      )}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" fill="currentColor" />
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
      {summoned ? "Agent active" : "Summon"}
    </button>
  );
}
