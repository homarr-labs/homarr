"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Group } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useByteFormatter } from "@homarr/settings";

import type { WidgetComponentProps } from "../definition";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../common/query-state";
import { ADVANCED_HISTORY_SIZE, appendBoundedHistory, NativeSystemResourcesView, toChartItem } from "./native-view";
import type { ChartItem } from "./native-view";

export {
  appendBoundedHistory,
  getCompactChartBudget,
  getNetworkHistory,
  getVisibleSystemCharts,
  toChartItem,
} from "./native-view";

export default function SystemResources({
  integrationIds,
  options,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"systemResources">) {
  const board = useRequiredBoard();
  const { formatBytesPair, formatByteRate } = useByteFormatter();
  const healthQuery = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery({ integrationIds });
  const results = getUsableWidgetQueryData(healthQuery) ?? [];
  const data = results.filter(
    (entry): entry is typeof entry & { healthInfo: NonNullable<typeof entry.healthInfo> } => entry.healthInfo !== null,
  );
  const { dataUpdatedAt, isPending } = healthQuery;
  const integrationKey = useMemo(() => integrationIds.join("\u0000"), [integrationIds]);
  const [historyByIntegration, setHistoryByIntegration] = useState<Record<string, ChartItem[]>>({});
  const previousIntegrationKey = useRef(integrationKey);

  useEffect(() => {
    if (previousIntegrationKey.current === integrationKey) return;
    previousIntegrationKey.current = integrationKey;
    setHistoryByIntegration({});
  }, [integrationKey]);

  const lastUpdatedAt = useRef(dataUpdatedAt);
  useEffect(() => {
    if (dataUpdatedAt === lastUpdatedAt.current) return;
    lastUpdatedAt.current = dataUpdatedAt;
    setHistoryByIntegration((previous) =>
      Object.fromEntries(
        data.map((entry) => {
          const currentItem = toChartItem(entry.healthInfo);
          const seed = previous[entry.integrationId] ?? [currentItem];
          return [entry.integrationId, appendBoundedHistory(seed, currentItem, ADVANCED_HISTORY_SIZE)];
        }),
      ),
    );
  }, [dataUpdatedAt, data]);

  return (
    <NativeSystemResourcesView
      options={options}
      width={width}
      height={height}
      displayMode={displayMode}
      data={data}
      historyByIntegration={historyByIntegration}
      isPending={isPending}
      queryIndicators={
        <Group gap={0}>
          <IntegrationErrorIndicator results={results} />
        </Group>
      }
      presentation={{ itemRadius: board.itemRadius, opacity: board.opacity, formatBytesPair, formatByteRate }}
    />
  );
}
