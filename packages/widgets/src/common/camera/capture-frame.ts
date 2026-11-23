/** The current picture as a small JPEG, so a camera view can keep showing it while it reconnects. */
export const captureFrame = (element: HTMLVideoElement | null | undefined) => {
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
