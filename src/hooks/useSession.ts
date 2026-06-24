"use client";
import { useCallback, useRef, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { api } from "@/lib/api";
import { useSessionStore } from "@/store/session";

export function useSession() {
  const roomRef = useRef<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const {
    setSession, clearSession, setSummary, sessionId,
  } = useSessionStore();

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const { session_id, token, lk_url } = await api.createRoom();
      setSession(session_id, token, lk_url);

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.Disconnected, () => {
        useSessionStore.getState().setLive(false);
      });

      await room.connect(lk_url, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      clearSession();
    } finally {
      setStarting(false);
    }
  }, [setSession, clearSession]);

  const stop = useCallback(async () => {
    const sid = sessionId;
    setStopping(true);
    try {
      if (sid) {
        // Generate summary before teardown
        useSessionStore.getState().setSummary(null, true);
        const result = await api.postSummary(sid).catch(() => null);
        if (result) useSessionStore.getState().setSummary(result.summary, false);

        // Disconnect LiveKit room
        await roomRef.current?.disconnect();
        roomRef.current = null;

        // Delete room on backend
        await api.deleteRoom(sid).catch(() => null);
      }
    } finally {
      setStopping(false);
    }
  }, [sessionId]);

  return {
    room: roomRef.current,
    error,
    starting,
    stopping,
    start,
    stop,
  };
}
