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
    }),
    {
      name: "labbrain-auth",
      // Only persist user + token; never persist the loading flag
      partialize: (s) => ({ user: s.user, token: s.token }),
    },
  ),
);
