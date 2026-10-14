"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

import { clientApi } from "@homarr/api/client";
import { formatBitRate, objectEntries } from "@homarr/common";
import { getIconUrl } from "@homarr/definitions";
import type { StreamSession } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { MediaServerView, MediaSessionDetailsPopoverView } from "./native-view";

export { getMediaServerColumnVisibility, getResolutionLabel, getSeasonEpisodeParams } from "./native-view";

export default function MediaServerWidget({
  options,
  integrationIds,
  width,
  isEditMode,
  displayMode,
}: WidgetComponentProps<"mediaServer">) {
  const currentStreamsQuery = clientApi.widget.mediaServer.getCurrentStreams.useQuery({
    integrationIds,
    showOnlyPlaying: options.showOnlyPlaying,
  });
  const currentStreamsData = getUsableWidgetQueryData(currentStreamsQuery);
  const currentStreams = useMemo(() => currentStreamsData ?? [], [currentStreamsData]);
  const t = useI18n("widget.mediaServer");
  const tItems = useI18n("widget.mediaServer.items");
  const tSearch = useI18n("search");
  return (
    <MediaServerView
      currentStreams={currentStreams}
      options={options}
      width={width}
      isEditMode={isEditMode}
      displayMode={displayMode}
      t={t}
      tItems={tItems}
      searchPlaceholder={tSearch("placeholder")}
      queryIndicators={<IntegrationErrorIndicator results={currentStreams} />}
      getIconUrl={getIconUrl}
      formatBitRate={formatBitRate}
      objectEntries={objectEntries}
      zoomCompensatedSize={zoomCompensatedSize}
    />
  );
}

export function SessionDetailsPopover(props: {
  item: StreamSession;
  opened: boolean;
  onChange: (opened: boolean) => void;
  children: ReactNode;
}) {
  const t = useI18n("widget.mediaServer.items");
  return <MediaSessionDetailsPopoverView {...props} t={t} objectEntries={objectEntries} />;
}
