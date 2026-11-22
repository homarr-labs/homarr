"use client";

import { useEffect, useRef, useState } from "react";
import { skipToken } from "@tanstack/react-query";

import { clientApi } from "@homarr/api/client";
import type { SmartHomeIceServer, SmartHomeWebRtcMessage } from "@homarr/integrations/types";

import classes from "./layout.module.css";

interface WebRtcCameraPlayerProps {
  integrationId: string;
  entityId: string;
  iceServers?: SmartHomeIceServer[];
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

/** The current picture as a small JPEG, so the element can keep showing it while it reconnects. */
const captureFrame = (element: HTMLVideoElement | null) => {
  if (!element || element.videoWidth === 0) return undefined;
  try {
    const scale = Math.min(1, 640 / element.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(element.videoWidth * scale);
    canvas.height = Math.round(element.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(element, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  }
};

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
 * A muted live view over WebRTC. The browser makes the offer; Homarr keeps a session with the integration (Home
 * Assistant, Homey) open while the view is shown and passes back the answer and any later ICE candidates. The video
 * itself flows straight from the hub. Ending the view ends the session, and with it the stream.
 */
export default function WebRtcCameraPlayer({
  integrationId,
  entityId,
  iceServers,
  onError,
  onPlaying,
}: WebRtcCameraPlayerProps) {
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

  const apply = async (message: SmartHomeWebRtcMessage) => {
    const peer = connection.current;
    if (!peer) return;
    try {
      if (message.type === "error") {
        reportError.current();
      } else if (message.type === "answer") {
        await peer.setRemoteDescription({ type: "answer", sdp: message.sdp });
        answered.current = true;
        for (const candidate of waiting.current.splice(0)) await peer.addIceCandidate(candidate);
      } else {
        const candidate = {
          candidate: message.candidate,
          sdpMid: message.sdpMid,
          sdpMLineIndex: message.sdpMLineIndex,
        };
        if (answered.current) await peer.addIceCandidate(candidate);
        else waiting.current.push(candidate);
      }
    } catch {
      reportError.current();
    }
  };

  // The session lives exactly as long as this subscription: while the view is shown.
  clientApi.widget.smartHome.cameraWebRtc.useSubscription(offer ? { integrationId, entityId, offer } : skipToken, {
    onData: (message) => void apply(message),
    onError: () => reportError.current(),
  });

  return (
    <video
      ref={video}
      className={classes.cameraVideoHost}
      autoPlay
      muted
      playsInline
      aria-hidden
      onPlaying={() => {
        played.current = true;
        callbacks.current.onPlaying?.();
      }}
    />
  );
}
