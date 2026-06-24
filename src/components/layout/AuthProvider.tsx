"use client";
/**
 * AuthProvider — mounts once at the root layout.
 *
 * On first render it calls GET /auth/me with the stored token to confirm
 * the session is still valid and refresh the user object. If the token is
 * gone or the backend rejects it, the store is cleared.
 */
import { useEffect } from "react";
import { authService } from "@/lib/auth";
import { useAuthStore } from "@/store/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, setLoading, token } = useAuthStore();

  useEffect(() => {
    // If there's no stored token we're definitely logged out — skip the request
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    authService.me().then((session) => {
      if (session) {
        login(session.user, session.token);
      } else {
        logout();
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
