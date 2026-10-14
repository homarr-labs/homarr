"use client";

import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { getUsableWidgetQueryData } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import { MediaMissingView } from "./native-view";

export default function MediaMissingWidget({
  integrationIds,
  options,
  width,
  displayMode,
  widgetRuntimeRef,
}: WidgetComponentProps<"mediaMissing">) {
  const t = useI18n("widget.mediaMissing");
  const pageSize = displayMode === "advanced" ? Math.max(Number(options.pageSize), 50) : Number(options.pageSize);
  const input = { integrationIds, pageSize };
  useWidgetRuntimeQueries(widgetRuntimeRef, [getQueryKey(clientApi.widget.mediaOrganizer.getData, input, "query")]);
  const mediaQuery = clientApi.widget.mediaOrganizer.getData.useQuery(input, {
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const data = getUsableWidgetQueryData(mediaQuery);
  if (data?.length === 0) throw new NoIntegrationDataError();
  return (
    <MediaMissingView
      data={data}
      emptyState={<WidgetEmptyState />}
      options={options}
      width={width}
      displayMode={displayMode}
      t={t}
      bindings={{ getSafeApplicationUrl, SAFE_NEW_TAB_REL, zoomCompensatedSize }}
    />
  );
}
