"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionIcon, Box, Center, Group, Image, ScrollArea, Stack, Text, UnstyledButton } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useI18n, useScopedI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import { WidgetEmptyState } from "../../common/empty-state";
import type { WidgetComponentProps } from "../../definition";
import { useWidgetRuntimeActions } from "../../runtime-hooks";
import { getUsableWidgetQueryData } from "../../common/query-state";
import { WidgetQueryErrorIndicator } from "../../common/query-state-indicator";
import classes from "./component.module.css";
import { ALL_PHOTOS_ALBUM_ID } from "./constants";

export default function ImmichAlbumCarouselWidget({
  integrationIds,
  options,
  displayMode = "compact",
  widgetRuntimeRef,
}: WidgetComponentProps<"immich-albumCarousel">) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const t = useI18n();

  const albumQuery = clientApi.widget.immich.getAlbum.useQuery(
    {
      integrationId: integrationIds[0] ?? "",
      albumId: options.albumId && options.albumId !== ALL_PHOTOS_ALBUM_ID ? options.albumId : undefined,
    },
    { enabled: integrationIds.length > 0 },
  );
  const album = getUsableWidgetQueryData(albumQuery);

  const photoAssets = useMemo(() => {
    const assets = album?.assets.filter((asset) => asset.type === "IMAGE") ?? [];
    return options.randomizePhotos ? shuffle(assets) : assets;
  }, [album?.assets, options.randomizePhotos]);

  useEffect(() => {
    if (photoAssets.length === 0) return;
    setCurrentPhotoIndex((current) => Math.min(current, photoAssets.length - 1));
  }, [photoAssets.length]);

  const previousPhoto = useCallback(
    () => setCurrentPhotoIndex((current) => (current - 1 + photoAssets.length) % photoAssets.length),
    [photoAssets.length],
  );
  const nextPhoto = useCallback(
    () => setCurrentPhotoIndex((current) => (current + 1) % photoAssets.length),
    [photoAssets.length],
  );
  const toggleSlideshow = useCallback(() => setPaused((value) => !value), []);
  useWidgetRuntimeActions(
    widgetRuntimeRef,
    photoAssets.length > 1 ? { previousPhoto, nextPhoto, toggleSlideshow } : {},
  );

  if (!album) return <WidgetEmptyState />;

  return (
    <Box h="100%" pos="relative">
      <Box pos="absolute" top={4} right={8} style={{ zIndex: 3 }}>
        <WidgetQueryErrorIndicator error={albumQuery.error} label={t("widget.immich-albumCarousel.name")} />
      </Box>
      {album.assets.length === 0 || photoAssets.length === 0 ? (
        <NoPhotosInAlbum />
      ) : (
        <Carousel
          assets={photoAssets}
          currentIndex={currentPhotoIndex}
          setCurrentIndex={setCurrentPhotoIndex}
          rotationInterval={options.rotationIntervalSeconds}
          showPhotoInfo={options.showPhotoInfo}
          albumName={album.albumName}
          advanced={displayMode === "advanced"}
          paused={paused}
          setPaused={setPaused}
        />
      )}
    </Box>
  );
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    const random = shuffled[randomIndex];
    if (current === undefined || random === undefined) continue;
    shuffled[index] = random;
    shuffled[randomIndex] = current;
  }
  return shuffled;
}

interface CarouselProps {
  assets: {
    id: string;
    fileModifiedAt: string;
    publicLink: string;
  }[];
  currentIndex: number;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
  rotationInterval: number;
  showPhotoInfo: boolean;
  albumName: string;
  advanced: boolean;
  paused: boolean;
  setPaused: Dispatch<SetStateAction<boolean>>;
}

function Carousel({
  assets,
  currentIndex,
  setCurrentIndex,
  rotationInterval,
  showPhotoInfo,
  albumName,
  advanced,
  paused,
  setPaused,
}: CarouselProps) {
  const t = useScopedI18n("widget.immich-albumCarousel");
  const locale = useCurrentIntlLocale();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (paused || reduceMotion || assets.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % assets.length);
    }, rotationInterval * 1000);

    return () => clearInterval(interval);
  }, [assets.length, paused, reduceMotion, rotationInterval, setCurrentIndex]);

  const safeCurrentIndex = Math.min(currentIndex, assets.length - 1);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const currentAsset = assets[safeCurrentIndex]!;

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
                <IconChevronLeft style={iconSizes.lg} />
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
              {paused ? <IconPlayerPlay style={iconSizes.lg} /> : <IconPlayerPause style={iconSizes.lg} />}
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
                <IconChevronRight style={iconSizes.lg} />
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
              <IconCalendar style={iconSizes.md} />
              <Text size="xs">{new Date(currentAsset.fileModifiedAt).toLocaleDateString(locale)}</Text>
            </Group>
            <Text size="xs" c="dimmed">
              {safeCurrentIndex + 1} / {assets.length}
            </Text>
          </Stack>
        )}
      </Box>
      {advanced && (
        <ScrollArea type="never" scrollbarSize={0} px="xs" py={6}>
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

function NoPhotosInAlbum() {
  const t = useI18n();
  return (
    <Center h="100%">
      <Stack align="center" gap="xs">
        <IconAlertCircle size={32} />
        <Text size="sm" fw={500}>
          {t("widget.immich-albumCarousel.noPhotos")}
        </Text>
      </Stack>
    </Center>
  );
}
