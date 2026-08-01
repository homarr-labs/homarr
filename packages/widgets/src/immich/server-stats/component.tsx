"use client";

import React from "react";
import { Group, Progress, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconDatabase, IconPhoto, IconUsers, IconVideo } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { formatBytes } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../../common/empty-state";
import type { WidgetComponentProps } from "../../definition";
import { setWidgetRuntimeQueries } from "../../definition";
import classes from "./component.module.css";

const MAX_ADVANCED_ALBUMS = 50;

export default function ImmichServerStatsWidget({
  integrationIds,
  options,
  displayMode = "compact",
  width,
  widgetStateRef,
}: WidgetComponentProps<"immich-serverStats">) {
  const t = useI18n();
  const input = { integrationId: integrationIds[0] ?? "" };
  const albumsInput = { ...input, limit: MAX_ADVANCED_ALBUMS };
  const isAdvanced = displayMode === "advanced";
  const albumsEnabled = isAdvanced && integrationIds.length > 0;
  const { data: stats } = clientApi.widget.immich.getServerStats.useQuery(input);
  const { data: albums = [] } = clientApi.widget.immich.getAlbums.useQuery(albumsInput, {
    enabled: albumsEnabled,
    staleTime: 15 * 60 * 1000,
  });
  setWidgetRuntimeQueries(widgetStateRef, [
    { path: ["widget", "immich", "getServerStats"], input },
    ...(albumsEnabled ? [{ path: ["widget", "immich", "getAlbums"], input: albumsInput }] : []),
  ]);

  if (!stats) return <WidgetEmptyState />;

  const statsContent = (
    <SimpleGrid cols={isAdvanced ? (width >= 720 ? 4 : width >= 360 ? 2 : 1) : width >= 320 ? 2 : 1} spacing="sm">
      {options.showUsers && (
        <StatItem icon={<IconUsers size={20} />} label={t("widget.immich-serverStats.users")} value={stats.userCount} />
      )}
      {options.showPhotos && (
        <StatItem
          icon={<IconPhoto size={20} />}
          label={t("widget.immich-serverStats.photos")}
          value={stats.photoCount}
        />
      )}
      {options.showVideos && (
        <StatItem
          icon={<IconVideo size={20} />}
          label={t("widget.immich-serverStats.videos")}
          value={stats.videoCount}
        />
      )}
      {options.showStorage && (
        <StatItem
          icon={<IconDatabase size={20} />}
          label={t("widget.immich-serverStats.storage")}
          value={formatBytes(stats.totalLibraryUsageInBytes)}
        />
      )}
    </SimpleGrid>
  );

  if (!isAdvanced) {
    return (
      <Stack gap="md" h="100%" p="md" justify="center">
        {statsContent}
      </Stack>
    );
  }

  const sortedAlbums = albums;
  const maxAssets = sortedAlbums[0]?.assetCount ?? 1;
  return (
    <Stack gap="lg" h="100%" p="lg">
      {statsContent}
      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        <SimpleGrid cols={width >= 900 ? 2 : 1} spacing="xs">
          {sortedAlbums.map((album) => (
            <Stack key={album.id} gap={4} p="xs">
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" fw={600} truncate>
                  {album.albumName}
                </Text>
                <Text size="xs" c="dimmed">
                  {album.assetCount.toLocaleString()}
                </Text>
              </Group>
              <Progress value={(album.assetCount / Math.max(maxAssets, 1)) * 100} size="sm" />
            </Stack>
          ))}
        </SimpleGrid>
      </ScrollArea>
    </Stack>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <Group justify="space-between" align="center" className={classes.statItem}>
      <Group gap="sm" align="center">
        {icon}
        <Text size="sm" fw={500}>
          {label}
        </Text>
      </Group>
      <Text size="sm" fw={700} c="var(--mantine-primary-color)">
        {value}
      </Text>
    </Group>
  );
}
