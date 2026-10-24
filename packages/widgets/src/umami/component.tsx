"use client";

import { Stack, Text } from "@mantine/core";
import { definition } from ".";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { getWidgetDataQueries, getWidgetDataQueryKey } from "../data";
import { UmamiContent } from "./umami-content";

export default function UmamiWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode = "compact",
  displayScale = 1,
  widgetRuntimeRef,
}: WidgetComponentProps<"umami">) {
  let responsiveWidth = width;
  let responsiveHeight = height;
  if (displayMode !== "advanced") {
    responsiveWidth *= displayScale;
    responsiveHeight *= displayScale;
  }
  const queries = definition.data.queries({ options, integrationIds, displayMode });
  const hasWebsite = Boolean(options.websiteId?.trim());
  useWidgetRuntimeQueries(widgetRuntimeRef, getWidgetDataQueries(queries).map(getWidgetDataQueryKey));

  if (!hasWebsite) return <NoWebsiteConfigured />;

  return (
    <UmamiContent
      queries={queries}
      timeFrame={options.timeFrame}
      eventNames={options.eventNames}
      chartStyle={options.chartStyle}
      chartType={options.chartType}
      viewMode={options.viewMode}
      width={responsiveWidth}
      height={responsiveHeight}
      displayMode={displayMode}
    />
  );
}

function NoWebsiteConfigured() {
  const t = useI18n("widget.umami");
  return (
    <Stack align="center" justify="center" h="100%">
      <Text c="dimmed" size="sm">
        {t("error.noWebsite")}
      </Text>
    </Stack>
  );
}
