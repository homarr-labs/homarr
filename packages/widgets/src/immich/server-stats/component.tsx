"use client";

import React from "react";
import { Group, Stack, Text } from "@mantine/core";
import { IconDatabase, IconPhoto, IconUsers, IconVideo } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { humanFileSize } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import classes from "./component.module.css";

export default function ImmichServerStatsWidget({
  integrationIds,
  options,
}: WidgetComponentProps<"immich-serverStats">) {
  const t = useI18n();
  const [stats] = clientApi.widget.immich.getServerStats.useSuspenseQuery({
    integrationId: integrationIds[0] ?? "",
  });

  return (
    <Stack gap="md" h="100%" p="md">
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
          value={humanFileSize(stats.totalLibraryUsageInBytes)}
        />
      )}
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
