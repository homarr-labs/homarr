import { useCallback, useEffect, useRef, useState } from "react";

import type { ImageAttachment } from "./chat-types";

interface UseCameraCaptureOptions {
  onError: (message: string) => void;
  onCapture: (attachment: ImageAttachment) => void;
  captureErrorMessage: string;
}

/**
 * Owns the webcam capture lifecycle: acquiring the stream, attaching it to the
 * <video> the moment it mounts, taking a still frame, and tearing the stream
 * down (including on unmount).
 */
export function useCameraCapture({ onError, onCapture, captureErrorMessage }: UseCameraCaptureOptions) {
  const [captureOpened, setCaptureOpened] = useState(false);
  const captureStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stopCaptureStream = () => {
    captureStreamRef.current?.getTracks().forEach((track) => track.stop());
    captureStreamRef.current = null;
  };

  const openCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      captureStreamRef.current = stream;
      setCaptureOpened(true);
    } catch {
      onError(captureErrorMessage);
    }
  };

  const closeCapture = () => {
    stopCaptureStream();
    setCaptureOpened(false);
  };

  // Attach the live stream the moment the <video> mounts (avoids a ref race
  // where an effect runs before the modal's video element exists).
  const setVideoNode = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && captureStreamRef.current) {
      node.srcObject = captureStreamRef.current;
      void node.play().catch(() => undefined);
    }
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    // Bail if the stream hasn't delivered a frame yet, otherwise we'd capture a
    // 0x0 (blank) canvas and attach an empty image.
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    onCapture({ name: `capture-${Date.now()}.png`, dataUrl: canvas.toDataURL("image/png") });
    closeCapture();
  };

  // Stop the camera stream on unmount.
  useEffect(() => () => stopCaptureStream(), []);

  return { captureOpened, openCapture, closeCapture, setVideoNode, takePhoto };
}
