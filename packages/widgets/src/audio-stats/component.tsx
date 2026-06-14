"use client";

import { clientApi } from "@homarr/api/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { AudioStatsContent } from "./audio-stats-content";

export default function AudioStatsWidget({ integrationIds, options, width }: WidgetComponentProps<"audioStats">) {
  const { data: response } = clientApi.widget.audioStats.getStats.useQuery(
    { integrationId: integrationIds[0] ?? "" },
    { staleTime: 5 * 60 * 1000 },
  );

  if (!response) return <WidgetEmptyState />;

  return <AudioStatsContent backend={response.kind} stats={response.data} options={options} width={width} />;
}
