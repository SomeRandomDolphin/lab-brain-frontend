"use client";
import { useCallback, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { api } from "@/lib/api";
import { useSessionStore } from "@/store/session";
import type { AnyParticipant } from "@/store/session";

/** Sync all room participants (local + remote) into the store. */
function syncParticipants(room: Room) {
  const all: AnyParticipant[] = [
    room.localParticipant,
    ...Array.from(room.remoteParticipants.values()),
  ];
  useSessionStore.getState().setParticipants(all);
}

/** Wire up all room events needed for the video grid and store. */
function attachRoomEvents(room: Room) {
  const sync = () => syncParticipants(room);

  room.on(RoomEvent.ParticipantConnected, sync);
  room.on(RoomEvent.ParticipantDisconnected, sync);
  room.on(RoomEvent.TrackSubscribed, sync);
  room.on(RoomEvent.TrackUnsubscribed, sync);
  room.on(RoomEvent.TrackMuted, sync);
  room.on(RoomEvent.TrackUnmuted, sync);
  room.on(RoomEvent.LocalTrackPublished, sync);
  room.on(RoomEvent.LocalTrackUnpublished, sync);
  room.on(RoomEvent.ActiveSpeakersChanged, sync);
  room.on(RoomEvent.Disconnected, () => {
    useSessionStore.getState().setLive(false);
  });
  room.on(RoomEvent.Reconnected, () => {
    useSessionStore.getState().setLive(true);
    sync();
  });
}

export function useSession() {
  const roomRef = useRef<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const store = useSessionStore();

  /** Connect to a LiveKit room and publish mic + camera. */
  const _connect = useCallback(
    async (session_id: string, token: string, lk_url: string) => {
      const room = new Room();
      roomRef.current = room;
      attachRoomEvents(room);

      await room.connect(lk_url, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(true);

      store.setRoom(room);
      store.setLive(true);
      store.setMicEnabled(true);
      store.setCamEnabled(true);
      syncParticipants(room);
    },
    [store]
  );

  /** Create a new room (host). */
  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    // Clear any summary from a previous session so it doesn't bleed through
    // when the new session page mounts.
    store.setSummary(null, false);
    try {
      const { session_id, token, lk_url } = await api.createRoom();
      store.setSession(session_id, token, lk_url);
      store.setGuest(false);
      await _connect(session_id, token, lk_url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      store.clearSession();
    } finally {
      setStarting(false);
    }
  }, [store, _connect]);

  /** Join an existing room by session ID (guest). */
  const join = useCallback(
    async (sessionId: string, identity?: string) => {
      setError(null);
      setStarting(true);
      // Clear any summary from a previous session.
      store.setSummary(null, false);
      try {
        const { session_id, token, lk_url } = await api.getToken(sessionId, identity);
        store.setSession(session_id, token, lk_url);
        store.setGuest(true);
        await _connect(session_id, token, lk_url);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        store.clearSession();
      } finally {
        setStarting(false);
      }
    },
    [store, _connect]
  );

  /** Toggle microphone. */
  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !store.micEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    store.setMicEnabled(next);
  }, [store]);

  /** Toggle camera. */
  const toggleCam = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !store.camEnabled;
    await room.localParticipant.setCameraEnabled(next);
    store.setCamEnabled(next);
    syncParticipants(room);
  }, [store]);

  /** Share screen (adds a screenshare track). */
  const shareScreen = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const tracks = await room.localParticipant.setScreenShareEnabled(true);
      void tracks;
      syncParticipants(room);
    } catch {
      // user cancelled the picker
    }
  }, []);

  /** End session (host) or leave room (guest). */
  const stop = useCallback(async () => {
    const sid = store.sessionId;
    const isGuest = store.isGuest;
    setStopping(true);
    try {
      if (sid && !isGuest) {
        // 1. Generate summary FIRST while the session is still live so the
        //    LLM has access to the full transcript + LKC state.
        store.setSummary(null, true);
        try {
          const result = await api.postSummary(sid);
          store.setSummary(result?.summary ?? null, false);
        } catch (err) {
          console.warn("[useSession] postSummary failed (non-fatal):", err);
          store.setSummary(null, false);
        }

        // 2. Disconnect from LiveKit after summary is captured.
        await roomRef.current?.disconnect().catch(() => null);
        roomRef.current = null;

        // 3. Delete the server-side room last (non-fatal if it fails).
        await api.deleteRoom(sid).catch((err) =>
          console.warn("[useSession] deleteRoom failed (non-fatal):", err)
        );
      } else {
        // Guest: just disconnect, no summary or room deletion needed.
        await roomRef.current?.disconnect().catch(() => null);
        roomRef.current = null;
      }
    } finally {
      setStopping(false);
      if (isGuest) store.clearSession();
    }
  }, [store]);

  return {
    room: roomRef.current,
    error,
    starting,
    stopping,
    start,
    join,
    stop,
    toggleMic,
    toggleCam,
    shareScreen,
  };
}