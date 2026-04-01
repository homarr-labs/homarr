"use client";

import { Stack, Text } from "@mantine/core";

import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import { UmamiContent } from "./umami-content";

export default function UmamiWidget({ options, integrationIds }: WidgetComponentProps<"umami">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  if (!options.websiteId || options.websiteId.trim() === "") {
    return <NoWebsiteConfigured />;
  }

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
