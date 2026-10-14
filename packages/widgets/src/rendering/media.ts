import type { ReactNode } from "react";
import type { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "@homarr/common";
import type { zoomCompensatedSize } from "@homarr/ui";

export interface MediaNavigationBindings {
  getSafeApplicationUrl: typeof getSafeApplicationUrl;
  SAFE_NEW_TAB_REL: typeof SAFE_NEW_TAB_REL;
}

export interface MediaSizeBindings {
  zoomCompensatedSize: typeof zoomCompensatedSize;
}

export interface MediaViewSlots {
  emptyState: ReactNode;
  queryIndicators: ReactNode;
}

export { CalendarView } from "../calendar/native-view";
export { DownloadsView } from "../downloads/native-view";
export { MediaServerView } from "../media-server/native-view";
export { MediaRequestListView } from "../media-requests/list/native-view";
export { MediaRequestStatsView } from "../media-requests/stats/native-view";
export { MediaMissingView } from "../media-missing/native-view";
export { MediaTranscodingView } from "../media-transcoding/native-view";
export { MediaReleasesView } from "../media-releases/native-view";
export { ImmichServerStatsView } from "../immich/server-stats/native-view";
export { ImmichAlbumCarouselView } from "../immich/album-carousel/native-view";
export { TracearrView } from "../tracearr/native-view";
export { AudioStatsView } from "../audio-stats/native-view";
