"use client";

import { Group, Stack, Text } from "@mantine/core";
import { IconMap, IconMapPin, IconRoute, IconWorld, IconBuildingSkyscraper } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

export default function DawarichStatisticsWidget({
  integrationIds,
  options,
}: WidgetComponentProps<"dawarichStatistics">) {
  const t = useI18n();
  const { data: stats } = clientApi.widget.dawarich.getStatistics.useQuery(
    {
      integrationId: integrationIds[0] ?? "",
    },
    { staleTime: 5 * 60 * 1000 },
  );

  if (!stats) return <WidgetEmptyState />;

  return (
    <Stack gap="md" h="100%" p="md">
      {options.showTotalDistance && (
        <StatItem
          icon={<IconRoute size={20} />}
          label={t("widget.dawarichStatistics.totalDistance")}
          value={`${stats.totalDistanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`}
        />
      )}
      {options.showTotalPoints && (
        <StatItem
          icon={<IconMap size={20} />}
          label={t("widget.dawarichStatistics.totalPoints")}
          value={stats.totalPointsTracked.toLocaleString()}
        />
      )}
      {options.showReverseGeocoded && (
        <StatItem
          icon={<IconMapPin size={20} />}
          label={t("widget.dawarichStatistics.reverseGeocoded")}
          value={stats.totalReverseGeocodedPoints.toLocaleString()}
        />
      )}
      {options.showCountries && (
        <StatItem
          icon={<IconWorld size={20} />}
          label={t("widget.dawarichStatistics.countries")}
          value={stats.totalCountriesVisited.toLocaleString()}
        />
      )}
      {options.showCities && (
        <StatItem
          icon={<IconBuildingSkyscraper size={20} />}
          label={t("widget.dawarichStatistics.cities")}
          value={stats.totalCitiesVisited.toLocaleString()}
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
