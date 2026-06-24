"use client";
import { useEffect, useRef } from "react";
import { openSSE } from "@/lib/api";
import { useSessionStore } from "@/store/session";
import type { SSEEvent } from "@/types";

export function useSSE(sessionId: string | null) {
  const esRef = useRef<EventSource | null>(null);
  const {
    setMode, setSummoned, setListening, addTranscript,
    addAgentReply, setPerception, setLive,
  } = useSessionStore();

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
          // Browser TTS
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
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
