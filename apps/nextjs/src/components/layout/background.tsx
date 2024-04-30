import { usePathname } from "next/navigation";
import type { AppShellProps } from "@mantine/core";

import { useOptionalBoard } from "~/app/[locale]/boards/(content)/_context";

const supportedVideoFormats = ["mp4", "webm", "ogg"];
const isVideo = (url: string) =>
  supportedVideoFormats.some((format) =>
    url.toLowerCase().endsWith(`.${format}`),
  );

export const useOptionalBackgroundProps = (): Partial<AppShellProps> => {
  const board = useOptionalBoard();
  const pathname = usePathname();

  if (!board?.backgroundImageUrl) return {};

  // Check if we are on a client board page
  if (pathname.split("/").length > 3) return {};

  if (isVideo(board.backgroundImageUrl)) {
    return {};
  }

  return {
    bg: `url(${board?.backgroundImageUrl})`,
    bgp: "center center",
    bgsz: board?.backgroundImageSize ?? "cover",
    bgr: board?.backgroundImageRepeat ?? "no-repeat",
    bga: board?.backgroundImageAttachment ?? "fixed",
  };
};

export const BoardBackgroundVideo = () => {
  const board = useOptionalBoard();

  if (!board?.backgroundImageUrl) return null;
  if (!isVideo(board.backgroundImageUrl)) return null;

  const videoFormat = board.backgroundImageUrl.split(".").pop()?.toLowerCase();

  if (!videoFormat) return null;

  return (
    <video
      autoPlay
      muted
      loop
      style={{
        position: "fixed",
        width: "100vw",
        height: "100vh",
        top: 0,
        left: 0,
        objectFit: board.backgroundImageSize ?? "cover",
      }}
    >
      <source src={board.backgroundImageUrl} type={`video/${videoFormat}`} />
    </video>
  );
};
