"use client";

import { Stack, Text } from "@mantine/core";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { setWidgetRuntimeQueries } from "../definition";
import { UmamiContent } from "./umami-content";

export default function UmamiWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode = "compact",
  widgetStateRef,
}: WidgetComponentProps<"umami">) {
  if (!options.websiteId || options.websiteId.trim() === "") {
    setWidgetRuntimeQueries(widgetStateRef, []);
    return <NoWebsiteConfigured />;
  }

  const integrationId = integrationIds[0] ?? "";
  const commonTopInput = {
    integrationId,
    websiteId: options.websiteId,
    timeFrame: options.timeFrame,
    limit: options.topCount,
  };
  setWidgetRuntimeQueries(widgetStateRef, [
    getQueryKey(
      clientApi.widget.umami.getVisitorStats,
      {
        integrationIds,
        websiteId: options.websiteId,
        timeFrame: options.timeFrame,
        eventName: options.eventName || undefined,
      },
      "query",
    ),
    getQueryKey(clientApi.widget.umami.getActiveVisitors, { integrationId, websiteId: options.websiteId }, "query"),
    ...(options.viewMode === "events" && options.eventNames.length > 0
      ? [
          getQueryKey(
            clientApi.widget.umami.getMultiEventTimeSeries,
            {
              integrationId,
              websiteId: options.websiteId,
              timeFrame: options.timeFrame,
              eventNames: [...options.eventNames].toSorted(),
            },
            "query",
          ),
        ]
      : []),
    ...(displayMode === "advanced" || options.viewMode === "topPages"
      ? [getQueryKey(clientApi.widget.umami.getTopPages, commonTopInput, "query")]
      : []),
    ...(displayMode === "advanced" || options.viewMode === "topReferrers"
      ? [getQueryKey(clientApi.widget.umami.getTopReferrers, commonTopInput, "query")]
      : []),
  ]);

  return (
    <UmamiContent
      integrationIds={integrationIds}
      websiteId={options.websiteId}
      timeFrame={options.timeFrame}
      eventName={options.eventName || undefined}
      eventNames={options.eventNames}
      chartStyle={options.chartStyle}
      chartType={options.chartType}
      viewMode={options.viewMode}
      topCount={options.topCount}
      width={width}
      height={height}
      displayMode={displayMode}
    />
  );
}

function NoWebsiteConfigured() {
  const t = useScopedI18n("widget.umami");
  return (
    <Stack align="center" justify="center" h="100%">
      <Text c="dimmed" size="sm">
        {t("error.noWebsite")}
      </Text>
    </Stack>
  );
}
