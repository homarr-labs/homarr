import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrVideoStreamDefinition
  extends CommonOldmarrWidgetDefinition<
    "video-stream",
    {
      FeedUrl: string;
      autoPlay: boolean;
      muted: boolean;
      controls: boolean;
    }
  > {}
