import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrSmartHomeTriggerAutomationDefinition
  extends CommonOldmarrWidgetDefinition<
    "smart-home/trigger-automation",
    {
      automationId: string;
      displayName: string;
    }
  > {}
