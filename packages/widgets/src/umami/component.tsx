"use client";

import { Stack, Text } from "@mantine/core";

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
    {
      path: ["widget", "umami", "getVisitorStats"],
      input: {
        integrationIds,
        websiteId: options.websiteId,
        timeFrame: options.timeFrame,
        eventName: options.eventName || undefined,
      },
    },
    {
      path: ["widget", "umami", "getActiveVisitors"],
      input: { integrationId, websiteId: options.websiteId },
    },
    ...(options.viewMode === "events"
      ? [
          {
            path: ["widget", "umami", "getMultiEventTimeSeries"],
            input: {
              integrationId,
              websiteId: options.websiteId,
              timeFrame: options.timeFrame,
              eventNames: [...options.eventNames].toSorted(),
            },
          },
        ]
      : []),
    ...(displayMode === "advanced" || options.viewMode === "topPages"
      ? [{ path: ["widget", "umami", "getTopPages"], input: commonTopInput }]
      : []),
    ...(displayMode === "advanced" || options.viewMode === "topReferrers"
      ? [{ path: ["widget", "umami", "getTopReferrers"], input: commonTopInput }]
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
