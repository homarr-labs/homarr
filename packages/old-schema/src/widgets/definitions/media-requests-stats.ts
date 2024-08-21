import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrMediaRequestStatsDefinition
  extends CommonOldmarrWidgetDefinition<
    "media-requests-stats",
    {
      replaceLinksWithExternalHost: boolean;
      openInNewTab: boolean;
    }
  > {}
