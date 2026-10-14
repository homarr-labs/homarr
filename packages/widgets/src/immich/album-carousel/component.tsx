"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Box } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import { WidgetEmptyState } from "../../common/empty-state";
import type { WidgetComponentProps } from "../../definition";
import { useWidgetRuntimeActions } from "../../runtime-hooks";
import { getUsableWidgetQueryData } from "../../common/query-state";
import { ALL_PHOTOS_ALBUM_ID } from "./constants";
import { ImmichAlbumCarouselView, ImmichNoPhotosView } from "./native-view";
import type { ImmichAlbumCarouselViewProps } from "./native-view";

export default function ImmichAlbumCarouselWidget({
  integrationIds,
  options,
  displayMode = "compact",
  widgetRuntimeRef,
}: WidgetComponentProps<"immich-albumCarousel">) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [firstPreviewPhoto, setFirstPreviewPhoto] = useState<{ albumId: string; assetId: string } | null>(null);
  const t = useI18n("widget.immich-albumCarousel");
  const locale = useCurrentIntlLocale();
  let albumId: string | undefined;
  if (options.albumId && options.albumId !== ALL_PHOTOS_ALBUM_ID) albumId = options.albumId;
  const integrationId = integrationIds[0] ?? "";
  const albumQuery = clientApi.widget.immich.getAlbum.useQuery(
    { integrationId, albumId },
    { enabled: integrationIds.length > 0 },
  );
  const previewQuery = clientApi.widget.immich.getAlbumPreview.useQuery(
    { integrationId, albumId: albumId ?? "", randomizePhotos: options.randomizePhotos },
    { enabled: integrationIds.length > 0 && albumId !== undefined },
  );
  const fullAlbum = getUsableWidgetQueryData(albumQuery);
  const preview = previewQuery.data;
  const album = fullAlbum ?? preview;

  useEffect(() => {
    const asset = preview?.assets[0];
    if (!albumId || !asset || fullAlbum || firstPreviewPhoto?.albumId === albumId) return;
    setFirstPreviewPhoto({ albumId, assetId: asset.id });
  }, [albumId, firstPreviewPhoto?.albumId, fullAlbum, preview?.assets]);

  const photoAssets = useMemo(() => {
    const assets = album?.assets.filter((asset) => asset.type === "IMAGE") ?? [];
    if (!options.randomizePhotos) return assets;
    const randomized = shuffle(assets);
    if (!fullAlbum || !firstPreviewPhoto || firstPreviewPhoto.albumId !== albumId) return randomized;
    const first = randomized.find((asset) => asset.id === firstPreviewPhoto.assetId);
    if (!first) return randomized;
    return [first, ...randomized.filter((asset) => asset.id !== first.id)];
  }, [album?.assets, albumId, firstPreviewPhoto, fullAlbum, options.randomizePhotos]);

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

  if (!album || (!fullAlbum && album.assets.length === 0)) return <WidgetEmptyState />;

  return (
    <Box h="100%" pos="relative">
      {photoAssets.length === 0 ? (
        <ImmichNoPhotosView t={t} iconStyle={iconSizes.xl} />
      ) : (
        <CarouselProducer
          assets={photoAssets}
          currentIndex={currentPhotoIndex}
          setCurrentIndex={setCurrentPhotoIndex}
          rotationInterval={options.rotationIntervalSeconds}
          showPhotoInfo={options.showPhotoInfo}
          albumName={album.albumName}
          advanced={displayMode === "advanced"}
          paused={paused}
          setPaused={setPaused}
          t={t}
          locale={locale}
          noPhotosIconStyle={iconSizes.xl}
        />
      )}
    </Box>
  );
}

function CarouselProducer({
  rotationInterval,
  ...props
}: ImmichAlbumCarouselViewProps & {
  rotationInterval: number;
}) {
  const reduceMotion = useReducedMotion();
  const { assets, paused, setCurrentIndex } = props;
  useEffect(() => {
    if (paused || reduceMotion || assets.length <= 1) return;
    const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % assets.length), rotationInterval * 1000);
    return () => clearInterval(interval);
  }, [assets.length, paused, reduceMotion, rotationInterval, setCurrentIndex]);
  return <ImmichAlbumCarouselView {...props} />;
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
