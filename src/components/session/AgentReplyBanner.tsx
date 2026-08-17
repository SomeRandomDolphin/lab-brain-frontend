"use client";
import { useEffect, useState } from "react";
import { useSessionStore } from "@/store/session";
import { cn } from "@/lib/utils";

// Previously a flat 8000ms regardless of reply length. That's fine for a
// short one-liner but for anything longer than ~2 sentences (or a
// literature reply with citations rendered under it) the banner was
// disappearing well before the agent's TTS voice actually finished
// speaking it — reported as "the popup doesn't hold while the agent is
// still talking". There's no real "TTS finished" event coming through
// the store yet (AgentReplyEvent carries no duration/audio field), so
// this scales the hold time to text length as a stand-in for actual
// speaking time, clamped to a sane floor/ceiling. If an audio-end event
// or a duration field ever gets added to AgentReplyEvent, switch to that
// instead — it'll be exact where this is only an estimate.
const READING_MS_PER_CHAR = 45; // ≈22 chars/sec, close to typical TTS pace
const MIN_VISIBLE_MS = 8000;
const MAX_VISIBLE_MS = 30000;

export function AgentReplyBanner() {
  const agentReplies = useSessionStore((s) => s.agentReplies);
  const [visible, setVisible] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [currentMode, setCurrentMode] = useState("");
  const [currentSource, setCurrentSource] = useState<string | undefined>(undefined);
  const [currentFaithfulness, setCurrentFaithfulness] = useState<number | undefined>(undefined);
  const [currentDocs, setCurrentDocs] = useState<{ name: string; chunks: number }[]>([]);

  useEffect(() => {
    if (agentReplies.length === 0) return;
    const latest = agentReplies[agentReplies.length - 1];
    setCurrentText(latest.text);
    setCurrentMode(latest.mode);
    setCurrentSource(latest.source);
    setCurrentFaithfulness(latest.faithfulness);
    setCurrentDocs(latest.documents_used ?? []);
    setVisible(true);

    const holdMs = Math.min(
      MAX_VISIBLE_MS,
      Math.max(MIN_VISIBLE_MS, latest.text.length * READING_MS_PER_CHAR)
    );
    const timer = setTimeout(() => setVisible(false), holdMs);
    return () => clearTimeout(timer);
  }, [agentReplies]);

  if (!visible || !currentText) return null;

  // documents_used only ever comes from the kg-agent path — transcript-
  // grounded replies (the existing default) have no equivalent source list.
  const isLiterature = currentSource === "kg_agent";

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
            {isLiterature && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-signal/20 text-signal-light uppercase tracking-wider">
                Literature
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-200 leading-relaxed">{currentText}</p>

          {isLiterature && currentDocs.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {currentDocs.map((doc) => (
                <span
                  key={doc.name}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400"
                  title={`${doc.chunks} chunk${doc.chunks === 1 ? "" : "s"} used`}
                >
                  {doc.name}
                </span>
              ))}
              {typeof currentFaithfulness === "number" && (
                <span className="text-[10px] text-neutral-600">
                  {Math.round(currentFaithfulness * 100)}% confidence
                </span>
              )}
            </div>
          )}
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