import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrCalendarDefinition
  extends CommonOldmarrWidgetDefinition<
    "calendar",
    {
      hideWeekDays: boolean;
      showUnmonitored: boolean;
      radarrReleaseType: "inCinemas" | "physicalRelease" | "digitalRelease";
      fontSize: "xs" | "sm" | "md" | "lg" | "xl";
    }
  > {}
