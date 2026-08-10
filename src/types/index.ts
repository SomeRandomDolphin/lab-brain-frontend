// ── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  // null/undefined = the account-level privacy-screen decision hasn't been
  // made yet; the dashboard shows the first-login ToS modal until it's set.
  tosAccepted?: boolean | null;
  tosAcceptedAt?: string | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

// ── Session ─────────────────────────────────────────────────────────────────
export interface LiveKitSession {
  session_id: string;
  token: string;
  lk_url: string;
}

export type ConvMode = "ambient" | "qa" | "briefing" | "idle";

// ── SSE Events ──────────────────────────────────────────────────────────────
export interface SSEBase {
  type: string;
  session_id?: string;
}

export interface SessionEvent extends SSEBase {
  type: "session";
  session_id: string;
}

export interface TranscriptEvent extends SSEBase {
  type: "transcript";
  segment: number;
  speaker: string;
  text: string;
  language: string;
  latency_ms: number;
  e2e_ms: number;
  mode: ConvMode;
  timestamp: string;
  engagement: string;
  tags: Record<string, string[]>;
  environment: Record<string, unknown>;
  word_timestamps: WordTimestamp[];
  summoned: boolean;
}

export interface AgentReplyEvent extends SSEBase {
  type: "agent_reply";
  text: string;
  mode: ConvMode;
  grounded?: boolean;
}

export interface SpeakEvent extends SSEBase {
  type: "speak";
  text: string;
}

export interface PerceptionEvent extends SSEBase {
  type: "perception";
  present_speakers: string[];
  engagement_cues: Record<string, string>;
  scene_summary: string;
  environment_state: Record<string, unknown>;
  latency_ms: number;
}

export interface ModeChangeEvent extends SSEBase {
  type: "mode_change";
  mode: ConvMode;
}

export interface ListeningEvent extends SSEBase {
  type: "listening";
  mode: ConvMode;
  summoned: boolean;
}

export interface ErrorEvent extends SSEBase {
  type: "error";
  message: string;
}

export type SSEEvent =
  | SessionEvent
  | TranscriptEvent
  | AgentReplyEvent
  | SpeakEvent
  | PerceptionEvent
  | ModeChangeEvent
  | ListeningEvent
  | ErrorEvent;

// ── Supporting ─────────────────────────────────────────────────────────────
export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  score: number;
  speaker?: string;
}

export interface Metrics {
  [session_id: string]: {
    asr_latency_ms?: number;
    e2e_ms?: number;
    segments?: number;
    mode_switches?: number;
    vision_ok?: number;
  };
}

export interface ClientConfig {
  camera_fps: number;
  camera_quality: number;
  tts_auto_hide_ms: number;
  lk_url: string;
}

export interface SummonStatus {
  session_id: string;
  summoned: boolean;
}

export interface Summary {
  session_id: string;
  summary: string;
}

export interface LkcSession {
  session_id: string;
  record_count?: number;
}

export interface Tag {
  action_items: string[];
  decisions: string[];
  deadlines: string[];
  entities: string[];
}