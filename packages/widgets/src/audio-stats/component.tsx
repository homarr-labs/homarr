"use client";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { AudioStatsContent } from "./audio-stats-content";

export default function AudioStatsWidget({ integrationIds, options, width }: WidgetComponentProps<"audioStats">) {
  const [response] = clientApi.widget.audioStats.getStats.useSuspenseQuery({
    integrationId: integrationIds[0] ?? "",
  });

  return <AudioStatsContent backend={response.kind} stats={response.data} options={options} width={width} />;
}
