"use client";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useModalAction } from "@homarr/modals";
import { useByteFormatter } from "@homarr/settings";

import type { WidgetComponentProps } from "../definition";
import { useBeszelFilteredSystems } from "../beszel/_shared/hooks";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../common/query-state";
import { BeszelSystemStatsModal } from "../beszel/_shared/system-stats-modal";
import { NativeBeszelSystemGridView } from "./native-view";

export default function BeszelSystemGridWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"beszelSystemGrid">) {
  const board = useRequiredBoard();
  const { openModal } = useModalAction(BeszelSystemStatsModal);
  const { formatByteRate, formatBytes } = useByteFormatter();
  const systemsQuery = clientApi.widget.beszel.getSystems.useQuery({ integrationIds });
  const results = getUsableWidgetQueryData(systemsQuery) ?? [];
  const integrationNames = new Map(results.map((result) => [result.integrationId, result.integrationName]));
  const filteredSystems = useBeszelFilteredSystems(results, options.statusFilter);

  return (
    <NativeBeszelSystemGridView
      options={options}
      isEditMode={isEditMode}
      width={width}
      height={height}
      displayMode={displayMode}
      filteredSystems={filteredSystems}
      integrationNames={integrationNames}
      isPending={systemsQuery.isPending}
      queryIndicators={<IntegrationErrorIndicator results={results} />}
      itemRadius={board.itemRadius}
      formatByteRate={formatByteRate}
      formatBytes={formatBytes}
      onOpenSystem={(input, title) => openModal(input, { title })}
    />
  );
}
