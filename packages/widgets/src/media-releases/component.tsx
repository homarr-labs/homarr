"use client";

import { clientApi } from "@homarr/api/client";
import { getMantineColor, toValidDate } from "@homarr/common";
import { getIconUrl } from "@homarr/definitions";
import { mediaTypeConfigurations } from "@homarr/integrations/types";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import { OverflowBadge } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import { MediaReleasesView } from "./native-view";

export default function MediaReleasesWidget({
  options,
  integrationIds,
  width,
  displayMode,
}: WidgetComponentProps<"mediaReleases">) {
  const releasesQuery = clientApi.widget.mediaRelease.getMediaReleases.useQuery({ integrationIds });
  const response = getUsableWidgetQueryData(releasesQuery);
  const t = useI18n("widget.mediaReleases");
  const locale = useCurrentIntlLocale();
  if (isInitialWidgetQueryPending(releasesQuery)) return <WidgetQueryLoadingState />;
  if (!response) return <WidgetEmptyState />;
  return (
    <MediaReleasesView
      response={response}
      options={options}
      width={width}
      displayMode={displayMode}
      t={t}
      locale={locale}
      emptyState={<WidgetEmptyState />}
      queryIndicators={<IntegrationErrorIndicator results={response.failedIntegrations} />}
      bindings={{
        getMantineColor,
        toValidDate,
        getIconUrl,
        mediaTypeConfigurations,
        OverflowBadge,
        getSafeApplicationUrl,
        SAFE_NEW_TAB_REL,
      }}
    />
  );
}
