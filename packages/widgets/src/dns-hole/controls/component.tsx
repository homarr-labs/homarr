"use client";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { MaskedOrNormalImage } from "@homarr/ui";

import type { widgetKind } from ".";
import type { WidgetComponentProps } from "../../definition";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../../common/query-state";
import { DnsHoleControlsView } from "./native-view";

type DnsSummaryResult = RouterOutputs["widget"]["dnsHole"]["summary"][number];
type AvailableDnsSummaryResult = DnsSummaryResult & {
  summary: NonNullable<DnsSummaryResult["summary"]>;
  integration: DnsSummaryResult["integration"] & { updatedAt: Date };
};

const isAvailableDnsSummaryResult = (result: DnsSummaryResult): result is AvailableDnsSummaryResult =>
  result.summary !== null && result.integration.updatedAt !== undefined;

export default function DnsHoleControlsWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  displayMode,
}: WidgetComponentProps<typeof widgetKind>) {
  const board = useRequiredBoard();
  const integrationsWithInteractions = useIntegrationsWithInteractAccess()
    .map(({ id }) => id)
    .filter((id) => integrationIds.includes(id));
  const summaryQuery = clientApi.widget.dnsHole.summary.useQuery({ integrationIds });
  const summaryResults = getUsableWidgetQueryData(summaryQuery) ?? [];
  const summaries = summaryResults.filter(isAvailableDnsSummaryResult);
  const utils = clientApi.useUtils();
  const {
    mutateAsync: enableDns,
    isPending: isEnabling,
    error: enableError,
  } = clientApi.widget.dnsHole.enable.useMutation({ onSettled: () => void utils.widget.dnsHole.summary.invalidate() });
  const {
    mutateAsync: disableDns,
    isPending: isDisabling,
    error: disableError,
  } = clientApi.widget.dnsHole.disable.useMutation({ onSettled: () => void utils.widget.dnsHole.summary.invalidate() });
  const toggleDns = async (integrationId: string) => {
    const integrationStatus = summaries.find(({ integration }) => integration.id === integrationId);
    if (!integrationStatus?.summary.status) return;
    utils.widget.dnsHole.summary.setData({ integrationIds }, (prevData) => {
      if (!prevData) return [];
      return prevData.map((item) =>
        item.integration.id === integrationId && item.summary
          ? { ...item, summary: { ...item.summary, status: undefined } }
          : item,
      );
    });
    if (integrationStatus.summary.status === "enabled") await disableDns({ integrationId, duration: 0 });
    else await enableDns({ integrationId });
  };
  const integrationsSummaries = summaries.reduce<{ enabled: string[]; disabled: string[] }>(
    (acc, { summary, integration: { id } }) =>
      integrationsWithInteractions.includes(id) && summary.status != null ? (acc[summary.status].push(id), acc) : acc,
    { enabled: [], disabled: [] },
  );
  return (
    <DnsHoleControlsView
      options={options}
      isEditMode={isEditMode}
      width={width}
      displayMode={displayMode}
      summaries={summaries}
      summaryResults={summaryResults}
      integrationsWithInteractions={integrationsWithInteractions}
      integrationsSummaries={integrationsSummaries}
      mutationPending={isEnabling || isDisabling}
      actionError={enableError ?? disableError}
      isInitialPending={isInitialWidgetQueryPending(summaryQuery)}
      toggleDns={toggleDns}
      disableDns={disableDns}
      itemRadius={board.itemRadius}
      hasIconColor={board.iconColor !== null}
      MaskedOrNormalImage={MaskedOrNormalImage}
    />
  );
}
