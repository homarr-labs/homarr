"use client";

import React from "react";
import { Group, Progress, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconDatabase, IconPhoto, IconUsers, IconVideo } from "@tabler/icons-react";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { formatBytes } from "@homarr/common";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../../common/empty-state";
import type { WidgetComponentProps } from "../../definition";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../../common/query-state";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import { useWidgetRuntimeQueries } from "../../runtime-hooks";
import classes from "./component.module.css";

const MAX_ADVANCED_ALBUMS = 50;

export default function ImmichServerStatsWidget({
  integrationIds,
  options,
  displayMode = "compact",
  width,
  height,
  widgetRuntimeRef,
}: WidgetComponentProps<"immich-serverStats">) {
  const t = useI18n("widget.immich-serverStats");
  const locale = useCurrentIntlLocale();
  const input = { integrationId: integrationIds[0] ?? "" };
  const albumsInput = { ...input, limit: MAX_ADVANCED_ALBUMS };
  const isAdvanced = displayMode === "advanced";
  const albumsEnabled = isAdvanced && integrationIds.length > 0;
  const statsQuery = clientApi.widget.immich.getServerStats.useQuery(input);
  const stats = getUsableWidgetQueryData(statsQuery);
  const albumsQuery = clientApi.widget.immich.getAlbums.useQuery(albumsInput, {
    enabled: albumsEnabled,
    staleTime: 15 * 60 * 1000,
  });
  const albums = albumsQuery.data ?? [];
  useWidgetRuntimeQueries(widgetRuntimeRef, [
    getQueryKey(clientApi.widget.immich.getServerStats, input, "query"),
    ...(albumsEnabled ? [getQueryKey(clientApi.widget.immich.getAlbums, albumsInput, "query")] : []),
  ]);

  if (isInitialWidgetQueryPending(statsQuery)) return <WidgetQueryLoadingState />;
  if (!stats) return <WidgetEmptyState />;

  const statVisibility = getImmichStatVisibility(options, isAdvanced);
  const statCount =
    Number(statVisibility.showUsers) +
    Number(statVisibility.showPhotos) +
    Number(statVisibility.showVideos) +
    Number(statVisibility.showStorage);
  const statsLayout = getImmichStatsLayout(width, height, statCount, isAdvanced);

  const statItems = [
    {
      key: "users",
      enabled: statVisibility.showUsers,
      icon: <IconUsers size={statsLayout.dense ? 16 : 18} />,
      label: t("users"),
      value: stats.userCount.toLocaleString(locale),
    },
    {
      key: "photos",
      enabled: statVisibility.showPhotos,
      icon: <IconPhoto size={statsLayout.dense ? 16 : 18} />,
      label: t("photos"),
      value: stats.photoCount.toLocaleString(locale),
    },
    {
      key: "videos",
      enabled: statVisibility.showVideos,
      icon: <IconVideo size={statsLayout.dense ? 16 : 18} />,
      label: t("videos"),
      value: stats.videoCount.toLocaleString(locale),
    },
    {
      key: "storage",
      enabled: statVisibility.showStorage,
      icon: <IconDatabase size={statsLayout.dense ? 16 : 18} />,
      label: t("storage"),
      value: formatBytes(stats.totalLibraryUsageInBytes),
    },
  ]
    .filter((item) => item.enabled)
    .map(({ key, icon, label, value }) => (
      <StatItem key={key} icon={icon} label={label} value={value} dense={statsLayout.dense} />
    ));

  const statsContent =
    isAdvanced || statsLayout.dense ? (
      <SimpleGrid cols={statsLayout.columns} spacing={statsLayout.dense ? 4 : "sm"}>
        {statItems}
      </SimpleGrid>
    ) : (
      <Stack gap="xs">{statItems}</Stack>
    );

  if (!isAdvanced) {
    return (
      <Stack gap="md" h="100%" p={statsLayout.dense ? "xs" : "md"} justify="center" pos="relative">
        {statsContent}
      </Stack>
    );
  }

  const sortedAlbums = albums;
  const maxAssets = sortedAlbums[0]?.assetCount ?? 1;
  return (
    <Stack gap="lg" h="100%" p="lg">
      {statsContent}
      <Group justify="space-between" wrap="nowrap">
        <Text size="xs" c="dimmed">
          {t("albumLimit", { count: MAX_ADVANCED_ALBUMS })}
        </Text>
      </Group>
      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        {isInitialWidgetQueryPending(albumsQuery) ? (
          <WidgetQueryLoadingState />
        ) : albums.length === 0 ? (
          <WidgetEmptyState />
        ) : (
          <SimpleGrid cols={width >= 900 ? 2 : 1} spacing="xs">
            {sortedAlbums.map((album) => (
              <Stack key={album.id} gap={4} p="xs">
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={600} truncate>
                    {album.albumName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {album.assetCount.toLocaleString(locale)}
                  </Text>
                </Group>
                <Progress value={(album.assetCount / Math.max(maxAssets, 1)) * 100} size="sm" />
              </Stack>
            ))}
          </SimpleGrid>
        )}
      </ScrollArea>
    </Stack>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  dense: boolean;
}

function StatItem({ icon, label, value, dense }: StatItemProps) {
  if (dense) {
    return (
      <Stack gap={1} align="center" justify="center" className={classes.statItemDense} title={`${label}: ${value}`}>
        <Text size="sm" fw={700} truncate="end" w="100%" ta="center">
          {value}
        </Text>
        <Text size="xs" c="dimmed" truncate="end" w="100%" ta="center">
          {label}
        </Text>
      </Stack>
    );
  }

  return (
    <Group justify="space-between" align="center" className={classes.statItem}>
      <Group gap="sm" align="center" wrap="nowrap" miw={0}>
        {icon}
        <Text size="sm" fw={500} truncate="end">
          {label}
        </Text>
      </Group>
      <Text size="sm" fw={700} c="var(--mantine-primary-color)" truncate="end" title={String(value)}>
        {value}
      </Text>
    </Group>
  );
}

export const getImmichStatsLayout = (width: number, height: number, itemCount: number, isAdvanced = false) => {
  const count = Math.max(1, itemCount);
  if (isAdvanced) {
    return { columns: width >= 720 ? Math.min(count, 4) : width >= 360 ? Math.min(count, 2) : 1, dense: false };
  }

  const dense = width < 320 || height < 160;
  if (height < 140) return { columns: Math.min(count, width >= 360 ? 4 : 2), dense: true };
  if (height < 220) return { columns: Math.min(count, 2), dense: true };
  return { columns: Math.min(count, width >= 280 ? 2 : 1), dense };
};

export const getImmichStatVisibility = (
  options: WidgetComponentProps<"immich-serverStats">["options"],
  isAdvanced: boolean,
) => ({
  showUsers: isAdvanced || options.showUsers,
  showPhotos: isAdvanced || options.showPhotos,
  showVideos: isAdvanced || options.showVideos,
  showStorage: isAdvanced || options.showStorage,
});
