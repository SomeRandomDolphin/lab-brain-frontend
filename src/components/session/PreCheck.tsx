"use client";
import { useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { useDevicePreview, type DeviceChoice } from "@/hooks/useDevicePreview";
import { initials } from "@/lib/utils";

interface Props {
  mode: "host" | "join";
  sessionLabel: string;
  loading: boolean;
  error: string | null;
  confirmLabel: string;
  onBack?: () => void;
  onConfirm: (devices: DeviceChoice) => void;
}

/** "Check your setup" screen shown before actually connecting to the room —
 *  the pre-join equivalent of Zoom/Meet's camera+mic check. */
export function PreCheck({ mode, sessionLabel, loading, error, confirmLabel, onBack, onConfirm }: Props) {
  const { user } = useAuthStore();
  const preview = useDevicePreview();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Keeps srcObject in sync when the stream *object itself* changes (e.g.
  // selecting a different camera in the device picker, or the
  // camera+mic-together fallback swapping in a new audio-only stream).
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = preview.stream;
  }, [preview.stream]);

  // The <video> element below is conditionally rendered — it unmounts
  // entirely when the camera is toggled off (showVideo goes false) and a
  // BRAND NEW <video> node is created when toggled back on. toggleCam()
  // in useDevicePreview doesn't create a new MediaStream object (it just
  // flips `track.enabled` on the existing one), so the effect above never
  // re-fires for that new node — its dependency, `preview.stream`, hasn't
  // changed as a value. Without this callback ref the new node's
  // srcObject was simply never set, which is why the preview looked dead
  // after turning the camera back on. A ref callback fires on every mount
  // regardless of whether any prop changed, so it catches exactly that
  // case that the effect misses.
  const attachVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (node) node.srcObject = preview.stream;
    },
    [preview.stream]
  );

  function handleConfirm() {
    const devices: DeviceChoice = {
      micEnabled: preview.micOn && !!preview.stream?.getAudioTracks().length,
      camEnabled: preview.camOn && !!preview.stream?.getVideoTracks().length,
      micDeviceId: preview.micId,
      camDeviceId: preview.camId,
    };
    // Release the preview's getUserMedia stream before handing off — the
    // real LiveKit tracks are about to request the same hardware, and two
    // concurrent getUserMedia holders on the same device is exactly what
    // produces "Could not start video source".
    preview.release();
    onConfirm(devices);
  }

  const showVideo = preview.camOn && !!preview.stream?.getVideoTracks().length;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-base font-semibold text-white mb-1">
          {mode === "host" ? "Check your setup" : "Ready to join?"}
        </h2>
        <p className="text-xs text-neutral-500">{sessionLabel}</p>
        {user && (
          <p className="text-[11px] text-neutral-600 mt-0.5">
            Joining as <span className="text-neutral-400">{user.name}</span>
          </p>
        )}
      </div>

      {/* Video preview tile */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-ink-900 border border-rim">
        {showVideo ? (
          <video
            ref={attachVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover -scale-x-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-signal/20 border border-signal/30 flex items-center justify-center text-lg font-semibold text-signal-light">
              {user ? initials(user.name) : "?"}
            </div>
          </div>
        )}

        {/* Mic level meter */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-ink-950/70 backdrop-blur">
          <MicIcon muted={!preview.micOn} className="w-3.5 h-3.5 text-white flex-shrink-0" />
          <div className="w-14 h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-active rounded-full transition-[width] duration-75"
              style={{ width: `${preview.micOn ? Math.round(preview.micLevel * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Mic/cam toggles */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <button
            type="button"
            onClick={preview.toggleMic}
            title={preview.micOn ? "Mute microphone" : "Unmute microphone"}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              preview.micOn ? "bg-white/10 hover:bg-white/20" : "bg-danger text-white"
            }`}
          >
            <MicIcon muted={!preview.micOn} className="w-4 h-4 text-white" />
          </button>
          <button
            type="button"
            onClick={preview.toggleCam}
            title={preview.camOn ? "Turn camera off" : "Turn camera on"}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              preview.camOn ? "bg-white/10 hover:bg-white/20" : "bg-danger text-white"
            }`}
          >
            <CamIcon off={!preview.camOn} className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {preview.error && (
        <div className="px-3 py-2 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger">
          {preview.error}
        </div>
      )}
      {error && (
        <div className="px-3 py-2 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger">
          {error}
        </div>
      )}

      {/* Device pickers */}
      <div className="space-y-2.5">
        <DeviceSelect label="Microphone" value={preview.micId} options={preview.mics} onChange={preview.selectMic} />
        <DeviceSelect label="Camera" value={preview.camId} options={preview.cams} onChange={preview.selectCam} />
      </div>

      <div className="flex items-center gap-2 pt-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="px-4 py-3 rounded-xl border border-rim text-sm text-neutral-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading || preview.loading}
          className="flex-1 py-3 rounded-xl bg-signal hover:bg-signal-light disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-signal"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border border-white/40 border-t-white rounded-full animate-spin" />
              {mode === "host" ? "Setting up room…" : "Joining…"}
            </span>
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </div>
  );
}

function DeviceSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: { deviceId: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-neutral-500 mb-1">{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={options.length === 0}
        className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-rim text-xs text-neutral-300 focus:border-signal/50 focus:outline-none transition-colors disabled:opacity-50"
      >
        {options.length === 0 ? (
          <option value="">Not available</option>
        ) : (
          options.map((o) => (
            <option key={o.deviceId} value={o.deviceId}>
              {o.label}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

function MicIcon({ muted, className }: { muted: boolean; className?: string }) {
  return muted ? (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M5 3.5a3 3 0 0 1 6 0v3.2M11 8v.5a3 3 0 0 1-4.6 2.54M4 4l8 8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 8a4.5 4.5 0 0 0 4.5 4.5M8 12.5V14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="5.5" y="1.5" width="5" height="7.5" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.5 8a4.5 4.5 0 0 0 9 0M8 12.5V14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CamIcon({ off, className }: { off: boolean; className?: string }) {
  return off ? (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M1.5 3.5h7A1.5 1.5 0 0 1 10 5v6a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 0 11V5a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M10 6.5 14.5 4v8L10 9.5M2 2l12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1.5" y="3.5" width="8.5" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 6.5 14.5 4v8L10 9.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}