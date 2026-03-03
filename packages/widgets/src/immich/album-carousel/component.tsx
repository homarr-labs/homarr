"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { Box, Center, Group, Image, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconCalendar } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import classes from "./component.module.css";

export default function ImmichAlbumCarouselWidget({
  integrationIds,
  options,
}: WidgetComponentProps<"immich-albumCarousel">) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  if (!options.albumId) {
    return <NoAlbumSelected />;
  }

  const [album] = clientApi.widget.immich.getAlbum.useSuspenseQuery({
    integrationId: integrationIds[0] ?? "",
    albumId: options.albumId,
  });

  if (album.assets.length === 0) {
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
  assets: {
    id: string;
    deviceAssetId: string;
    originalPath: string;
    fileModifiedAt: string;
    publicLink: string;
  }[];
  currentIndex: number;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
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

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const currentAsset = assets[currentIndex]!;

  return (
    <Box w="100%" h="100%" className={classes.carouselContainer}>
      <Image src={currentAsset.publicLink} alt="Album photo" className={classes.carouselImage} />

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
    </Box>
  );
}

function NoAlbumSelected() {
  const t = useI18n();
  return (
    <Center h="100%">
      <Stack align="center" gap="xs">
        <IconAlertCircle size={32} />
        <Text size="sm" fw={500}>
          {t("widget.immich-albumCarousel.noAlbumSelected")}
        </Text>
      </Stack>
    </Center>
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
