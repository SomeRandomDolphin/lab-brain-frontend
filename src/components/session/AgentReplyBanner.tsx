"use client";
import { useEffect, useState } from "react";
import { useSessionStore } from "@/store/session";
import { cn } from "@/lib/utils";

export function AgentReplyBanner() {
  const agentReplies = useSessionStore((s) => s.agentReplies);
  const [visible, setVisible] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [currentMode, setCurrentMode] = useState("");

  useEffect(() => {
    if (agentReplies.length === 0) return;
    const latest = agentReplies[agentReplies.length - 1];
    setCurrentText(latest.text);
    setCurrentMode(latest.mode);
    setVisible(true);

    const timer = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timer);
  }, [agentReplies]);

  if (!visible || !currentText) return null;

  return (
    <div
      className={cn(
        "mx-4 mt-3 px-4 py-3 rounded-2xl border animate-slide-up",
        "bg-signal/8 border-signal/20"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Agent avatar */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-signal flex items-center justify-center shadow-signal mt-0.5">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" fill="white" />
            <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="2 2" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-signal-light">Lab Brain</span>
            <span className="text-[10px] text-neutral-600 uppercase tracking-wider">{currentMode}</span>
          </div>
          <p className="text-sm text-neutral-200 leading-relaxed">{currentText}</p>
        </div>

        <button
          onClick={() => setVisible(false)}
          className="flex-shrink-0 text-neutral-600 hover:text-neutral-400 transition-colors mt-0.5"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
