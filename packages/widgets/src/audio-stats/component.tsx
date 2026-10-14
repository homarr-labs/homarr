"use client";

import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { formatDuration } from "@homarr/common";
import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import type { WidgetComponentProps } from "../definition";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { AUDIO_STATS_TRANSLATION_SCOPE, getGridCols, getIconSize, getVisibleStats } from "./shared";
import { AudioStatsView } from "./native-view";

export default function AudioStatsWidget({
  integrationIds,
  options,
  width,
  height,
  displayScale = 1,
  displayMode = "compact",
  widgetRuntimeRef,
}: WidgetComponentProps<"audioStats">) {
  const { formatBytes } = useByteFormatter();
  const t = useI18n(AUDIO_STATS_TRANSLATION_SCOPE);
  const statsInput = { integrationId: integrationIds[0] ?? "" };
  const { data: response, error: statsError } = clientApi.widget.audioStats.getStats.useQuery(statsInput);
  const streamsInput = { integrationIds: [statsInput.integrationId], showOnlyPlaying: true };
  const streamsEnabled = displayMode === "advanced" && response?.kind === "navidrome";
  const { data: streamResults, error: streamsError } = clientApi.widget.mediaServer.getCurrentStreams.useQuery(
    streamsInput,
    { enabled: streamsEnabled },
  );
  useWidgetRuntimeQueries(widgetRuntimeRef, [
    getQueryKey(clientApi.widget.audioStats.getStats, statsInput, "query"),
    ...(streamsEnabled ? [getQueryKey(clientApi.widget.mediaServer.getCurrentStreams, streamsInput, "query")] : []),
  ]);
  if (statsError && response === undefined) throw statsError;
  if (streamsEnabled && streamsError && streamResults === undefined) throw streamsError;
  if (!response) return <WidgetEmptyState />;
  const currentStreams = streamResults ?? [];
  return (
    <AudioStatsView
      response={response}
      currentStreams={currentStreams}
      options={options}
      width={width}
      height={height}
      displayScale={displayScale}
      displayMode={displayMode}
      formatDuration={formatDuration}
      formatBytes={formatBytes}
      summaryBindings={{ t, getGridCols, getIconSize, getVisibleStats, zoomCompensatedSize }}
      queryIndicators={<IntegrationErrorIndicator results={currentStreams} />}
    />
  );
}
