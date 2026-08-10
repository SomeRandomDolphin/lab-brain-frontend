"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthStore {
  user: User | null;
  token: string | null;
  /** true while GET /auth/me is in-flight on first load */
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (v: boolean) => void;
  isAuthenticated: () => boolean;
  /** Shallow-merge a patch into the current user (e.g. after POST /privacy/tos-consent).
   *  No-op if there's no logged-in user. */
  updateUser: (patch: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: true,
      login: (user, token) => set({ user, token, loading: false }),
      logout: () => set({ user: null, token: null, loading: false }),
      setLoading: (loading) => set({ loading }),
      isAuthenticated: () => !!get().token,
      updateUser: (patch) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...patch } });
      },
    }),
    {
      name: "labbrain-auth",
      // Only persist user + token; never persist the loading flag
      partialize: (s) => ({ user: s.user, token: s.token }),
    },
  ),
);