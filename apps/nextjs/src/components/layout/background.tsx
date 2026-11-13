import { usePathname } from "next/navigation";
import type { AppShellProps } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";

import { useOptionalBoard } from "@homarr/boards/context";

const supportedVideoFormats = ["mp4", "webm", "ogg"];
const isVideoUrl = (url: string) =>
  supportedVideoFormats.some((format) => url.split(/[?#]/)[0]?.toLowerCase().endsWith(`.${format}`));

export const useIsVideo = (url: string | null | undefined) => {
  const canDetectContentType = Boolean(url && /^(\/|https?:\/\/)/.test(url));
  const extensionIsVideo = Boolean(url && isVideoUrl(url));
  const { data, isError } = useQuery({
    queryKey: ["background-content-type", url],
    // mp4, webm, and ogg already identify a video, so only ambiguous URLs are probed.
    enabled: canDetectContentType && !extensionIsVideo,
    staleTime: Infinity,
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch(url ?? "", {
        method: "HEAD",
        signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
      });
      if (!response.ok) throw new Error(`Background HEAD request failed: ${response.status}`);
      const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
      if (!contentType || contentType === "application/octet-stream") return isVideoUrl(url ?? "");
      return contentType.startsWith("video/");
    },
  });
  if (!canDetectContentType) return false;
  if (extensionIsVideo) return true;
  if (isError) return isVideoUrl(url ?? "");
  // An in-flight probe stays an image until HEAD reports video/*.
  return data ?? false;
};

export const useOptionalBackgroundProps = (): Partial<AppShellProps> => {
  const board = useOptionalBoard();
  const pathname = usePathname();
  const isVideo = useIsVideo(board?.backgroundImageUrl);

  if (!board?.backgroundImageUrl) return {};

  // Check if we are on a client board page
  if (pathname.split("/").length > 3) return {};

  // Keep the image background up while the probe is in flight. Remove it once the URL is a video.
  if (isVideo) {
    return {};
  }

  return {
    bg: `url(${board.backgroundImageUrl})`,
    bgp: "center center",
    bgsz: board.backgroundImageSize,
    bgr: board.backgroundImageRepeat,
    bga: board.backgroundImageAttachment,
  };
};

export const BoardBackgroundVideo = () => {
  const board = useOptionalBoard();
  const isVideo = useIsVideo(board?.backgroundImageUrl);
  const reducedMotion = useReducedMotion(true);

  if (!board?.backgroundImageUrl) return null;
  if (!isVideo) return null;

  return (
    <video
      key={`${board.backgroundImageUrl}:${reducedMotion}`}
      src={board.backgroundImageUrl}
      autoPlay={!reducedMotion}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      style={{
        position: board.backgroundImageAttachment === "fixed" ? "fixed" : "absolute",
        width: "100%",
        height: "100%",
        minHeight: "100vh",
        top: 0,
        left: 0,
        objectFit: board.backgroundImageSize,
        objectPosition: "center center",
        pointerEvents: "none",
      }}
    />
  );
};
