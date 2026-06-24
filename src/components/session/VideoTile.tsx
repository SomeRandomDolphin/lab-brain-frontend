"use client";
import { useEffect, useRef } from "react";
import {
  type RemoteParticipant,
  type LocalParticipant,
  type Room,
  Track,
  ParticipantEvent,
} from "livekit-client";
import { cn, initials, speakerColor } from "@/lib/utils";
import { useSessionStore } from "@/store/session";

interface Props {
  participant: RemoteParticipant | LocalParticipant;
  featured?: boolean;
  className?: string;
}

export function VideoTile({ participant, featured = false, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const room = useSessionStore((s) => s.room);
  const isLocal = participant.isLocal;

  // ── Video attachment ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    function attach() {
      const pub = participant.getTrackPublication(Track.Source.Camera);
      const track = pub?.track;
      if (track && el) track.attach(el);
    }

    function detach() {
      const pub = participant.getTrackPublication(Track.Source.Camera);
      pub?.track?.detach();
    }

    attach();

    participant.on(ParticipantEvent.TrackSubscribed, attach);
    participant.on(ParticipantEvent.TrackUnsubscribed, detach);
    participant.on(ParticipantEvent.TrackPublished, attach);
    participant.on(ParticipantEvent.TrackUnpublished, detach);
    participant.on(ParticipantEvent.TrackMuted, attach);
    participant.on(ParticipantEvent.TrackUnmuted, attach);
    participant.on(ParticipantEvent.LocalTrackPublished, attach);
    participant.on(ParticipantEvent.LocalTrackUnpublished, detach);

    return () => {
      detach();
      participant.off(ParticipantEvent.TrackSubscribed, attach);
      participant.off(ParticipantEvent.TrackUnsubscribed, detach);
      participant.off(ParticipantEvent.TrackPublished, attach);
      participant.off(ParticipantEvent.TrackUnpublished, detach);
      participant.off(ParticipantEvent.TrackMuted, attach);
      participant.off(ParticipantEvent.TrackUnmuted, attach);
      participant.off(ParticipantEvent.LocalTrackPublished, attach);
      participant.off(ParticipantEvent.LocalTrackUnpublished, detach);
    };
  }, [participant]);

  // ── Audio attachment (remote only) ─────────────────────────────────────────
  useEffect(() => {
    if (isLocal) return;
    const el = audioRef.current;
    if (!el) return;

    const remote = participant as RemoteParticipant;

    function attachAudio() {
      const pub = remote.getTrackPublication(Track.Source.Microphone);
      if (pub?.track && el) pub.track.attach(el);
    }

    attachAudio();
    remote.on(ParticipantEvent.TrackSubscribed, attachAudio);

    return () => {
      const pub = remote.getTrackPublication(Track.Source.Microphone);
      pub?.track?.detach();
      remote.off(ParticipantEvent.TrackSubscribed, attachAudio);
    };
  }, [participant, isLocal]);

  // ── Re-attach on store update (handles late-arriving tracks) ───────────────
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const pub = participant.getTrackPublication(Track.Source.Camera);
    if (pub?.track) pub.track.attach(el);
  });

  const camPub = participant.getTrackPublication(Track.Source.Camera);
  const micPub = participant.getTrackPublication(Track.Source.Microphone);
  const isCamOn = !!(camPub?.track && !camPub.isMuted);
  const isMicOn = !!(micPub && !micPub.isMuted);

  const name = participant.name || participant.identity || "Guest";
  const color = speakerColor(name);

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden bg-ink-900 border border-white/8 flex items-center justify-center group",
        featured && "rounded-none",
        className
      )}
    >
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLocal && "scale-x-[-1]",
          isCamOn ? "opacity-100" : "opacity-0 absolute"
        )}
      />

      {/* Remote audio */}
      {!isLocal && (
        <audio ref={audioRef} autoPlay className="hidden" />
      )}

      {/* Camera-off avatar */}
      {!isCamOn && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-900">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg"
            style={{ background: color }}
          >
            {initials(name)}
          </div>
        </div>
      )}

      {/* Name bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
        <span className="text-xs font-medium text-white truncate max-w-[75%]">
          {name}
          {isLocal && <span className="text-neutral-400 ml-1">(you)</span>}
        </span>
        <div className="flex items-center gap-1">
          {!isMicOn && (
            <span className="w-5 h-5 rounded-full bg-danger/80 flex items-center justify-center">
              <MicOffIcon />
            </span>
          )}
          {!isCamOn && (
            <span className="w-5 h-5 rounded-full bg-neutral-700/80 flex items-center justify-center">
              <CamOffIcon />
            </span>
          )}
        </div>
      </div>

      {/* Speaking ring */}
      <SpeakingRing participant={participant} room={room} />
    </div>
  );
}

function SpeakingRing({
  participant,
  room,
}: {
  participant: RemoteParticipant | LocalParticipant;
  room: Room | null;
}) {
  const _sync = useSessionStore((s) => s.participants); // subscribe for re-renders
  void _sync;
  const isSpeaking =
    room?.activeSpeakers?.some((s) => s.identity === participant.identity) ?? false;

  if (!isSpeaking) return null;

  return (
    <div className="absolute inset-0 rounded-2xl pointer-events-none border-2 border-active shadow-active animate-pulse-slow" />
  );
}

function MicOffIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M9 5V4a2 2 0 00-4 0v3M5 9a2 2 0 003.46 1.39M12 7a5 5 0 01-9.9 1M7 13v-2" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CamOffIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M5 5H3a1 1 0 00-1 1v4a1 1 0 001 1h7M9 9l3 2V4L9 6" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
