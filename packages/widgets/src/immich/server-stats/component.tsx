"use client";

import { Group, Stack, Text } from "@mantine/core";
import { IconDatabase, IconFileTypeSvg, IconPhoto, IconVideo } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import classes from "./component.module.css";

export default function ImmichServerStatsWidget({
  integrationIds,
  options,
}: WidgetComponentProps<"immich-serverStats">) {
  const t = useScopedI18n("widget.immich.serverStats");
  const [stats] = clientApi.widget.immich.getServerStats.useSuspenseQuery({
    integrationIds,
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Stack gap="md" h="100%" p="md">
      {options.showUsers && stats.userCount !== undefined && (
        <StatItem
          icon={<IconFileTypeSvg size={20} />}
          label={t("users")}
          value={stats.userCount.toString()}
        />
      )}
      {options.showPhotos && stats.photoCount !== undefined && (
        <StatItem
          icon={<IconPhoto size={20} />}
          label={t("photos")}
          value={stats.photoCount.toString()}
        />
      )}
      {options.showVideos && stats.videoCount !== undefined && (
        <StatItem
          icon={<IconVideo size={20} />}
          label={t("videos")}
          value={stats.videoCount.toString()}
        />
      )}
      {options.showStorage && stats.totalLibraryUsageInBytes !== undefined && (
        <StatItem
          icon={<IconDatabase size={20} />}
          label={t("storage")}
          value={formatBytes(stats.totalLibraryUsageInBytes)}
        />
      )}
    </Stack>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
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
