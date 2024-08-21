import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrIndexerManagerDefinition
  extends CommonOldmarrWidgetDefinition<
    "indexer-manager",
    {
      openIndexerSiteInNewTab: boolean;
    }
  > {}
