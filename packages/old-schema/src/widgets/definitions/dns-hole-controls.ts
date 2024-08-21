import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrDnsHoleControlsDefinition
  extends CommonOldmarrWidgetDefinition<
    "dns-hole-controls",
    {
      showToggleAllButtons: boolean;
    }
  > {}
