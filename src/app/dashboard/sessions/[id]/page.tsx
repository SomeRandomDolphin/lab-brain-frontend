"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";

interface SessionDetail {
  session_id: string;
  count: number;
  records: Record<string, unknown>[];
}

type Tab = "records" | "raw";

// Same reason as /session/page.tsx: useSearchParams() (for ?started=)
// needs a Suspense boundary or `next build` fails prerendering this page.
export default function SessionDetailPage() {
  return (
    <Suspense fallback={<SessionDetailFallback />}>
      <SessionDetailPageInner />
    </Suspense>
  );
}

function SessionDetailFallback() {
  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-signal/30 border-t-signal animate-spin" />
    </div>
  );
}

function SessionDetailPageInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Passed by the dashboard's "View records" link (see dashboard page.tsx)
  // since GET /lkc/sessions/{id} itself doesn't return started_iso. If
  // this page is opened without that param (e.g. a bookmarked/typed URL),
  // startedAt just stays null and the timestamp line is omitted below.
  const startedParam = searchParams.get("started");
  const { user, loading } = useAuthStore();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("records");

  useEffect(() => {
    if (!loading && !user) { router.replace("/auth/login"); return; }
    if (!id) return;

    api.getSession(id)
      .then((data) => setSession(data as SessionDetail))
      .catch(() => setError("Failed to load session. It may no longer exist."))
      .finally(() => setLoadingSession(false));
  }, [id, user, loading, router]);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "records", label: "Records", count: session?.count },
    { key: "raw",     label: "Raw JSON" },
  ];

  const startedAt = formatSessionTime(startedParam);

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-[20%] w-[600px] h-[400px] rounded-full bg-signal/6 blur-[120px]" />
        <div className="absolute bottom-0 right-[10%] w-[400px] h-[400px] rounded-full bg-active/5 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-signal flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="white" />
              <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="2 2" />
            </svg>
          </div>
          <span className="font-semibold text-sm">Lab Brain</span>
        </Link>

        <Link
          href="/dashboard"
          className="text-xs text-neutral-500 hover:text-white transition-colors"
        >
          ← Back to dashboard
        </Link>
      </nav>

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="text-xs text-neutral-500 mb-1 uppercase tracking-wider">Session</div>
          <h1 className="text-2xl font-bold text-white font-mono">#{id}</h1>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mt-2">
            {startedAt && <span>{startedAt}</span>}
            {startedAt && session && <span className="text-neutral-700">·</span>}
            {session && (
              <span>{session.count} {session.count === 1 ? "record" : "records"}</span>
            )}
          </div>
        </div>

        {/* Loading */}
        {loadingSession && (
          <div className="glass rounded-2xl p-10 text-center text-neutral-500 text-sm animate-pulse">
            Loading session…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass rounded-2xl p-10 text-center text-red-400 text-sm">
            {error}
          </div>
        )}

        {session && !loadingSession && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-white/5">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                    activeTab === t.key
                      ? "bg-white/8 text-white border-b-2 border-signal"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {t.label}
                  {t.count != null && (
                    <span className="ml-1.5 text-neutral-600">({t.count})</span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === "records" && (
              <RecordsPanel records={session.records} />
            )}
            {activeTab === "raw" && (
              <RawPanel session={session} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Renders e.g. "Aug 17, 2026, 9:04 AM". Returns null on a missing/bad
// timestamp so the caller can omit the line entirely instead of showing
// "Invalid Date".
function formatSessionTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Records panel ────────────────────────────────────────── */

function RecordsPanel({ records }: { records: Record<string, unknown>[] }) {
  if (!records?.length) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-neutral-600 text-sm">
        No records in this session.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {records.map((record, i) => (
        <RecordRow key={i} index={i} record={record} />
      ))}
    </div>
  );
}

function RecordRow({ index, record }: { index: number; record: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);

  // Try to pick out well-known display fields
  const type    = typeof record.type    === "string" ? record.type    : null;
  const speaker = typeof record.speaker === "string" ? record.speaker : null;
  const text    = typeof record.text    === "string" ? record.text
                : typeof record.content === "string" ? record.content
                : typeof record.description === "string" ? record.description
                : null;
  const ts      = typeof record.timestamp === "number" ? record.timestamp
                : typeof record.start     === "number" ? record.start
                : null;

  function formatTs(t: number | null) {
    if (t === null) return null;
    // If timestamp looks like a Unix epoch (>1e9), format as time; otherwise as seconds offset
    if (t > 1_000_000_000) {
      return new Date(t * 1000).toLocaleTimeString();
    }
    const m = Math.floor(t / 60).toString().padStart(2, "0");
    const s = Math.floor(t % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Summary row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-3.5 flex items-start gap-4 hover:bg-white/5 transition-colors text-left"
      >
        {/* Index */}
        <span className="text-xs text-neutral-600 font-mono w-6 shrink-0 pt-0.5">
          {index + 1}
        </span>

        {/* Timestamp */}
        <span className="text-xs text-neutral-600 font-mono w-16 shrink-0 pt-0.5">
          {formatTs(ts) ?? "—"}
        </span>

        {/* Type badge */}
        {type && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-signal/10 text-signal-light font-mono shrink-0">
            {type}
          </span>
        )}

        {/* Speaker */}
        {speaker && (
          <span className="text-xs text-neutral-400 font-semibold shrink-0">{speaker}</span>
        )}

        {/* Preview text */}
        <span className="text-sm text-white truncate flex-1">
          {text ?? <span className="text-neutral-600 italic">no preview</span>}
        </span>

        {/* Expand chevron */}
        <span className={`text-neutral-600 text-xs shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {/* Expanded: full JSON of this record */}
      {expanded && (
        <pre className="px-5 pb-4 text-xs text-neutral-400 font-mono leading-relaxed overflow-auto max-h-64 border-t border-white/5 pt-3">
          {JSON.stringify(record, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ── Raw JSON panel ───────────────────────────────────────── */

function RawPanel({ session }: { session: SessionDetail }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(session, null, 2);

  function handleCopy() {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <span className="text-xs text-neutral-500">JSON</span>
        <button
          onClick={handleCopy}
          className="text-xs text-signal-light hover:underline transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-5 text-xs text-neutral-300 overflow-auto max-h-[60vh] leading-relaxed font-mono">
        {json}
      </pre>
    </div>
  );
}