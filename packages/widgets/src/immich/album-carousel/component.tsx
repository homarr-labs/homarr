"use client";

import { useEffect, useState } from "react";
import { Box, Center, Group, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconCalendar } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import classes from "./component.module.css";

export default function ImmichAlbumCarouselWidget({
  integrationIds,
  options,
}: WidgetComponentProps<"immich-albumCarousel">) {
  const t = useScopedI18n("widget.immich.albumCarousel");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  if (!options.albumId) {
    return <NoAlbumSelected />;
  }

  const [album] = clientApi.widget.immich.getAlbum.useSuspenseQuery({
    integrationIds,
    albumId: options.albumId,
  });

  if (!album.assets || album.assets.length === 0) {
    return <NoPhotosInAlbum />;
  }

  const photoAssets = album.assets.filter((asset) => asset.type === "IMAGE");

  if (photoAssets.length === 0) {
    return <NoPhotosInAlbum />;
  }

  return (
    <Carousel
      assets={photoAssets}
      currentIndex={currentPhotoIndex}
      setCurrentIndex={setCurrentPhotoIndex}
      rotationInterval={options.rotationIntervalSeconds}
      showPhotoInfo={options.showPhotoInfo}
    />
  );
}

interface CarouselProps {
  assets: Array<{
    id: string;
    deviceAssetId: string;
    originalPath: string;
    fileModifiedAt: string;
  }>;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  rotationInterval: number;
  showPhotoInfo: boolean;
}

function Carousel({ assets, currentIndex, setCurrentIndex, rotationInterval, showPhotoInfo }: CarouselProps) {
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % assets.length);
    }, rotationInterval * 1000);

    return () => clearInterval(interval);
  }, [assets.length, rotationInterval, setCurrentIndex]);

  const currentAsset = assets[currentIndex];
  const imageUrl = `/api/immich/${currentAsset.id}/thumbnail`;

  return (
    <Box w="100%" h="100%" className={classes.carouselContainer}>
      <Box
        component="img"
        src={imageUrl}
        alt="Album photo"
        className={classes.carouselImage}
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          img.style.display = "none";
        }}
      />

      {showPhotoInfo && (
        <Stack gap="xs" className={classes.photoInfo} p="md">
          <Group gap="xs">
            <IconCalendar size={16} />
            <Text size="xs">{new Date(currentAsset.fileModifiedAt).toLocaleDateString()}</Text>
          </Group>
          <Text size="xs" c="dimmed">
            {currentIndex + 1} / {assets.length}
          </Text>
        </Stack>
      )}

      <Group gap="xs" className={classes.dots} justify="center" p="sm">
        {assets.map((_, index) => (
          <Box
            key={index}
            className={classes.dot}
            data-active={index === currentIndex}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </Group>
    </Box>
  );
}

function NoAlbumSelected() {
  const t = useScopedI18n("widget.immich.albumCarousel");
  return (
    <Center h="100%">
      <Stack align="center" gap="xs">
        <IconAlertCircle size={32} />
        <Text size="sm" fw={500}>
          {t("error.noAlbumSelected")}
        </Text>
      </Stack>
    </Center>
  );
}

function NoPhotosInAlbum() {
  const t = useScopedI18n("widget.immich.albumCarousel");
  return (
    <Center h="100%">
      <Stack align="center" gap="xs">
        <IconAlertCircle size={32} />
        <Text size="sm" fw={500}>
          {t("error.noPhotos")}
        </Text>
      </Stack>
    </Center>
  );
}
