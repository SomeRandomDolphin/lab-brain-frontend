"use client";
import { useEffect, useRef } from "react";
import { openSSE } from "@/lib/api";
import { useSessionStore } from "@/store/session";
import { useShallow } from "zustand/react/shallow";
import type { SSEEvent } from "@/types";

export function useSSE(sessionId: string | null) {
  const esRef = useRef<EventSource | null>(null);
  // Previously: const { setMode, ... } = useSessionStore(); — a bare call
  // subscribes to the WHOLE store, so this hook (called from inside
  // SessionPage's render) re-rendered SessionPage on every single "listening"/
  // "perception" update, i.e. up to ~50x/sec. We only ever need the action
  // functions here (never read state), so useShallow scopes the subscription
  // to just those — action references are stable, so this hook no longer
  // triggers a re-render at all once mounted.
  const {
    setMode, setSummoned, setListening, addTranscript,
    addAgentReply, setPerception, setLive,
  } = useSessionStore(
    useShallow((s) => ({
      setMode: s.setMode,
      setSummoned: s.setSummoned,
      setListening: s.setListening,
      addTranscript: s.addTranscript,
      addAgentReply: s.addAgentReply,
      setPerception: s.setPerception,
      setLive: s.setLive,
    }))
  );

  useEffect(() => {
    if (!sessionId) return;

    const es = openSSE(sessionId);
    esRef.current = es;

    es.onopen = () => setLive(true);

    es.onmessage = (ev: MessageEvent) => {
      let msg: SSEEvent;
      try {
        msg = JSON.parse(ev.data as string) as SSEEvent;
      } catch {
        return;
      }

      switch (msg.type) {
        case "session":
          setLive(true);
          break;
        case "transcript":
          addTranscript(msg);
          setMode(msg.mode);
          setSummoned(msg.summoned);
          setListening(false);
          break;
        case "agent_reply":
          addAgentReply(msg);
          break;
        case "speak":
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel(); // clear any stuck/pending utterance first
            const utt = new SpeechSynthesisUtterance(msg.text);
            utt.rate = 1.05;
            window.speechSynthesis.speak(utt);
          }
          break;
        case "perception":
          setPerception(msg);
          break;
        case "mode_change":
          setMode(msg.mode);
          break;
        case "listening":
          setListening(true);
          setSummoned(msg.summoned);
          setMode(msg.mode);
          break;
        case "error":
          console.error("[SSE] backend error:", msg.message);
          break;
      }
    };

    es.onerror = () => {
      setLive(false);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps
}