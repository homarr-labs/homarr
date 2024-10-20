"use client";

import { useEffect, useRef } from "react";
import { Anchor, Center, Group, Stack, Title } from "@mantine/core";
import { IconBrandYoutube, IconDeviceCctvOff } from "@tabler/icons-react";
import combineClasses from "clsx";
import videojs from "video.js";

import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

import "video.js/dist/video-js.css";

import { createDocumentationLink } from "@homarr/definitions";

export default function VideoWidget({ options }: WidgetComponentProps<"video">) {
  if (options.feedUrl.trim() === "") {
    return <NoUrl />;
  }

  if (options.feedUrl.trim().startsWith("https://www.youtube.com/watch")) {
    return <ForYoutubeUseIframe />;
  }

  return <Feed options={options} />;
}

const NoUrl = () => {
  const t = useI18n();

  return (
    <Center h="100%">
      <Stack align="center">
        <IconDeviceCctvOff />
        <Title order={4}>{t("widget.video.error.noUrl")}</Title>
      </Stack>
    </Center>
  );
};

const ForYoutubeUseIframe = () => {
  const t = useI18n();

  return (
    <Center h="100%">
      <Stack align="center" gap="xs">
        <IconBrandYoutube />
        <Title order={4}>{t("widget.video.error.forYoutubeUseIframe")}</Title>
        <Anchor href={createDocumentationLink("/docs/widgets/iframe")}>{t("common.action.checkoutDocs")}</Anchor>
      </Stack>
    </Center>
  );
};

const Feed = ({ options }: Pick<WidgetComponentProps<"video">, "options">) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    // Initialize Video.js player if it's not already initialized
    if (!("player" in videoRef.current)) {
      videojs(
        videoRef.current,
        {
          autoplay: options.hasAutoPlay,
          muted: options.isMuted,
          controls: options.hasControls,
        },
        () => undefined,
      );
    }
  }, [options.hasAutoPlay, options.hasControls, options.isMuted, videoRef]);

  return (
    <Group justify="center" w="100%" h="100%" pos="relative">
      <video className={combineClasses("video-js", classes.video)} ref={videoRef}>
        <source src={options.feedUrl} />
      </video>
    </Group>
  );
};
