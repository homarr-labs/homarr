"use client";

import type { Dispatch, SetStateAction } from "react";
import { ActionIcon, Box, Center, Group, Image, ScrollArea, Stack, Text, UnstyledButton } from "@mantine/core";
import {
  IconAlertCircle,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";

import type { ScopedTranslationFunction } from "@homarr/translation";
import type { CSSProperties } from "react";
import classes from "./component.module.css";

export interface ImmichAlbumCarouselViewProps {
  assets: {
    id: string;
    fileModifiedAt: string;
    publicLink: string;
  }[];
  currentIndex: number;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
  showPhotoInfo: boolean;
  albumName: string;
  advanced: boolean;
  paused: boolean;
  setPaused: Dispatch<SetStateAction<boolean>>;
  t: ScopedTranslationFunction<"widget.immich-albumCarousel">;
  locale: string;
  noPhotosIconStyle: CSSProperties;
}

export function ImmichAlbumCarouselView({
  assets,
  currentIndex,
  setCurrentIndex,
  showPhotoInfo,
  albumName,
  advanced,
  paused,
  setPaused,
  t,
  locale,
  noPhotosIconStyle,
}: ImmichAlbumCarouselViewProps) {
  const safeCurrentIndex = Math.min(currentIndex, assets.length - 1);
  const currentAsset = assets[safeCurrentIndex];
  if (!currentAsset) return <ImmichNoPhotosView t={t} iconStyle={noPhotosIconStyle} />;

  const move = (offset: number) => setCurrentIndex((current) => (current + offset + assets.length) % assets.length);

  return (
    <Stack w="100%" h="100%" gap={0}>
      <Box w="100%" style={{ flex: 1, minHeight: 0 }} className={classes.carouselContainer}>
        <Image
          src={currentAsset.publicLink}
          alt={t("albumPhoto")}
          className={classes.carouselImage}
          data-fit={advanced ? "contain" : "cover"}
        />

        {assets.length > 1 && (
          <Group
            className={classes.carouselControls}
            data-visible={advanced || paused || undefined}
            gap={4}
            wrap="nowrap"
          >
            {advanced && (
              <ActionIcon
                aria-label={t("actions.previousPhoto")}
                variant="filled"
                color="dark"
                radius="xl"
                size={40}
                onClick={() => move(-1)}
              >
                <IconChevronLeft size="var(--mantine-font-size-lg)" />
              </ActionIcon>
            )}
            <ActionIcon
              aria-label={paused ? t("actions.resumeSlideshow") : t("actions.pauseSlideshow")}
              variant="filled"
              color="dark"
              radius="xl"
              size={advanced ? 40 : 32}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? (
                <IconPlayerPlay size="var(--mantine-font-size-lg)" />
              ) : (
                <IconPlayerPause size="var(--mantine-font-size-lg)" />
              )}
            </ActionIcon>
            {advanced && (
              <ActionIcon
                aria-label={t("actions.nextPhoto")}
                variant="filled"
                color="dark"
                radius="xl"
                size={40}
                onClick={() => move(1)}
              >
                <IconChevronRight size="var(--mantine-font-size-lg)" />
              </ActionIcon>
            )}
          </Group>
        )}

        {(showPhotoInfo || advanced) && (
          <Stack gap="xs" className={classes.photoInfo} p="md">
            {albumName && (
              <Text size="xs" fw={600}>
                {albumName}
              </Text>
            )}
            <Group gap="xs">
              <IconCalendar size="var(--mantine-font-size-md)" />
              <Text size="xs">{new Date(currentAsset.fileModifiedAt).toLocaleDateString(locale)}</Text>
            </Group>
            <Text size="xs" c="dimmed">
              {safeCurrentIndex + 1} / {assets.length}
            </Text>
          </Stack>
        )}
      </Box>
      {advanced && (
        <ScrollArea px="xs" py={6}>
          <Group gap={6} wrap="nowrap">
            {assets.map((asset, index) => (
              <UnstyledButton
                key={asset.id}
                onClick={() => setCurrentIndex(index)}
                aria-label={t("actions.photo", { number: index + 1 })}
                aria-pressed={index === safeCurrentIndex}
                aria-current={index === safeCurrentIndex ? "true" : undefined}
              >
                <Image
                  src={asset.publicLink}
                  alt=""
                  loading="lazy"
                  w={64}
                  h={44}
                  radius="sm"
                  fit="cover"
                  style={{ opacity: index === currentIndex ? 1 : 0.55 }}
                />
              </UnstyledButton>
            ))}
          </Group>
        </ScrollArea>
      )}
    </Stack>
  );
}

export function ImmichNoPhotosView({
  t,
  iconStyle,
}: {
  t: ImmichAlbumCarouselViewProps["t"];
  iconStyle: CSSProperties;
}) {
  return (
    <Center h="100%">
      <Stack align="center" gap="xs">
        <IconAlertCircle style={iconStyle} />
        <Text size="sm" fw={500}>
          {t("noPhotos")}
        </Text>
      </Stack>
    </Center>
  );
}
