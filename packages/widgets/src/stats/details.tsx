import { Avatar, Group, Text } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { useI18n } from "@homarr/translation/client";

import { formatStatsValue } from "./format";
import { StatsLoading } from "./loading";
import classes from "./stats.module.css";

export type StatsCatalog = RouterOutputs["widget"]["stats"]["catalog"];
export type StatsSnapshot = RouterOutputs["widget"]["stats"]["snapshot"];

export function StatsDetails({
  catalog,
  snapshot,
  selected,
  compact = false,
  showIcon = true,
  unavailable = false,
  refreshFailed = false,
}: {
  catalog: StatsCatalog;
  snapshot?: StatsSnapshot;
  selected?: string;
  compact?: boolean;
  showIcon?: boolean;
  unavailable?: boolean;
  refreshFailed?: boolean;
}) {
  const t = useI18n("widget.stats");
  let metrics = catalog.metrics;
  if (selected) {
    metrics = [
      ...catalog.metrics.filter((metric) => metric.key === selected),
      ...catalog.metrics.filter((metric) => metric.key !== selected),
    ].slice(0, 8);
  }
  const remaining = catalog.metrics.length - metrics.length;
  let status = "";
  if (snapshot?.error || refreshFailed) status = t("refreshFailed");
  if ((snapshot?.error || refreshFailed) && snapshot?.updatedAt == null) status = t("fetchFailed");
  if (unavailable) status = t("unavailable");
  const loading = !unavailable && !refreshFailed && !snapshot?.error && snapshot?.updatedAt == null;
  let loaderIcon: string | undefined;
  if (showIcon) loaderIcon = catalog.iconUrl;
  return (
    <div className={classes.providerDetails}>
      <Group gap={8} wrap="nowrap" mb={12}>
        {showIcon && (
          <Avatar
            src={catalog.iconUrl}
            size={12}
            radius={2}
            alt=""
            imageProps={{ referrerPolicy: "no-referrer" }}
            styles={{ image: { objectFit: "contain" } }}
          />
        )}
        <Text size="xs" fw={600} truncate>
          {catalog.name}
        </Text>
      </Group>
      <dl className={classes.metrics}>
        {metrics.map((metric) => {
          let value = "—";
          if (snapshot) value = formatStatsValue(snapshot.values[metric.key], metric.unit, compact);
          const metricUnavailable = unavailable || snapshot?.unavailableMetrics?.includes(metric.key);
          if (metricUnavailable) value = t("unavailable");
          return (
            <div key={metric.key} className={classes.metricRow} data-selected={metric.key === selected || undefined}>
              <dt>{metric.label}</dt>
              <dd aria-busy={loading}>
                {loading && <StatsLoading iconUrl={loaderIcon} source={catalog.name} size={18} />}
                {!loading && value}
              </dd>
            </div>
          );
        })}
      </dl>
      {remaining > 0 && (
        <Text size="xs" c="dimmed" mt={10}>
          {t("moreMetrics", { count: remaining })}
        </Text>
      )}
      {status && (
        <Text size="xs" c="orange" mt={10}>
          {status}
        </Text>
      )}
    </div>
  );
}
