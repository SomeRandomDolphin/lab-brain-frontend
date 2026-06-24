"use client";
import { useSessionStore } from "@/store/session";

export function Waveform() {
  const isListening = useSessionStore((s) => s.isListening);
  const isLive = useSessionStore((s) => s.isLive);

  if (!isLive) return null;

  return (
    <div className="flex items-center gap-1" title={isListening ? "Processing speech" : "Listening"}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className={`wave-bar w-0.5 rounded-full ${isListening ? "bg-active" : "bg-neutral-700"}`}
          style={{
            height: `${14 + Math.sin(i * 0.8) * 8}px`,
            animationPlayState: isListening ? "running" : "paused",
            animationDuration: `${0.6 + i * 0.08}s`,
          }}
        />
      ))}
      <span className="text-xs text-neutral-600 ml-1.5">
        {isListening ? "Processing" : "Live"}
      </span>
    </div>
  );
}
