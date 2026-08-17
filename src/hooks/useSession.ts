"use client";
import { useCallback, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useSessionStore } from "@/store/session";
import type { AnyParticipant } from "@/store/session";
import type { DeviceChoice } from "@/hooks/useDevicePreview";

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

  /**
   * Connect to a LiveKit room and publish mic + camera per the person's
   * choices from the pre-join <PreCheck> screen. `devices` is optional
   * only so this can still be called with no args elsewhere; start()/join()
   * below always pass it now.
   */
  const _connect = useCallback(
    async (session_id: string, token: string, lk_url: string, devices?: DeviceChoice) => {
      // A previous room may still be connected (e.g. this is a retry, or
      // an auto-join fired twice). Tear it down first — otherwise its
      // event listeners stay attached, and when the server force-kicks it
      // for being a duplicate identity, its stale `Disconnected` handler
      // fires `setLive(false)` on top of the room we're about to create.
      if (roomRef.current) {
        roomRef.current.removeAllListeners();
        await roomRef.current.disconnect().catch(() => null);
        roomRef.current = null;
      }
      const room = new Room();
      roomRef.current = room;
      attachRoomEvents(room);

      await room.connect(lk_url, token);

      const wantMic = devices?.micEnabled ?? true;
      const wantCam = devices?.camEnabled ?? true;

      // Neither of these is allowed to throw and take the whole join down
      // with it — a camera (or mic) that fails to start after the person
      // already confirmed in <PreCheck> (device unplugged, permission
      // revoked, grabbed by another app in the interim) should degrade to
      // whatever tracks *did* start, not abort the session entirely. This
      // is what previously turned "Could not start video source" into a
      // full join failure instead of an audio-only session.
      if (wantMic) {
        try {
          await room.localParticipant.setMicrophoneEnabled(
            true,
            devices?.micDeviceId ? { deviceId: devices.micDeviceId } : undefined
          );
        } catch (e) {
          console.warn("[useSession] microphone failed to start:", e);
        }
      }

      if (wantCam) {
        try {
          await room.localParticipant.setCameraEnabled(
            true,
            devices?.camDeviceId ? { deviceId: devices.camDeviceId } : undefined
          );
        } catch (e) {
          console.warn("[useSession] camera failed to start, continuing without video:", e);
        }
      }

      store.setRoom(room);
      store.setLive(true);
      // Reflect what actually ended up publishing, not just what was
      // requested — e.g. a camera that failed mid-connect should leave
      // camEnabled false so the UI (mute icon, ControlBar) matches reality.
      store.setMicEnabled(room.localParticipant.isMicrophoneEnabled);
      store.setCamEnabled(room.localParticipant.isCameraEnabled);
      syncParticipants(room);
    },
    [store]
  );

  /** Create a new room (host). `devices` comes from the pre-join <PreCheck> screen. */
  const start = useCallback(
    async (devices?: DeviceChoice) => {
      setError(null);
      setStarting(true);
      // Clear any summary from a previous session so it doesn't bleed through
      // when the new session page mounts.
      store.setSummary(null, false);
      try {
        // Use the logged-in account's actual name as the LiveKit identity/
        // display name, instead of the backend's generic "browser-user"
        // fallback — this is what shows up in the room roster and (via the
        // vision known-identity fix) replaces "Person (anon)" in the
        // transcript for the host.
        const displayName = useAuthStore.getState().user?.name;
        const { session_id, token, lk_url } = await api.createRoom(displayName);
        store.setSession(session_id, token, lk_url);
        store.setGuest(false);
        await _connect(session_id, token, lk_url, devices);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        store.clearSession();
      } finally {
        setStarting(false);
      }
    },
    [store, _connect]
  );

  /**
   * Join an existing room by session ID.
   *
   * No `identity` param anymore — the backend derives the LiveKit display
   * identity from the authenticated user (GET /livekit/token no longer
   * trusts a client-supplied identity; see app/api/v1/endpoints/livekit.py).
   */
  const join = useCallback(
    async (sessionId: string, devices?: DeviceChoice) => {
      setError(null);
      setStarting(true);
      // Clear any summary from a previous session.
      store.setSummary(null, false);
      try {
        const { session_id, token, lk_url } = await api.getToken(sessionId);
        store.setSession(session_id, token, lk_url);
        store.setGuest(true);
        await _connect(session_id, token, lk_url, devices);
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
      // ── Release hardware FIRST ─────────────────────────────────────────
      // This used to run AFTER `await api.postSummary(sid)`, which calls the
      // LLM and can take many seconds. During that whole window the mic/cam
      // tracks were still live, so the browser's hardware capture indicator
      // stayed on even though the user had already clicked "end session".
      // Stopping tracks and disconnecting the room is now the very first
      // thing that happens, independent of how long summarization takes.
      //
      // Explicitly calling .stop() (not just setMicrophoneEnabled/
      // setCameraEnabled(false)) matters too: muting alone pauses the track
      // but doesn't reliably call .stop() on the underlying
      // MediaStreamTrack in every SDK path, which is what can make the
      // camera/mic indicator look like it "turns back on" after ending.
      const room = roomRef.current;
      const micPub = room?.localParticipant.getTrackPublication(Track.Source.Microphone);
      const camPub = room?.localParticipant.getTrackPublication(Track.Source.Camera);

      if (micPub?.track) {
        micPub.track.stop();
        await room?.localParticipant.unpublishTrack(micPub.track).catch(() => null);
      }
      if (camPub?.track) {
        camPub.track.stop();
        await room?.localParticipant.unpublishTrack(camPub.track).catch(() => null);
      }
      store.setMicEnabled(false);
      store.setCamEnabled(false);

      roomRef.current?.removeAllListeners();
      await roomRef.current?.disconnect().catch(() => null);
      roomRef.current = null;

      // ── Now that hardware is off, tear down the backend room and wait ──
      // for the summary. This can still take a while, but the user's
      // mic/camera are already released by this point.
      if (sid && !isGuest) {
        await api.deleteRoom(sid).catch((err) =>
          console.warn("[useSession] deleteRoom failed (non-fatal):", err)
        );

        store.setSummary(null, true);
        try {
          const result = await api.postSummary(sid);
          store.setSummary(result?.summary ?? null, false);
        } catch (err) {
          console.warn("[useSession] postSummary failed (non-fatal):", err);
          store.setSummary(null, false);
        }
      }
    } finally {
      setStopping(false);
      store.clearSession(); // clear for host too, not just guest
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