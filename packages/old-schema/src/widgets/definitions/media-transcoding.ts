import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrMediaTranscodingDefinition
  extends CommonOldmarrWidgetDefinition<
    "media-transcoding",
    {
      defaultView: "workers" | "queue" | "statistics";
      showHealthCheck: boolean;
      showHealthChecksInQueue: boolean;
      queuePageSize: number;
      showAppIcon: boolean;
    }
  > {}
