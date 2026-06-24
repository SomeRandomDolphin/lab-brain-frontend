"use client";
import { useSessionStore } from "@/store/session";
import { VideoTile } from "./VideoTile";
import { cn } from "@/lib/utils";

/**
 * Responsive camera grid that adapts to participant count.
 *
 * 1  participant  → full-screen single tile
 * 2  participants → side-by-side halves
 * 3  participants → 2-top + 1-bottom centred
 * 4  participants → 2×2 grid
 * 5–6            → 2 rows, 3 per row
 * 7+             → 3-column grid, scrollable
 */
export function VideoGrid({ className }: { className?: string }) {
  const participants = useSessionStore((s) => s.participants);
  const count = participants.length;

  const gridClass = gridClasses(count);

  return (
    <div className={cn("relative w-full h-full bg-ink-950 overflow-hidden", className)}>
      {count === 0 ? (
        <EmptyGrid />
      ) : (
        <div
          className={cn(
            "w-full h-full p-2 gap-2 overflow-y-auto",
            gridClass
          )}
        >
          {participants.map((p) => (
            <VideoTile
              key={p.identity}
              participant={p}
              featured={count === 1}
              className={cn(
                count === 1 && "!rounded-none w-full h-full",
                count === 3 && participants.indexOf(p) === 2 && "col-span-2 justify-self-center w-1/2"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function gridClasses(count: number): string {
  if (count === 1) return "flex";
  if (count === 2) return "grid grid-cols-2";
  if (count === 3) return "grid grid-cols-2";
  if (count === 4) return "grid grid-cols-2 grid-rows-2";
  if (count <= 6) return "grid grid-cols-3";
  return "grid grid-cols-3";
}

function EmptyGrid() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <div className="w-16 h-16 rounded-2xl bg-ink-800 border border-white/8 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="6" width="15" height="12" rx="2" stroke="#475569" strokeWidth="1.5" />
          <path d="M17 10l5-3v10l-5-3V10z" stroke="#475569" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-sm text-neutral-600">Camera initialising…</p>
    </div>
  );
}
