"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Device + on/off choices carried from the pre-join check into
 * useSession's start()/join(), so the actual LiveKit room is created with
 * whatever the person picked here instead of hardcoded defaults.
 */
export interface DeviceChoice {
  micEnabled: boolean;
  camEnabled: boolean;
  micDeviceId?: string;
  camDeviceId?: string;
}

interface DeviceOption {
  deviceId: string;
  label: string;
}

async function requestStream(wantMic: boolean, wantCam: boolean, micId?: string, camId?: string) {
  return navigator.mediaDevices.getUserMedia({
    audio: wantMic ? (micId ? { deviceId: { exact: micId } } : true) : false,
    video: wantCam ? (camId ? { deviceId: { exact: camId } } : true) : false,
  });
}

/**
 * Local (non-LiveKit) getUserMedia preview for the pre-join device-check
 * screen — camera preview, mic level meter, device pickers — all before
 * room.connect() is ever called.
 *
 * Deliberately separate from the LiveKit room's own tracks. Callers MUST
 * call `release()` right before actually connecting, so the camera/mic
 * aren't held open by two concurrent getUserMedia calls at once — that
 * double-open is exactly what produced "Could not start video source" when
 * a second meeting on the same machine tried to grab the same camera.
 */
export function useDevicePreview() {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mics, setMics] = useState<DeviceOption[]>([]);
  const [cams, setCams] = useState<DeviceOption[]>([]);
  const [micId, setMicId] = useState<string | undefined>(undefined);
  const [camId, setCamId] = useState<string | undefined>(undefined);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0); // 0..1
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopLevelMeter = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => null);
      audioCtxRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    stopLevelMeter();
  }, [stopLevelMeter]);

  const startLevelMeter = useCallback(
    (s: MediaStream) => {
      stopLevelMeter();
      const track = s.getAudioTracks()[0];
      if (!track) return;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(new MediaStream([track]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(1, avg / 100));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    },
    [stopLevelMeter]
  );

  const refreshDeviceLabels = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setMics(
        devices
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }))
      );
      setCams(
        devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }))
      );
    } catch {
      // enumerateDevices can be flaky before permission is granted in some
      // browsers — non-fatal, the selects just stay empty until it succeeds.
    }
  }, []);

  const openStream = useCallback(
    async (opts?: { micId?: string; camId?: string; wantMic?: boolean; wantCam?: boolean }) => {
      const wantMic = opts?.wantMic ?? micOn;
      const wantCam = opts?.wantCam ?? camOn;
      const useMicId = opts?.micId ?? micId;
      const useCamId = opts?.camId ?? camId;

      setLoading(true);
      setError(null);
      stopStream();

      let s: MediaStream | null = null;
      try {
        s = await requestStream(wantMic, wantCam, useMicId, useCamId);
      } catch (e1) {
        // Camera+mic together failed — most commonly because the camera is
        // already held open by another app/tab/meeting (NotReadableError).
        // Fall back to audio-only instead of blocking the whole pre-join
        // screen, the same way Meet/Zoom degrade in this situation.
        if (wantMic && wantCam) {
          try {
            s = await requestStream(true, false, useMicId, undefined);
            setCamOn(false);
            setError("Camera unavailable (likely in use elsewhere) — continuing with audio only.");
          } catch (e2) {
            setMicOn(false);
            setCamOn(false);
            setError(e2 instanceof Error ? e2.message : String(e2));
          }
        } else {
          if (wantMic) setMicOn(false);
          if (wantCam) setCamOn(false);
          setError(e1 instanceof Error ? e1.message : String(e1));
        }
      }

      streamRef.current = s;
      setStream(s);
      if (s && s.getAudioTracks().length > 0) startLevelMeter(s);
      await refreshDeviceLabels();
      setLoading(false);
    },
    [micOn, camOn, micId, camId, stopStream, startLevelMeter, refreshDeviceLabels]
  );

  useEffect(() => {
    openStream();
    return () => stopStream();
    // Mount-only: device/toggle changes call openStream() directly instead
    // of re-running this effect, so it intentionally doesn't list its
    // reactive deps here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = useCallback(() => {
    const next = !micOn;
    setMicOn(next);
    if (streamRef.current && streamRef.current.getAudioTracks().length > 0) {
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = next));
      if (next) startLevelMeter(streamRef.current);
      else stopLevelMeter();
    } else if (next) {
      // No audio track yet (previously denied/unavailable) — try again in
      // case the person granted permission or plugged in a mic since.
      openStream({ wantMic: true, wantCam: camOn });
    }
  }, [micOn, camOn, startLevelMeter, stopLevelMeter, openStream]);

  const toggleCam = useCallback(() => {
    const next = !camOn;
    setCamOn(next);
    if (streamRef.current && streamRef.current.getVideoTracks().length > 0) {
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = next));
    } else if (next) {
      openStream({ wantMic: micOn, wantCam: true });
    }
  }, [camOn, micOn, openStream]);

  const selectMic = useCallback(
    (id: string) => {
      setMicId(id);
      openStream({ micId: id, camId, wantMic: true, wantCam: camOn });
    },
    [openStream, camId, camOn]
  );

  const selectCam = useCallback(
    (id: string) => {
      setCamId(id);
      openStream({ micId, camId: id, wantMic: micOn, wantCam: true });
    },
    [openStream, micId, micOn]
  );

  /** Release the preview stream. Call right before connecting to the room. */
  const release = useCallback(() => {
    stopStream();
  }, [stopStream]);

  return {
    stream,
    micOn,
    camOn,
    mics,
    cams,
    micId,
    camId,
    micLevel,
    error,
    loading,
    toggleMic,
    toggleCam,
    selectMic,
    selectCam,
    release,
  };
}