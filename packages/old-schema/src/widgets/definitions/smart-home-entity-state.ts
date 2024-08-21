import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrSmartHomeEntityStateDefinition
  extends CommonOldmarrWidgetDefinition<
    "smart-home/entity-state",
    {
      entityId: string;
      appendUnit: boolean;
      genericToggle: boolean;
      automationId: string;
      displayName: string;
      displayFriendlyName: boolean;
    }
  > {}
