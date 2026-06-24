import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const MODE_LABELS: Record<string, string> = {
  ambient: "Ambient",
  qa: "Q&A",
  briefing: "Briefing",
  idle: "Idle",
};

export const MODE_COLORS: Record<string, string> = {
  ambient: "text-active bg-active/10 border-active/30",
  qa: "text-signal-light bg-signal/10 border-signal/30",
  briefing: "text-warn bg-warn/10 border-warn/30",
  idle: "text-neutral-400 bg-white/5 border-white/10",
};

export const SPEAKER_PALETTE = [
  "#2D6BE4", "#22D3A5", "#F59E0B", "#EC4899", "#8B5CF6", "#EF4444",
];

export function speakerColor(speaker: string): string {
  const idx =
    speaker.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    SPEAKER_PALETTE.length;
  return SPEAKER_PALETTE[idx];
}
