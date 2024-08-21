import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrMediaRequestListDefinition
  extends CommonOldmarrWidgetDefinition<
    "media-requests-list",
    {
      replaceLinksWithExternalHost: boolean;
      openInNewTab: boolean;
    }
  > {}
