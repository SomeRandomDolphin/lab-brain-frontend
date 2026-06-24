"use client";
import { useSessionStore } from "@/store/session";
import { speakerColor } from "@/lib/utils";

export function SpeakerChips() {
  const speakers = useSessionStore((s) => s.presentSpeakers);
  const cues = useSessionStore((s) => s.engagementCues);

  if (speakers.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {speakers.map((sp) => (
        <div
          key={sp}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
          style={{
            borderColor: `${speakerColor(sp)}40`,
            background: `${speakerColor(sp)}12`,
            color: speakerColor(sp),
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: speakerColor(sp) }}
          />
          {sp}
          {cues[sp] && cues[sp] !== "unknown" && (
            <span className="text-[10px] opacity-60 ml-0.5">{engagementIcon(cues[sp])}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function engagementIcon(cue: string): string {
  if (cue.includes("focus") || cue.includes("active")) return "●";
  if (cue.includes("away") || cue.includes("distract")) return "○";
  return "";
}
