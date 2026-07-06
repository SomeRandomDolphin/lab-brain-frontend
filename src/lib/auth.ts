/**
 * authService — all calls go to YOUR backend /auth/* endpoints.
 * No third-party SDK involved; the backend owns all auth logic.
 */
import type { User } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

const TOKEN_KEY = "labbrain_token";

// ── Helpers ───────────────────────────────────────────────────────────────────

function saveToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const authService = {
  /**
   * POST /auth/register
   * Body: { name, email, password }
   * Returns: { user: User, token: string }
   */
  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<{ user: User; token: string }> {
    const data = await request<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    saveToken(data.token);
    return data;
  },

  /**
   * POST /auth/login
   * Body: { email, password }
   * Returns: { user: User, token: string }
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ user: User; token: string }> {
    const data = await request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    saveToken(data.token);
    return data;
  },

  /**
   * POST /auth/logout
   * Header: Authorization: Bearer <token>
   * Invalidates the token server-side, then clears it from localStorage.
   */
  async logout(): Promise<void> {
    await request("/auth/logout", { method: "POST" }).catch(() => {});
    clearToken();
  },

  /**
   * GET /auth/me
   * Header: Authorization: Bearer <token>
   * Returns: { user: User }
   * Used on every page load to rehydrate the Zustand store.
   */
  async me(): Promise<{ user: User; token: string } | null> {
    const token = getStoredToken();
    if (!token) return null;
    try {
      const data = await request<{ user: User }>("/auth/me");
      return { user: data.user, token };
    } catch {
      // Token is expired or invalid — clean up
      clearToken();
      return null;
    }
  },

  /**
   * POST /auth/forgot-password
   * Body: { email }
   * Triggers a password-reset email on the backend.
   */
  async forgotPassword(email: string): Promise<void> {
    await request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  /**
   * POST /auth/reset-password
   * Body: { token: string, password: string }
   * `token` comes from the reset link the backend emails.
   */
  async resetPassword(resetToken: string, password: string): Promise<void> {
    await request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: resetToken, password }),
    });
  },
};
