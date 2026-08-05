import { useAuthStore } from "@/store/auth";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as T;
}

// ── LiveKit room ────────────────────────────────────────────────────────────
export const api = {
  createRoom: (display_name?: string) =>
    request<{ session_id: string; token: string; lk_url: string }>(
      "/livekit/room",
      {
        method: "POST",
        body: JSON.stringify(display_name ? { display_name } : {}),
      }
    ),

  /**
   * Join an existing room. Identity is no longer client-supplied — the
   * backend derives the LiveKit display identity from the authenticated
   * user (name/email) via the Authorization header. See app/api/v1/
   * endpoints/livekit.py::get_token.
   */
  getToken: (session_id: string) =>
    request<{ session_id: string; token: string; lk_url: string }>(
      `/livekit/token?session_id=${session_id}`
    ),

  getRoomStatus: (session_id: string) =>
    request<{ session_id: string; participant_count?: number }>(`/livekit/room/${session_id}`),

  deleteRoom: (session_id: string) =>
    request<{ session_id: string; deleted: boolean }>(`/livekit/room/${session_id}`, {
      method: "DELETE",
    }),

  // ── Agent summon ──────────────────────────────────────────────────────────
  getSummon: (session_id: string) =>
    request<{ session_id: string; summoned: boolean }>(`/agent/summon/${session_id}`),

  postSummon: (session_id: string) =>
    request<{ session_id: string; summoned: boolean }>(`/agent/summon/${session_id}`, {
      method: "POST",
    }),

  deleteSummon: (session_id: string) =>
    request<{ session_id: string; summoned: boolean }>(`/agent/summon/${session_id}`, {
      method: "DELETE",
    }),

  // ── Summary ───────────────────────────────────────────────────────────────
  postSummary: (session_id: string) =>
    request<{ session_id: string; summary: string; report_url?: string | null; error?: string }>(
      `/summary/${session_id}`,
      { method: "POST" }
    ),

  // ── Metrics ───────────────────────────────────────────────────────────────
  getMetrics: () => request<Record<string, unknown>>("/metrics"),

  // ── LKC sessions ─────────────────────────────────────────────────────────
  listSessions: () =>
    request<{
      sessions: {
        session_id:    string;
        started_iso:   string;
        ended_iso:     string;
        total_records: number;
        transcripts:   number;
        vision_frames: number;
        agent_replies: number;
        summaries:     number;
      }[];
    }>("/lkc/sessions"),

  getSession: (session_id: string) =>
    request<{ session_id: string; count: number; records: unknown[] }>(
      `/lkc/sessions/${session_id}`
    ),

  // ── Tags ──────────────────────────────────────────────────────────────────
  getTags: (session_id: string) =>
    request<{ tags: Record<string, string[]> }>(`/capture/tags/${session_id}`),

  // ── Config ────────────────────────────────────────────────────────────────
  getClientConfig: () =>
    request<{ camera_fps: number; camera_quality: number; tts_auto_hide_ms: number; lk_url: string }>(
      "/config/client"
    ),

  // ── Privacy ───────────────────────────────────────────────────────────────
  getPrivacyStatus: () => request<Record<string, unknown>>("/privacy/status"),
};

// ── SSE helper ───────────────────────────────────────────────────────────────
// EventSource can't send an Authorization header, so the access token is
// passed as a query param instead — see app/api/deps.py::get_current_user's
// query-param fallback (SSE-only; every other route still requires the
// header and never receives ?token=).
export function openSSE(session_id: string): EventSource {
  const token = useAuthStore.getState().token;
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return new EventSource(`${BASE}/events/${session_id}${qs}`);
}