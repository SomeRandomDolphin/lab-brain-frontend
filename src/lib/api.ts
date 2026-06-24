const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
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
  createRoom: () =>
    request<{ session_id: string; token: string; lk_url: string }>(
      "/livekit/room",
      { method: "POST" }
    ),

  getToken: (session_id: string, identity?: string) =>
    request<{ session_id: string; token: string; lk_url: string }>(
      `/livekit/token?session_id=${session_id}${identity ? `&identity=${identity}` : ""}`
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
    request<{ session_id: string; summary: string }>(`/summary/${session_id}`, {
      method: "POST",
    }),

  // ── Metrics ───────────────────────────────────────────────────────────────
  getMetrics: () => request<Record<string, unknown>>("/metrics"),

  // ── LKC sessions ─────────────────────────────────────────────────────────
  listSessions: () => request<{ sessions: string[] }>("/lkc/sessions"),

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
export function openSSE(session_id: string): EventSource {
  return new EventSource(`${BASE}/events/${session_id}`);
}
