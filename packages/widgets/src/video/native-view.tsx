"use client";

import type { Ref } from "react";
import { Anchor, Box, Center, Group, Stack, Title } from "@mantine/core";
import { IconBrandYoutube, IconDeviceCctvOff } from "@tabler/icons-react";

export type VideoNativeViewProps =
  | { state: "no-url"; message: string }
  | { state: "youtube"; message: string; documentationHref: string; documentationLabel: string }
  | { state: "feed"; isEditMode: boolean; videoRef: Ref<HTMLDivElement> };

export function VideoNativeView(props: VideoNativeViewProps) {
  if (props.state === "no-url") return <NoUrl message={props.message} />;
  if (props.state === "youtube") return <ForYoutubeUseIframe {...props} />;
  return <Feed isEditMode={props.isEditMode} videoRef={props.videoRef} />;
}

export const isYouTubeUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.hostname === "youtu.be" || url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com");
  } catch {
    return false;
  }
};

const NoUrl = ({ message }: { message: string }) => {
  return (
    <Center h="100%">
      <Stack align="center">
        <IconDeviceCctvOff />
        <Title order={4}>{message}</Title>
      </Stack>
    </Center>
  );
};

const ForYoutubeUseIframe = ({
  message,
  documentationHref,
  documentationLabel,
}: {
  message: string;
  documentationHref: string;
  documentationLabel: string;
}) => {
  return (
    <Center h="100%">
      <Stack align="center" gap="xs">
        <IconBrandYoutube />
        <Title order={4}>{message}</Title>
        <Anchor href={documentationHref}>{documentationLabel}</Anchor>
      </Stack>
    </Center>
  );
};

const Feed = ({ isEditMode, videoRef }: { isEditMode: boolean; videoRef: Ref<HTMLDivElement> }) => {
  return (
    <Group justify="center" w="100%" h="100%" pos="relative" style={{ pointerEvents: isEditMode ? "none" : undefined }}>
      <Box w="100%" h="100%" ref={videoRef} />
    </Group>
  );
};
