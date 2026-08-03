"use client";
import { useSessionStore } from "@/store/session";
import { useShallow } from "zustand/react/shallow";
import { speakerColor } from "@/lib/utils";

export function EnvironmentPanel() {
  // Previously a bare useSessionStore() call — subscribed to the whole
  // store, so this panel re-rendered on every high-frequency "listening"
  // event too, not just when perception/agent data actually changed.
  const {
    environmentState, sceneSummary, presentSpeakers,
    engagementCues, agentReplies, mode,
  } = useSessionStore(
    useShallow((s) => ({
      environmentState: s.environmentState,
      sceneSummary: s.sceneSummary,
      presentSpeakers: s.presentSpeakers,
      engagementCues: s.engagementCues,
      agentReplies: s.agentReplies,
      mode: s.mode,
    }))
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-white/5">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Room state</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Scene summary */}
        {sceneSummary && (
          <Section title="Scene">
            <p className="text-xs text-neutral-400 leading-relaxed">{sceneSummary}</p>
          </Section>
        )}

        {/* Present speakers */}
        {presentSpeakers.length > 0 && (
          <Section title="In the room">
            <div className="space-y-1.5">
              {presentSpeakers.map((sp, i) => (
                <div key={`${sp}-${i}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: speakerColor(sp) }}
                    >
                      {sp[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs text-neutral-300">{sp}</span>
                  </div>
                  {engagementCues[sp] && (
                    <span className="text-[10px] text-neutral-600">{engagementCues[sp]}</span>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Environment details */}
        {Object.keys(environmentState ?? {}).length > 0 && (
          <Section title="Environment">
            <div className="space-y-1">
              {Object.entries(environmentState ?? {}).map(([k, v]) =>
                v ? (
                  <div key={k} className="flex items-start justify-between gap-2">
                    <span className="text-[10px] text-neutral-600 capitalize shrink-0">{k}</span>
                    <span className="text-[10px] text-neutral-400 text-right">
                      {Array.isArray(v) ? v.join(", ") : String(v)}
                    </span>
                  </div>
                ) : null
              )}
            </div>
          </Section>
        )}

        {/* Agent history */}
        {agentReplies.length > 0 && (
          <Section title={`Agent replies (${agentReplies.length})`}>
            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
              {agentReplies.slice().reverse().map((r) => (
                <div key={r.id} className="bg-signal/6 rounded-xl px-3 py-2 border border-signal/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] text-signal-light font-medium">Lab Brain</span>
                    <span className="text-[10px] text-neutral-700">{r.mode}</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">{r.text}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Empty state */}
        {!sceneSummary && presentSpeakers.length === 0 && agentReplies.length === 0 && (
          <div className="text-center py-10">
            <p className="text-xs text-neutral-700">Room perception will appear here once the camera is active.</p>
          </div>
        )}
      </div>

      {/* Mode footer */}
      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-neutral-600">Conversation mode</span>
          <span className="text-[10px] font-medium text-neutral-400 capitalize">{mode}</span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold text-neutral-700 uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}