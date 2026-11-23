"use client";

import { useEffect, useRef } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";

import classes from "./camera.module.css";
import { captureFrame } from "./capture-frame";

// A live stream that stops advancing this long without an error (a stale playlist) counts as dropped; shorter
// buffering recovers on its own.
const STALL_MS = 15_000;
const STALL_CHECK_MS = 5000;

export interface HlsPlayerProps {
  url: string;
  /**
   * Called when the stream cannot be played, ended or stalled, so the caller can restart or fall back. `frame` is the
   * last picture shown, captured before the player goes away.
   */
  onError: (frame?: string) => void;
  /** Called when video is playing. */
  onPlaying?: () => void;
}

/**
 * A muted, control-less live view of one HLS stream, filling its parent. Load it lazily: the player library then
 * only reaches widgets that actually stream.
 */
export default function HlsPlayer({ url, onError, onPlaying }: HlsPlayerProps) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const callbacks = useRef({ onError, onPlaying });
  callbacks.current = { onError, onPlaying };

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const element = document.createElement("video-js");
    element.classList.add(classes.video ?? "");
    element.setAttribute("playsinline", "");
    container.appendChild(element);
    const instance = videojs(element, {
      autoplay: "muted",
      muted: true,
      controls: false,
      loadingSpinner: false,
      fill: true,
      liveui: false,
      html5: { vhs: { overrideNative: true } },
      sources: [{ src: url, type: "application/x-mpegURL" }],
    });
    const video = () => element.querySelector("video") ?? undefined;
    let failed = false;
    const fail = () => {
      if (failed) return;
      failed = true;
      callbacks.current.onError(captureFrame(video()));
    };
    instance.on("error", fail);
    // A live stream has no end: a finished playlist means the stream dropped.
    instance.on("ended", fail);
    instance.on("playing", () => callbacks.current.onPlaying?.());
    let lastTime = -1;
    let lastProgress = Date.now();
    const stallCheck = window.setInterval(() => {
      const time = instance.currentTime() ?? 0;
      if (time !== lastTime || instance.paused()) {
        lastTime = time;
        lastProgress = Date.now();
      } else if (Date.now() - lastProgress > STALL_MS) {
        fail();
      }
    }, STALL_CHECK_MS);
    player.current = instance;
    return () => {
      window.clearInterval(stallCheck);
      if (!instance.isDisposed()) instance.dispose();
      player.current = null;
    };
  }, [url]);

  return <div ref={host} className={classes.videoHost} aria-hidden />;
}
