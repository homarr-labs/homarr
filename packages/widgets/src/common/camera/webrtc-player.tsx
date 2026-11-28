"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import classes from "./camera.module.css";
import { captureFrame } from "./capture-frame";

/** What the far end sends back for the browser's offer: the answer, later ICE candidates, or an error. */
export type WebRtcSignal =
  | { type: "answer"; sdp: string }
  | { type: "candidate"; candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null }
  | { type: "error"; message: string }
  // Keeps the signaling connection open while nothing else is sent; it carries nothing.
  | { type: "keepalive" };

/**
 * go2rtc (Home Assistant's camera streams) can send a candidate without a media id, which the browser rejects. Like
 * Home Assistant's own frontend, such a candidate belongs to the first media section.
 */
const toIceCandidate = (message: Extract<WebRtcSignal, { type: "candidate" }>): RTCIceCandidateInit => {
  const sdpMid = message.sdpMid ?? null;
  const sdpMLineIndex = message.sdpMLineIndex ?? null;
  return {
    candidate: message.candidate,
    sdpMid,
    sdpMLineIndex: sdpMid === null && sdpMLineIndex === null ? 0 : sdpMLineIndex,
  };
};

// One candidate the browser cannot use leaves the others; only the connection itself failing ends the view.
const addCandidate = (peer: RTCPeerConnection, candidate: RTCIceCandidateInit) =>
  peer.addIceCandidate(candidate).catch(() => undefined);

export interface WebRtcSignalHandlers {
  onSignal: (signal: WebRtcSignal) => void;
  onError: () => void;
}

export interface WebRtcPlayerProps {
  iceServers?: RTCIceServer[];
  /**
   * Opens the session with the far end for the browser's offer (deflated and base64url-encoded, so it fits in a URL)
   * and passes back what it sends, for example as a component that holds a subscription. The session lives as long
   * as the returned element stays mounted.
   */
  signaling: (offer: string, handlers: WebRtcSignalHandlers) => ReactNode;
  /**
   * Called once when the view ends: "setup" when it never played, "dropped" when a playing stream ended or froze
   * (Ring and other cameras end live views after a while), with the last frame to show while reconnecting.
   */
  onError: (reason: "setup" | "dropped", lastFrame?: string) => void;
  /** Called when video is playing. */
  onPlaying?: () => void;
}

// A stream that stays disconnected this long, or whose picture stands still this long, has ended.
const DISCONNECT_GRACE_MS = 5000;
const STALL_CHECK_MS = 5000;
// Ring and other battery cameras take a few seconds to wake up; a view without a frame after this has failed.
const FIRST_FRAME_TIMEOUT_MS = 25_000;

// Waiting for all local candidates keeps the offer complete; on a LAN this takes well under a second.
const ICE_GATHERING_TIMEOUT_MS = 2500;

