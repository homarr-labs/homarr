"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useDocumentVisibility, useInViewport } from "@mantine/hooks";
import { skipToken } from "@tanstack/react-query";

import { clientApi } from "@homarr/api/client";

import type { WebRtcSignalHandlers } from "../../common/camera/webrtc-player";
import type { HaEntity } from "./types";

// Waits before restarting a live view that dropped, by how often it dropped in a row.
const RESTART_DELAYS_MS = [1000, 3000, 10_000, 30_000];
// A stream that ran this long before ending (a camera's live view timeout) starts the waits over.
const STABLE_STREAM_MS = 60_000;

// The player libraries load only while a camera actually streams.
const HlsPlayer = lazy(() => import("../../common/camera/hls-player"));
const WebRtcPlayer = lazy(() => import("../../common/camera/webrtc-player"));

/** Holds a camera's WebRTC session open through Homarr while it is mounted. */
function SmartHomeWebRtcSignaling({
  integrationId,
  entityId,
  offer,
  onSignal,
  onError,
}: WebRtcSignalHandlers & { integrationId: string; entityId: string; offer: string }) {
  clientApi.widget.smartHome.cameraWebRtc.useSubscription(offer ? { integrationId, entityId, offer } : skipToken, {
    onData: (message) => {
      if (message.type !== "keepalive") onSignal(message);
    },
    onError,
  });
  return null;
}

/** "live" once a picture runs; "connecting" or "reconnecting" while one is on its way; null without a live view. */
export type CameraLiveStatus = "live" | "connecting" | "reconnecting" | null;

interface CameraLiveOptions {
  integrationId: string | null;
  entity: HaEntity;
  /** The caller's own conditions, for example not while editing and only when the user wants live video. */
  enabled: boolean;
}

/**
 * A camera's live view: while its container is on screen and the page is visible, it streams over WebRTC, then HLS,
 * whichever the integration offers, and otherwise leaves the snapshot. A view that drops after playing (Ring and
 * others end live views after a while) reconnects by itself, waiting longer each time it drops again in a row; the
 * last frame stays meanwhile.
 *
 * Returns the container ref, the player to render over the picture, the frame to keep showing while reconnecting
 * and the status for a badge.
 */
export function useCameraLive({ integrationId, entity, enabled }: CameraLiveOptions) {
  const { ref, inViewport } = useInViewport();
  const pageVisible = useDocumentVisibility() === "visible";
  // The stream that failed last; a new stream (or coming back on screen) tries again.
  const [failedKey, setFailedKey] = useState<string | null>(null);
  // WebRTC first; when it fails, the integration is asked for HLS once (Home Assistant has both).
  const [prefer, setPrefer] = useState<"hls" | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [restarting, setRestarting] = useState<{ frame?: string; waiting: boolean } | null>(null);
  const drops = useRef(0);
  const playingSince = useRef<number | null>(null);
  // Live only once the picture actually runs; until then the view is connecting.
  const [playing, setPlaying] = useState(false);
  const restartTimer = useRef<number | undefined>(undefined);
  const scheduleRestart = (frame?: string) => {
    if (playingSince.current !== null && Date.now() - playingSince.current > STABLE_STREAM_MS) drops.current = 0;
    playingSince.current = null;
    setPlaying(false);
    const delay = RESTART_DELAYS_MS[Math.min(drops.current, RESTART_DELAYS_MS.length - 1)] ?? 0;
    drops.current += 1;
    setRestarting((current) => ({ frame: frame ?? current?.frame, waiting: true }));
    window.clearTimeout(restartTimer.current);
    restartTimer.current = window.setTimeout(() => {
      setRestarting((current) => (current ? { ...current, waiting: false } : current));
      setAttempt((value) => value + 1);
    }, delay);
  };
  useEffect(() => () => window.clearTimeout(restartTimer.current), []);

  const wantsLive = enabled && inViewport && pageVisible && entity.state !== "unavailable" && integrationId !== null;
  const stream = clientApi.widget.smartHome.cameraStream.useQuery(
    { integrationId: integrationId ?? "", entityId: entity.id, ...(prefer ? { prefer } : {}) },
    { enabled: wantsLive, staleTime: 60_000, gcTime: 0, refetchOnWindowFocus: false, retry: false },
  );
  const kind = wantsLive ? stream.data?.kind : undefined;
  const url = stream.data?.kind === "hls" ? stream.data.url : null;
  const streamKey = kind === "hls" ? url : kind === "webrtc" ? `webrtc:${entity.id}` : null;
  const live = streamKey !== null && streamKey !== failedKey;
  useEffect(() => {
    if (wantsLive) return;
    // Back on screen, everything is tried again from the best stream.
    setFailedKey(null);
    setPrefer(undefined);
    setRestarting(null);
    drops.current = 0;
    setPlaying(false);
    window.clearTimeout(restartTimer.current);
  }, [wantsLive]);

  // Waiting for the stream address, a player that has not shown a frame yet, or a restart.
  const connecting = !playing && wantsLive && (stream.isLoading || live || restarting !== null);
  const startPlaying = () => {
    playingSince.current = Date.now();
    setPlaying(true);
    setRestarting(null);
  };

  let player: ReactNode = null;
  if (live && kind === "hls" && url && !restarting?.waiting) {
    player = (
      <Suspense fallback={null}>
        <HlsPlayer
          key={attempt}
          url={url}
          onPlaying={startPlaying}
          onError={() => {
            // A stream that played (or a restart of one) comes back with the same backoff as WebRTC; one that never
            // played is given up until the camera is back on screen.
            if (playingSince.current !== null || restarting) scheduleRestart();
            else {
              setPlaying(false);
              setFailedKey(streamKey);
            }
          }}
        />
      </Suspense>
    );
  } else if (live && kind === "webrtc" && integrationId && !restarting?.waiting) {
    player = (
      <Suspense fallback={null}>
        <WebRtcPlayer
          key={attempt}
          iceServers={stream.data?.kind === "webrtc" ? stream.data.iceServers : undefined}
          signaling={(offer, handlers) => (
            <SmartHomeWebRtcSignaling integrationId={integrationId} entityId={entity.id} offer={offer} {...handlers} />
          )}
          onPlaying={startPlaying}
          onError={(reason, frame) => {
            // A stream that played (or a restart of one) comes back; one that never played falls back to HLS.
            if (reason === "dropped" || restarting) scheduleRestart(frame);
            else {
              setPlaying(false);
              setPrefer("hls");
            }
          }}
        />
      </Suspense>
    );
  }

  let status: CameraLiveStatus = null;
  if (playing) status = "live";
  else if (connecting) status = restarting ? "reconnecting" : "connecting";

  return { ref, player, frame: restarting?.frame, status };
}
