import { IconVideo } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("mediaServer", {
  icon: IconVideo,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "mediaServer", "getCurrentStreams"]],
  queryMatcher: ({ input }, scope) =>
    widgetQueryInputMatches(input, {
      integrationIds: scope.integrationIds,
      showOnlyPlaying: scope.options.showOnlyPlaying,
    }),
  refetchInterval: 10,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showOnlyPlaying: factory.switch({ defaultValue: true, withDescription: true }),
      showBitrate: factory.switch({ defaultValue: true, withDescription: true }),
      showLocation: factory.switch({ defaultValue: true, withDescription: true }),
      detailedSessionLimit: factory.number({
        defaultValue: 2,
        validate: z.number().int().min(0).max(10),
        withDescription: true,
      }),
    }));
  },
  activitySignal: (data) =>
    Array.isArray(data) &&
    data.some(
      (pair) =>
        typeof pair === "object" &&
        pair !== null &&
        (("error" in pair && Boolean(pair.error)) ||
          ("sessions" in pair && Array.isArray(pair.sessions) && pair.sessions.length > 0)),
    ),
  ...getWidgetIntegrationConfig("mediaServer"),
}).withDynamicImport(() => import("./component"));
