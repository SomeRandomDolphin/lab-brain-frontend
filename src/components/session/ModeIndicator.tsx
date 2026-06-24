"use client";
import { useSessionStore } from "@/store/session";
import { MODE_LABELS, MODE_COLORS, cn } from "@/lib/utils";

export function ModeIndicator() {
  const mode = useSessionStore((s) => s.mode);
  const isListening = useSessionStore((s) => s.isListening);

  return (
    <div className="flex items-center gap-2">
      {isListening && (
        <span className="flex items-center gap-1.5 text-xs text-active">
          <span className="w-1.5 h-1.5 rounded-full bg-active animate-pulse" />
          Listening
        </span>
      )}
      <span
        className={cn(
          "text-xs font-medium px-2.5 py-1 rounded-full border",
          MODE_COLORS[mode] ?? MODE_COLORS.idle
        )}
      >
        {MODE_LABELS[mode] ?? mode}
      </span>
    </div>
  );
}
