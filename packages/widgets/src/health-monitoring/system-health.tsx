"use client";

import { Group } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useByteFormatter } from "@homarr/settings";

import type { WidgetComponentProps } from "../definition";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { NativeSystemHealthView } from "./native-view-system";

export { formatUptime, progressColor, matchFileSystemAndSmart } from "./native-view-system";

export const SystemHealthMonitoring = ({
  options,
  integrationIds,
  width,
  displayMode,
  withScrollArea = true,
}: WidgetComponentProps<"healthMonitoring"> & { withScrollArea?: boolean }) => {
  const healthQuery = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery({ integrationIds });
  const healthResults = getUsableWidgetQueryData(healthQuery) ?? [];
  const healthData = healthResults.filter(
    (entry): entry is typeof entry & { healthInfo: NonNullable<typeof entry.healthInfo> } => entry.healthInfo !== null,
  );
  const board = useRequiredBoard();
  const { formatBytes, formatBytesPair } = useByteFormatter();

  return (
    <NativeSystemHealthView
      options={options}
      width={width}
      displayMode={displayMode}
      withScrollArea={withScrollArea}
      healthData={healthData}
      isPending={isInitialWidgetQueryPending(healthQuery)}
      queryIndicators={
        <Group gap={0}>
          <IntegrationErrorIndicator results={healthResults} />
        </Group>
      }
      itemRadius={board.itemRadius}
      formatBytes={formatBytes}
      formatBytesPair={formatBytesPair}
    />
  );
};
