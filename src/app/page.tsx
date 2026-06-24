"use client";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";

export default function WelcomePage() {
  const { user } = useAuthStore();

  return (
    <main className="min-h-screen bg-ink-950 flex flex-col">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-signal/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full bg-active/6 blur-[100px]" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-signal-dim/10 blur-[80px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-signal flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="white" />
              <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="2 2" />
            </svg>
          </div>
          <span className="font-semibold text-base tracking-tight">Lab Brain</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-signal text-white text-sm font-medium hover:bg-signal-light transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 rounded-lg bg-signal text-white text-sm font-medium hover:bg-signal-light transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-neutral-400 mb-8 border border-white/8">
          <span className="w-1.5 h-1.5 rounded-full bg-active animate-pulse-slow" />
          Multimodal · Real-time · Research-grade
        </div>

        <h1 className="text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6 max-w-3xl">
          <span className="text-gradient">Your lab's</span>
          <br />
          <span className="signal-gradient">second brain</span>
        </h1>

        <p className="text-lg text-neutral-400 max-w-xl leading-relaxed mb-10">
          Lab Brain listens to your research sessions, understands what's
          happening in the room, and answers questions — all in real time.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Link
            href={user ? "/dashboard" : "/auth/register"}
            className="px-6 py-3 rounded-xl bg-signal hover:bg-signal-light text-white font-semibold text-sm transition-all shadow-signal"
          >
            {user ? "Open dashboard" : "Start for free"}
          </Link>
          <Link
            href="/auth/login"
            className="px-6 py-3 rounded-xl glass border border-white/8 text-sm font-medium hover:bg-white/8 transition-all"
          >
            Sign in to your lab →
          </Link>
        </div>

        {/* Feature chips */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl w-full">
          {[
            { icon: "🎙", label: "Live transcription", sub: "Word-level accuracy" },
            { icon: "🔬", label: "Scene perception", sub: "Who's in the room" },
            { icon: "🧠", label: "Q&A mode", sub: "Ask anything, get answers" },
            { icon: "📋", label: "Auto summary", sub: "Action items & decisions" },
          ].map((f) => (
            <div key={f.label} className="glass rounded-2xl p-4 text-left hover:bg-white/6 transition-colors">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-sm font-medium text-white">{f.label}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{f.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-5 flex items-center justify-between text-xs text-neutral-600">
        <span>Lab Brain — Module 5 Month 6</span>
        <span>Research Laboratory AI System</span>
      </footer>
    </main>
  );
}
