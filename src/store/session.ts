"use client";
import { create } from "zustand";
import type { Room, RemoteParticipant, LocalParticipant } from "livekit-client";
import type { TranscriptEvent, AgentReplyEvent, PerceptionEvent, ConvMode } from "@/types";

export interface TranscriptEntry extends TranscriptEvent {
  id: string;
}

export interface AgentEntry extends AgentReplyEvent {
  id: string;
  receivedAt: number;
}

export type AnyParticipant = RemoteParticipant | LocalParticipant;

interface SessionStore {
  // LiveKit
  sessionId: string | null;
  lkToken: string | null;
  lkUrl: string | null;
  isLive: boolean;

  // Room & participants (not serialisable — kept as live refs)
  room: Room | null;
  participants: AnyParticipant[];
  micEnabled: boolean;
  camEnabled: boolean;

  // Whether we are joining someone else's session
  isGuest: boolean;

  // State
  mode: ConvMode;
  summoned: boolean;
  isListening: boolean;

  // Transcript
  transcripts: TranscriptEntry[];
  agentReplies: AgentEntry[];
  lastAgentText: string | null;
  // True exactly while the browser's SpeechSynthesis is actively speaking
  // an agent reply — driven by the "speak" SSE handler's utterance.onstart/
  // onend in useSSE.ts. Lets AgentReplyBanner hold itself open for as long
  // as the agent is actually talking instead of guessing a duration.
  agentSpeaking: boolean;

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
  setRoom: (room: Room | null) => void;
  setParticipants: (p: AnyParticipant[]) => void;
  setMicEnabled: (v: boolean) => void;
  setCamEnabled: (v: boolean) => void;
  setGuest: (v: boolean) => void;
  setMode: (mode: ConvMode) => void;
  setSummoned: (v: boolean) => void;
  setListening: (v: boolean) => void;
  addTranscript: (t: TranscriptEvent) => void;
  addAgentReply: (r: AgentReplyEvent) => void;
  setAgentSpeaking: (v: boolean) => void;
  setPerception: (p: PerceptionEvent) => void;
  setSummary: (s: string | null, loading?: boolean) => void;
}

export const useSessionStore = create<SessionStore>()((set) => ({
  sessionId: null,
  lkToken: null,
  lkUrl: null,
  isLive: false,
  room: null,
  participants: [],
  micEnabled: true,
  camEnabled: true,
  isGuest: false,
  mode: "idle",
  summoned: false,
  isListening: false,
  transcripts: [],
  agentReplies: [],
  lastAgentText: null,
  agentSpeaking: false,
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
      isLive: false, room: null, participants: [],
      micEnabled: true, camEnabled: true, isGuest: false,
      mode: "idle", summoned: false, isListening: false,
      transcripts: [], agentReplies: [], lastAgentText: null, agentSpeaking: false,
      presentSpeakers: [], engagementCues: {}, sceneSummary: "", environmentState: {},
      // summary/summaryLoading intentionally NOT reset here. useSession's
      // stop() calls clearSession() in a `finally` right after fetching the
      // summary — resetting it here wiped out the just-fetched summary
      // before <SummaryModal> could ever show it. start()/join() already
      // call setSummary(null, false) explicitly at the top of each flow to
      // clear any stale summary before a new session begins, so this action
      // doesn't need to duplicate that.
    }),
  setLive: (isLive) => set({ isLive }),
  setRoom: (room) => set({ room }),
  setParticipants: (participants) => set({ participants }),
  setMicEnabled: (micEnabled) => set({ micEnabled }),
  setCamEnabled: (camEnabled) => set({ camEnabled }),
  setGuest: (isGuest) => set({ isGuest }),
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
  setAgentSpeaking: (agentSpeaking) => set({ agentSpeaking }),
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