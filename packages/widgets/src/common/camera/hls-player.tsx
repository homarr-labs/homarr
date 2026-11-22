"use client";

import { useEffect, useRef } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";

import classes from "./camera.module.css";

export interface HlsPlayerProps {
  url: string;
  /** Called when the stream cannot be played, so the caller can fall back, for example to a snapshot. */
  onError: () => void;
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
    instance.on("error", () => callbacks.current.onError());
    instance.on("playing", () => callbacks.current.onPlaying?.());
    player.current = instance;
    return () => {
      if (!instance.isDisposed()) instance.dispose();
      player.current = null;
    };
  }, [url]);

  return <div ref={host} className={classes.videoHost} aria-hidden />;
}
