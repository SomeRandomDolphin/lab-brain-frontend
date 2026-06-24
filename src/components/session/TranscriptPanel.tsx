"use client";
import { useEffect, useRef } from "react";
import { useSessionStore } from "@/store/session";
import { speakerColor, cn } from "@/lib/utils";
import { format } from "date-fns";
import type { TranscriptEntry } from "@/store/session";

export function TranscriptPanel() {
  const transcripts = useSessionStore((s) => s.transcripts);
  const isListening = useSessionStore((s) => s.isListening);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new transcripts
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts.length]);

  if (transcripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center">
        <div className="mb-5">
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="wave-bar w-1 rounded-full bg-signal/40"
                style={{ height: `${20 + Math.sin(i) * 12}px` }}
              />
            ))}
          </div>
        </div>
        <p className="text-sm text-neutral-500">Waiting for speech…</p>
        <p className="text-xs text-neutral-700 mt-1.5">Start talking to see transcripts here</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-1">
      {transcripts.map((t, i) => (
        <TranscriptRow
          key={t.id}
          entry={t}
          prevSpeaker={i > 0 ? transcripts[i - 1].speaker : null}
        />
      ))}
      {isListening && (
        <div className="flex items-center gap-2 px-4 py-2 animate-fade-in">
          <div className="flex gap-0.5">
            {[0, 1, 2].map((d) => (
              <div
                key={d}
                className="w-1 h-1 rounded-full bg-neutral-600 animate-blink"
                style={{ animationDelay: `${d * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-xs text-neutral-600">Processing…</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function TranscriptRow({
  entry,
  prevSpeaker,
}: {
  entry: TranscriptEntry;
  prevSpeaker: string | null;
}) {
  const color = speakerColor(entry.speaker);
  const showSpeakerLabel = entry.speaker !== prevSpeaker;
  const time = entry.timestamp
    ? format(new Date(entry.timestamp), "HH:mm:ss")
    : "";

  return (
    <div
      className={cn(
        "group px-4 py-2.5 rounded-xl hover:bg-white/3 transition-colors animate-slide-up",
        showSpeakerLabel && "mt-3"
      )}
    >
      {showSpeakerLabel && (
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: color }}
          >
            {entry.speaker[0]?.toUpperCase()}
          </div>
          <span className="text-xs font-semibold" style={{ color }}>
            {entry.speaker}
          </span>
          <span className="text-[10px] text-neutral-700 font-mono">{time}</span>
          {entry.summoned && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-signal/15 text-signal-light border border-signal/20">
              summoned
            </span>
          )}
        </div>
      )}

      <p className="text-sm text-neutral-200 leading-relaxed pl-7">
        {entry.word_timestamps?.length > 0 ? (
          <WordColoured words={entry.word_timestamps} />
        ) : (
          entry.text
        )}
      </p>

      {/* Tags */}
      {Object.entries(entry.tags ?? {}).some(([, v]) => v.length > 0) && (
        <div className="pl-7 mt-1.5 flex flex-wrap gap-1">
          {Object.entries(entry.tags).flatMap(([k, vals]) =>
            (vals as string[]).map((v) => (
              <span
                key={`${k}-${v}`}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-neutral-500 border border-white/8"
              >
                {k === "action_items" ? "⚡" : k === "decisions" ? "✓" : "·"} {v}
              </span>
            ))
          )}
        </div>
      )}

      {/* Latency badge on hover */}
      <div className="pl-7 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-3">
        <span className="text-[10px] text-neutral-700">
          ASR {entry.latency_ms}ms
        </span>
        <span className="text-[10px] text-neutral-700">
          E2E {entry.e2e_ms}ms
        </span>
        <span className="text-[10px] text-neutral-700 uppercase">
          {entry.language}
        </span>
      </div>
    </div>
  );
}

function WordColoured({
  words,
}: {
  words: Array<{ word: string; speaker?: string }>;
}) {
  return (
    <>
      {words.map((w, i) => (
        <span
          key={i}
          style={w.speaker ? { color: speakerColor(w.speaker) } : undefined}
        >
          {w.word}{" "}
        </span>
      ))}
    </>
  );
}
