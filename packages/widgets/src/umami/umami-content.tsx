"use client";

import { clientApi } from "@homarr/api/client";

import { NativeUmamiView } from "./native-view";
import type { UmamiContentProps } from "./native-view-types";
import { UmamiTopPagesContent, UmamiTopReferrersContent } from "./umami-top-list";
import { EVENT_COLORS, formatTimeFrameLabel, formatXLabel, useUmamiQueryOptions } from "./umami-utils";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";

export function UmamiContent({
  integrationIds,
  websiteId,
  timeFrame,
  eventName,
  eventNames,
  chartStyle,
  chartType,
  viewMode,
  topCount,
  width,
  height,
  displayMode,
}: UmamiContentProps) {
  const umamiQueryOptions = useUmamiQueryOptions();
  const statsQuery = clientApi.widget.umami.getVisitorStats.useQuery(
    { integrationIds, websiteId, timeFrame, eventName },
    umamiQueryOptions,
  );
  const results = getUsableWidgetQueryData(statsQuery);
  const activeVisitorsInput = { integrationId: integrationIds[0] ?? "", websiteId };
  const activeVisitorsQuery = clientApi.widget.umami.getActiveVisitors.useQuery(activeVisitorsInput, umamiQueryOptions);
  const activeVisitors = activeVisitorsQuery.data;
  const multiEventQuery = clientApi.widget.umami.getMultiEventTimeSeries.useQuery(
    { integrationId: integrationIds[0] ?? "", websiteId, timeFrame, eventNames: [...eventNames].toSorted() },
    { enabled: viewMode === "events" && eventNames.length > 0, ...umamiQueryOptions },
  );
  const multiEventSeries = getUsableWidgetQueryData(multiEventQuery);

  return (
    <NativeUmamiView
      timeFrame={timeFrame}
      eventName={eventName}
      eventNames={eventNames}
      chartStyle={chartStyle}
      chartType={chartType}
      viewMode={viewMode}
      width={width}
      height={height}
      displayMode={displayMode}
      results={results}
      activeVisitors={activeVisitors}
      multiEventSeries={multiEventSeries}
      isPending={isInitialWidgetQueryPending(statsQuery)}
      formatXLabel={formatXLabel}
      formatTimeFrameLabel={formatTimeFrameLabel}
      eventColors={EVENT_COLORS}
      renderTopPages={() => (
        <UmamiTopPagesContent
          integrationIds={integrationIds}
          websiteId={websiteId}
          timeFrame={timeFrame}
          limit={topCount}
        />
      )}
      renderTopReferrers={() => (
        <UmamiTopReferrersContent
          integrationIds={integrationIds}
          websiteId={websiteId}
          timeFrame={timeFrame}
          limit={topCount}
        />
      )}
    />
  );
}
