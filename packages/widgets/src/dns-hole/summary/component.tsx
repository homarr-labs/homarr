"use client";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { zoomCompensatedSize } from "@homarr/ui";

import type { widgetKind } from ".";
import type { WidgetComponentProps } from "../../definition";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../../common/query-state";
import { DnsHoleSummaryStatCard, DnsHoleSummaryView } from "./native-view";
import type { DnsHoleSummaryCardProps } from "./native-view";

export default function DnsHoleSummaryWidget({
  options,
  integrationIds,
  width,
  height,
  displayScale = 1,
}: WidgetComponentProps<typeof widgetKind>) {
  const summaryQuery = clientApi.widget.dnsHole.summary.useQuery({ integrationIds });
  const summaries = getUsableWidgetQueryData(summaryQuery) ?? [];
  return (
    <DnsHoleSummaryView
      options={options}
      summaries={summaries}
      width={width}
      height={height}
      displayScale={displayScale}
      isInitialPending={isInitialWidgetQueryPending(summaryQuery)}
      StatCard={SourceStatCard}
    />
  );
}

function SourceStatCard(props: DnsHoleSummaryCardProps) {
  const board = useRequiredBoard();
  return <DnsHoleSummaryStatCard {...props} itemRadius={board.itemRadius} zoomCompensatedSize={zoomCompensatedSize} />;
}
