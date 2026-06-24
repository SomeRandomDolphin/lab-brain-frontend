"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/store/session";

interface MetricSummary {
  asr_latency_mean_ms?: number;
  e2e_mean_ms?: number;
  segments?: number;
  mode_switches?: number;
}

export function MetricsBar() {
  const { sessionId, isLive } = useSessionStore();
  const [metrics, setMetrics] = useState<MetricSummary | null>(null);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      const data = await api.getMetrics().catch(() => null);
      if (!data || !sessionId) return;
      const sess = (data as Record<string, MetricSummary>)[sessionId];
      if (sess) setMetrics(sess);
    }, 5000);
    return () => clearInterval(interval);
  }, [isLive, sessionId]);

  if (!metrics) return null;

  return (
    <div className="hidden md:flex items-center gap-3 text-[11px] text-neutral-600 font-mono">
      {metrics.asr_latency_mean_ms != null && (
        <span title="Mean ASR latency">
          ASR <span className="text-neutral-400">{Math.round(metrics.asr_latency_mean_ms)}ms</span>
        </span>
      )}
      {metrics.e2e_mean_ms != null && (
        <span title="Mean end-to-end latency">
          E2E <span className="text-neutral-400">{Math.round(metrics.e2e_mean_ms)}ms</span>
        </span>
      )}
      {metrics.segments != null && (
        <span title="Total segments transcribed">
          <span className="text-neutral-400">{metrics.segments}</span> segs
        </span>
      )}
    </div>
  );
}