/** The offer travels in a URL; deflated and base64url-encoded it stays a fraction of its size. */
const compressOffer = async (sdp: string) => {
  const stream = new Blob([sdp]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const waitForIceGathering = (connection: RTCPeerConnection) =>
  new Promise<void>((resolve) => {
    if (connection.iceGatheringState === "complete") return resolve();
    const timeout = window.setTimeout(done, ICE_GATHERING_TIMEOUT_MS);
    function done() {
      window.clearTimeout(timeout);
      connection.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    }
    function onChange() {
      if (connection.iceGatheringState === "complete") done();
    }
    connection.addEventListener("icegatheringstatechange", onChange);
  });

/**
 * A muted live view over WebRTC, filling its parent. The browser makes the offer; `signaling` carries it to the far
 * end (for example through Homarr to a smart home hub) and brings back the answer and any later ICE candidates. The
 * video itself flows straight from the source. Ending the view ends the session, and with it the stream. A stream
 * that never shows a frame, drops or freezes is reported, so the caller can fall back or reconnect.
 */
export default function WebRtcPlayer({ iceServers, signaling, onError, onPlaying }: WebRtcPlayerProps) {
  const video = useRef<HTMLVideoElement>(null);
  const connection = useRef<RTCPeerConnection | null>(null);
  const callbacks = useRef({ onError, onPlaying });
  callbacks.current = { onError, onPlaying };
  // Reported once per player: whether it ever played decides between a setup failure and a dropped stream.
  const played = useRef(false);
  const ended = useRef(false);
  const reportError = useRef(() => {
    if (ended.current) return;
    ended.current = true;
    callbacks.current.onError(played.current ? "dropped" : "setup", captureFrame(video.current));
  });
  const [offer, setOffer] = useState<string | null>(null);
  // Candidates that arrive before the answer wait until it is applied.
  const answered = useRef(false);
  const waiting = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    let closed = false;
    const peer = new RTCPeerConnection(iceServers ? { iceServers } : undefined);
    connection.current = peer;
    answered.current = false;
    waiting.current = [];
    peer.addTransceiver("video", { direction: "recvonly" });
    peer.addTransceiver("audio", { direction: "recvonly" });
    // Homey's WebRTC videos expect a data channel; Home Assistant accepts one.
    peer.createDataChannel("homarr");
    peer.addEventListener("track", (event) => {
      const [stream] = event.streams;
      if (video.current && stream) video.current.srcObject = stream;
    });
    let disconnectTimer: number | undefined;
    peer.addEventListener("connectionstatechange", () => {
      if (closed) return;
      window.clearTimeout(disconnectTimer);
      if (peer.connectionState === "failed" || peer.connectionState === "closed") reportError.current();
      // "disconnected" can recover on its own; if it lasts, the stream has ended.
      if (peer.connectionState === "disconnected") {
        disconnectTimer = window.setTimeout(() => reportError.current(), DISCONNECT_GRACE_MS);
      }
    });
    // Some streams end without closing the connection: the picture just stops. A live video's time keeps running
    // even then, so the decoded frames tell.
    const firstFrameTimer = window.setTimeout(() => {
      if (!played.current) reportError.current();
    }, FIRST_FRAME_TIMEOUT_MS);
    let lastFrames = -1;
    const stallCheck = window.setInterval(() => {
      if (!played.current) return;
      void peer
        .getStats()
        .then((report) => {
          let frames = 0;
          report.forEach((entry: { type?: string; kind?: string; framesDecoded?: number }) => {
            if (entry.type === "inbound-rtp" && entry.kind === "video") frames += entry.framesDecoded ?? 0;
          });
          if (closed) return;
          if (frames === lastFrames) reportError.current();
          lastFrames = frames;
        })
        .catch(() => undefined);
    }, STALL_CHECK_MS);
    void (async () => {
      try {
        await peer.setLocalDescription(await peer.createOffer());
        await waitForIceGathering(peer);
        if (!peer.localDescription) return;
        const compressed = await compressOffer(peer.localDescription.sdp);
        if (!closed) setOffer(compressed);
      } catch {
        if (!closed) reportError.current();
      }
    })();
    return () => {
      closed = true;
      window.clearTimeout(disconnectTimer);
      window.clearInterval(stallCheck);
      window.clearTimeout(firstFrameTimer);
      setOffer(null);
      peer.close();
      connection.current = null;
    };
  }, [iceServers]);

  const apply = async (message: WebRtcSignal) => {
    const peer = connection.current;
    if (!peer) return;
    try {
      if (message.type === "error") {
        reportError.current();
      } else if (message.type === "answer") {
        await peer.setRemoteDescription({ type: "answer", sdp: message.sdp });
        answered.current = true;
        for (const candidate of waiting.current.splice(0)) await addCandidate(peer, candidate);
      } else if (message.type === "candidate") {
        const candidate = toIceCandidate(message);
        if (answered.current) await addCandidate(peer, candidate);
        else waiting.current.push(candidate);
      }
    } catch {
      reportError.current();
    }
  };

  return (
    <>
      {/* The session lives exactly as long as the signaling element: while the view is shown. */}
      {offer
        ? signaling(offer, { onSignal: (message) => void apply(message), onError: () => reportError.current() })
        : null}
      <video
        ref={video}
        className={classes.videoHost}
        autoPlay
        muted
        playsInline
        aria-hidden
        onPlaying={() => {
          played.current = true;
          callbacks.current.onPlaying?.();
        }}
      />
    </>
  );
}
