"use client";

import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { useByteFormatter } from "@homarr/settings";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { WidgetEmptyState } from "../../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../../common/query-state";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import type { WidgetComponentProps } from "../../definition";
import { useWidgetRuntimeQueries } from "../../runtime-hooks";
import { ImmichServerStatsView } from "./native-view";

export { getImmichStatsLayout, getImmichStatVisibility } from "./native-view";

export default function ImmichServerStatsWidget({
  integrationIds,
  options,
  displayMode = "compact",
  width,
  height,
  widgetRuntimeRef,
}: WidgetComponentProps<"immich-serverStats">) {
  const t = useI18n("widget.immich-serverStats");
  const { formatBytes } = useByteFormatter();
  const locale = useCurrentIntlLocale();
  const input = { integrationId: integrationIds[0] ?? "" };
  const albumsInput = { ...input, limit: 50 };
  const albumsEnabled = displayMode === "advanced" && integrationIds.length > 0;
  const statsQuery = clientApi.widget.immich.getServerStats.useQuery(input);
  const stats = getUsableWidgetQueryData(statsQuery);
  const albumsQuery = clientApi.widget.immich.getAlbums.useQuery(albumsInput, {
    enabled: albumsEnabled,
    staleTime: 15 * 60 * 1000,
  });
  useWidgetRuntimeQueries(widgetRuntimeRef, [
    getQueryKey(clientApi.widget.immich.getServerStats, input, "query"),
    ...(albumsEnabled ? [getQueryKey(clientApi.widget.immich.getAlbums, albumsInput, "query")] : []),
  ]);

  if (isInitialWidgetQueryPending(statsQuery)) return <WidgetQueryLoadingState />;
  if (!stats) return <WidgetEmptyState />;

  return (
    <ImmichServerStatsView
      stats={stats}
      albums={albumsQuery.data ?? []}
      options={options}
      displayMode={displayMode}
      width={width}
      height={height}
      t={t}
      locale={locale}
      formatBytes={formatBytes}
      zoomCompensatedSize={zoomCompensatedSize}
      albumsPending={isInitialWidgetQueryPending(albumsQuery)}
      loadingState={<WidgetQueryLoadingState />}
      emptyState={<WidgetEmptyState />}
    />
  );
}
