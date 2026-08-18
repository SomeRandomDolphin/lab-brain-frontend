"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { authService } from "@/lib/auth";
import { initials } from "@/lib/utils";
import { PRIVACY_TERMS, PRIVACY_TERMS_VERSION } from "@/content/privacyTerms";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const [saving, setSaving] = useState<"anon" | "identified" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFullNotice, setShowFullNotice] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [resetState, setResetState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [signingOut, setSigningOut] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Keep the edit inputs in sync with the current user whenever we're not
  // actively editing — covers both first load and the authService.me()
  // sync below potentially bringing in a newer name/email.
  useEffect(() => {
    if (!editingProfile && user) {
      setNameInput(user.name);
      setEmailInput(user.email);
    }
  }, [user, editingProfile]);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
  }, [user, loading, router]);

  // The persisted store can go stale if the ToS choice was changed
  // elsewhere (another device/session). GET /privacy/status is a different
  // resource entirely — the per-session diarization consent registry, not
  // the account-level field — so the re-fetch on mount goes through
  // authService.me() (GET /auth/me) instead, which returns the same
  // UserOut shape the login/register flow already populates the store
  // with, tosAccepted/tosAcceptedAt included.
  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (loading || !user || hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    let cancelled = false;
    authService
      .me()
      .then((result) => {
        if (cancelled || !result) return;
        useAuthStore.getState().updateUser(result.user);
      })
      .catch(() => {
        // Fall back silently to whatever's already in the persisted store.
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });
    return () => {
      cancelled = true;
    };
    // Intentionally runs once per mount, not on every `user` change — this
    // effect's own success handler calls updateUser(), which replaces the
    // `user` object reference. Depending on `user` here previously caused
    // the effect to cancel and re-fire itself on every sync, so `syncing`
    // could get stuck true forever if a run was cancelled before its
    // `finally` landed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function updatePrivacyChoice(accepted: boolean) {
    setError(null);
    setSaving(accepted ? "identified" : "anon");
    try {
      const result = await api.setTosConsent(accepted); // POST /privacy/tos-consent
      useAuthStore.getState().updateUser({
        tosAccepted: accepted,
        tosAcceptedAt: result.tosAcceptedAt,
      });
    } catch {
      // Keep the UI on the previous known state rather than optimistically
      // flipping it — a failed write shouldn't make the page claim a
      // privacy setting took effect when it didn't.
      setError("Couldn't save that change. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function requestPasswordReset() {
    if (!user) return;
    setResetState("sending");
    try {
      await authService.forgotPassword(user.email); // POST /auth/forgot-password
      setResetState("sent");
    } catch {
      setResetState("error");
    }
  }

  function startEditingProfile() {
    if (!user) return;
    setNameInput(user.name);
    setEmailInput(user.email);
    setProfileError(null);
    setEditingProfile(true);
  }

  function cancelEditingProfile() {
    setProfileError(null);
    setEditingProfile(false);
  }

  async function saveProfile() {
    if (!user) return;
    const name = nameInput.trim();
    const email = emailInput.trim().toLowerCase();
    if (!name) {
      setProfileError("Name can't be empty.");
      return;
    }
    // Only send what actually changed — PATCH /auth/me only touches fields
    // present in the body, so there's no reason to re-send an unchanged
    // email and trigger its email_confirm round trip for nothing.
    const patch: { name?: string; email?: string } = {};
    if (name !== user.name) patch.name = name;
    if (email !== user.email) patch.email = email;
    if (Object.keys(patch).length === 0) {
      setEditingProfile(false);
      return;
    }

    setProfileError(null);
    setProfileSaving(true);
    try {
      const result = await authService.updateProfile(patch); // PATCH /auth/me
      useAuthStore.getState().updateUser(result.user);
      setEditingProfile(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Couldn't save changes.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    // Two separate logouts by design — authService and useAuthStore each
    // keep their own token copy (see api.ts / lib/auth.ts), same pattern
    // as the dashboard's nav sign-out.
    await authService.logout().catch(() => {});
    useAuthStore.getState().logout();
    router.push("/");
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center text-sm text-neutral-600">
        Loading…
      </div>
    );
  }

  const isIdentified = user.tosAccepted === true;
  const isAnonymized = user.tosAccepted === false;
  const hasChosen = user.tosAccepted != null;

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-[20%] w-[600px] h-[400px] rounded-full bg-signal/6 blur-[120px]" />
        <div className="absolute bottom-0 right-[10%] w-[400px] h-[400px] rounded-full bg-active/5 blur-[100px]" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-signal flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="white" />
              <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="2 2" />
            </svg>
          </div>
          <span className="font-semibold text-sm">Lab Brain</span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-400">{user.name}</span>
          <div
            className="w-8 h-8 rounded-full bg-signal/20 border border-signal/30 flex items-center justify-center text-xs font-semibold text-signal-light cursor-default"
            title={user.email}
          >
            {initials(user.name)}
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard" className="text-xs text-neutral-500 hover:text-white transition-colors">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gradient mb-8">Settings</h1>

        {/* Account */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wider">
            Account
          </h2>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-4 mb-4">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover border border-white/10"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-signal/20 border border-signal/30 flex items-center justify-center text-base font-semibold text-signal-light">
                  {initials(user.name)}
                </div>
              )}

              {editingProfile ? (
                <div className="flex-1 space-y-2">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Name"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-signal/50"
                  />
                  <input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-signal/50"
                  />
                </div>
              ) : (
                <div>
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    {user.name}
                    {user.isAdmin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-signal/20 text-signal-light border border-signal/30">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">{user.email}</div>
                </div>
              )}
            </div>

            {profileError && <div className="text-xs text-red-400 mb-3">{profileError}</div>}

            {editingProfile ? (
              <div className="flex gap-3">
                <button
                  disabled={profileSaving}
                  onClick={cancelEditingProfile}
                  className="flex-1 px-4 py-2 rounded-xl border border-white/10 text-xs text-neutral-300 hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={profileSaving}
                  onClick={saveProfile}
                  className="flex-1 px-4 py-2 rounded-xl bg-signal hover:bg-signal-light text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {profileSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-xs text-neutral-600">
                  Member since {formatDate(user.createdAt) || "—"}
                </span>
                <button
                  onClick={startEditingProfile}
                  className="text-xs text-signal-light hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Security */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wider">
            Security
          </h2>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-white">Password</div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {resetState === "sent"
                    ? `Check ${user.email} for a reset link.`
                    : resetState === "error"
                    ? "Couldn't send the reset email — try again."
                    : "Send a reset link to your email."}
                </p>
              </div>
              <button
                disabled={resetState === "sending" || resetState === "sent"}
                onClick={requestPasswordReset}
                className="shrink-0 px-4 py-2 rounded-xl border border-white/10 text-xs text-neutral-300 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {resetState === "sending"
                  ? "Sending…"
                  : resetState === "sent"
                  ? "Sent"
                  : "Reset password"}
              </button>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wider flex items-center gap-2">
            Privacy
            {syncing && <span className="text-[10px] normal-case tracking-normal text-neutral-600">syncing…</span>}
          </h2>

          <div className="glass rounded-2xl p-5 mb-3">
            <div className="flex items-start justify-between gap-4 mb-1">
              <div>
                <div className="text-sm font-medium text-white">
                  {hasChosen
                    ? isIdentified
                      ? "You're recorded as identified"
                      : "You're recorded as anonymized"
                    : "No choice recorded yet"}
                </div>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  {isIdentified &&
                    "Your speech is transcribed under your name and your face may be labeled in scene descriptions. Automated redaction does not remove personal information from your own speech."}
                  {isAnonymized &&
                    "Your speech is attributed to a generic label instead of your name, your face isn't identified in scene descriptions, and redaction is applied to anything you say."}
                  {!hasChosen && "You'll be asked to choose the next time you start a session."}
                </p>
              </div>
            </div>
            {user.tosAcceptedAt && (
              <div className="text-xs text-neutral-600 mt-2">
                Last updated {formatDate(user.tosAcceptedAt)}
              </div>
            )}
          </div>

          {error && <div className="text-xs text-red-400 mb-3">{error}</div>}

          <div className="flex gap-3 mb-4">
            <button
              disabled={saving !== null}
              onClick={() => updatePrivacyChoice(false)}
              className={`flex-1 px-4 py-2.5 rounded-xl border text-sm transition-colors disabled:opacity-50 ${
                isAnonymized
                  ? "border-signal/40 bg-signal/10 text-white"
                  : "border-white/10 text-neutral-300 hover:bg-white/5"
              }`}
            >
              {saving === "anon" ? "Saving…" : "Keep me anonymized"}
            </button>
            <button
              disabled={saving !== null}
              onClick={() => updatePrivacyChoice(true)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                isIdentified
                  ? "bg-signal-light text-white"
                  : "bg-signal hover:bg-signal-light text-white"
              }`}
            >
              {saving === "identified" ? "Saving…" : "I agree — identify me"}
            </button>
          </div>

          <p className="text-xs text-neutral-600 mb-2">
            This applies from your next session onward — it doesn't reprocess past sessions.
          </p>

          <button
            onClick={() => setShowFullNotice((v) => !v)}
            className="text-xs text-signal-light hover:underline"
          >
            {showFullNotice ? "Hide full notice" : "View full privacy notice"}
          </button>
          <p className="text-[11px] text-neutral-600 mt-2">
            To request a copy of your data or ask for it to be deleted, see
            "Questions or requests" in the full notice above.
          </p>

          {showFullNotice && (
            <div className="glass rounded-2xl p-5 mt-3 space-y-4">
              {PRIVACY_TERMS.map((section) => (
                <div key={section.heading}>
                  <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    {section.heading}
                  </h3>
                  {section.body.map((para, i) => (
                    <p key={i} className="text-xs text-neutral-500 leading-relaxed mb-1.5 last:mb-0">
                      {para}
                    </p>
                  ))}
                </div>
              ))}
              <p className="text-[10px] text-neutral-600 pt-1">Notice version {PRIVACY_TERMS_VERSION}</p>
            </div>
          )}
        </section>

        {/* Sign out */}
        <section className="mt-8 pt-6 border-t border-white/5">
          <button
            disabled={signingOut}
            onClick={handleSignOut}
            className="text-xs text-neutral-500 hover:text-white transition-colors disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </section>
      </main>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}