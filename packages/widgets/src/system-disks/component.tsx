"use client";

import { Group } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useByteFormatter } from "@homarr/settings";

import type { WidgetComponentProps } from "../definition";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { filterStorageVolumes, storageDeviceNamesMatch } from "../filter-storage-volumes";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import { NativeSystemDisksView } from "./native-view";

export { clampPercentage, getDisplayText, getAdvancedDisplayTexts } from "./native-view";

export default function SystemResources({
  integrationIds,
  options,
  width,
  displayMode,
}: WidgetComponentProps<"systemDisks">) {
  const board = useRequiredBoard();
  const { formatBytesPair } = useByteFormatter();
  const queryInput = { integrationIds };
  const healthQuery = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery(queryInput);
  const results = getUsableWidgetQueryData(healthQuery) ?? [];
  const data = results.filter(
    (entry): entry is typeof entry & { healthInfo: NonNullable<typeof entry.healthInfo> } => entry.healthInfo !== null,
  );
  const disks = data.flatMap((entry) => {
    const fileSystem = filterStorageVolumes(
      entry.healthInfo.fileSystem,
      options.visibleStorageVolumes,
      entry.integrationId,
    );
    const smart = filterStorageVolumes(entry.healthInfo.smart, options.visibleStorageVolumes, entry.integrationId);
    return fileSystem.map((item) => ({
      integrationId: entry.integrationId,
      integrationName: entry.integrationName,
      item,
      smartItem: smart.find((candidate) => storageDeviceNamesMatch(candidate.deviceName, item.deviceName)),
    }));
  });
  const isPending = isInitialWidgetQueryPending(healthQuery);
  const hasNoFileSystems = data.every((entry) => entry.healthInfo.fileSystem.length === 0);
  const hasFailedSource = results.some((entry) => Boolean(entry.error));
  if (!isPending && data.length > 0 && hasNoFileSystems && !hasFailedSource && !healthQuery.error)
    throw new NoIntegrationDataError();

  return (
    <NativeSystemDisksView
      options={options}
      width={width}
      displayMode={displayMode}
      disks={disks}
      sourceCount={data.length}
      isPending={isPending}
      isEmpty={data.length === 0 || hasNoFileSystems || disks.length === 0}
      queryIndicators={
        <Group gap={0}>
          <IntegrationErrorIndicator results={results} />
        </Group>
      }
      itemRadius={board.itemRadius}
      formatBytesPair={formatBytesPair}
    />
  );
}
