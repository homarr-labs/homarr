"use client";

import { useEffect, useRef } from "react";
import { Anchor, Box, Center, Group, Stack, Title } from "@mantine/core";
import { IconBrandYoutube, IconDeviceCctvOff } from "@tabler/icons-react";
import videojs from "video.js";

import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

import "video.js/dist/video-js.css";

import type Player from "video.js/dist/types/player";

import { createDocumentationLink } from "@homarr/definitions";

export default function VideoWidget({ options, isEditMode }: WidgetComponentProps<"video">) {
  if (options.feedUrl.trim() === "") {
    return <NoUrl />;
  }

  if (isYouTubeUrl(options.feedUrl)) {
    return <ForYoutubeUseIframe />;
  }

  return <Feed options={options} isEditMode={isEditMode} />;
}

export const isYouTubeUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.hostname === "youtu.be" || url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com");
  } catch {
    return false;
  }
};

const NoUrl = () => {
  const t = useI18n("widget.video");

  return (
    <Center h="100%">
      <Stack align="center">
        <IconDeviceCctvOff />
        <Title order={4}>{t("error.noUrl")}</Title>
      </Stack>
    </Center>
  );
};

const ForYoutubeUseIframe = () => {
  const t = useI18n("widget.video");
  const tCommon = useI18n("common");

  return (
    <Center h="100%">
      <Stack align="center" gap="xs">
        <IconBrandYoutube />
        <Title order={4}>{t("error.forYoutubeUseIframe")}</Title>
        <Anchor href={createDocumentationLink("/docs/widgets/iframe")}>{tCommon("action.checkoutDocs")}</Anchor>
      </Stack>
    </Center>
  );
};

const Feed = ({ options, isEditMode }: Pick<WidgetComponentProps<"video">, "options"> & { isEditMode: boolean }) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player>(null);

  useEffect(() => {
    if (playerRef.current) return;
    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered");
    if (classes.video) {
      videoElement.classList.add(classes.video);
    }
    videoRef.current?.appendChild(videoElement);

    playerRef.current = videojs(videoElement, {
      autoplay: options.hasAutoPlay,
      muted: options.isMuted,
      controls: options.hasControls,
      sources: [
        {
          src: options.feedUrl,
        },
      ],
    });
    // All other properties are updated with other useEffect
  }, [videoRef]);

  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.src(options.feedUrl);
  }, [options.feedUrl]);

  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.autoplay(options.hasAutoPlay);
  }, [options.hasAutoPlay]);

  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.muted(options.isMuted);
  }, [options.isMuted]);

  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.controls(!isEditMode && options.hasControls);
  }, [isEditMode, options.hasControls]);

  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <Group justify="center" w="100%" h="100%" pos="relative" style={{ pointerEvents: isEditMode ? "none" : undefined }}>
      <Box w="100%" h="100%" ref={videoRef} />
    </Group>
  );
};
