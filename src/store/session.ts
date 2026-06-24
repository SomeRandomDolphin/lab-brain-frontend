"use client";
import { create } from "zustand";
import type { TranscriptEvent, AgentReplyEvent, PerceptionEvent, ConvMode } from "@/types";

export interface TranscriptEntry extends TranscriptEvent {
  id: string;
}

export interface AgentEntry extends AgentReplyEvent {
  id: string;
  receivedAt: number;
}

interface SessionStore {
  // LiveKit
  sessionId: string | null;
  lkToken: string | null;
  lkUrl: string | null;
  isLive: boolean;

  // State
  mode: ConvMode;
  summoned: boolean;
  isListening: boolean;

  // Transcript
  transcripts: TranscriptEntry[];
  agentReplies: AgentEntry[];
  lastAgentText: string | null;

  // Perception
  presentSpeakers: string[];
  engagementCues: Record<string, string>;
  sceneSummary: string;
  environmentState: Record<string, unknown>;

  // Summary
  summary: string | null;
  summaryLoading: boolean;

  // Actions
  setSession: (sessionId: string, token: string, url: string) => void;
  clearSession: () => void;
  setLive: (v: boolean) => void;
  setMode: (mode: ConvMode) => void;
  setSummoned: (v: boolean) => void;
  setListening: (v: boolean) => void;
  addTranscript: (t: TranscriptEvent) => void;
  addAgentReply: (r: AgentReplyEvent) => void;
  setPerception: (p: PerceptionEvent) => void;
  setSummary: (s: string | null, loading?: boolean) => void;
}

export const useSessionStore = create<SessionStore>()((set) => ({
  sessionId: null,
  lkToken: null,
  lkUrl: null,
  isLive: false,
  mode: "idle",
  summoned: false,
  isListening: false,
  transcripts: [],
  agentReplies: [],
  lastAgentText: null,
  presentSpeakers: [],
  engagementCues: {},
  sceneSummary: "",
  environmentState: {},
  summary: null,
  summaryLoading: false,

  setSession: (sessionId, lkToken, lkUrl) => set({ sessionId, lkToken, lkUrl }),
  clearSession: () =>
    set({
      sessionId: null, lkToken: null, lkUrl: null,
      isLive: false, mode: "idle", summoned: false, isListening: false,
      transcripts: [], agentReplies: [], lastAgentText: null,
      presentSpeakers: [], engagementCues: {}, sceneSummary: "", environmentState: {},
      summary: null, summaryLoading: false,
    }),
  setLive: (isLive) => set({ isLive }),
  setMode: (mode) => set({ mode }),
  setSummoned: (summoned) => set({ summoned }),
  setListening: (isListening) => set({ isListening }),
  addTranscript: (t) =>
    set((s) => ({
      transcripts: [...s.transcripts, { ...t, id: `${Date.now()}-${Math.random()}` }],
    })),
  addAgentReply: (r) =>
    set((s) => ({
      agentReplies: [
        ...s.agentReplies,
        { ...r, id: `${Date.now()}-${Math.random()}`, receivedAt: Date.now() },
      ],
      lastAgentText: r.text,
    })),
  setPerception: (p) =>
    set({
      presentSpeakers: p.present_speakers,
      engagementCues: p.engagement_cues,
      sceneSummary: p.scene_summary,
      environmentState: p.environment_state,
    }),
  setSummary: (summary, loading = false) =>
    set({ summary, summaryLoading: loading }),
}));
