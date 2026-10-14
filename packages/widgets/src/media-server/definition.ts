import { IconVideo } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "mediaServer",
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
    }));
  },
  ...getWidgetIntegrationConfig("mediaServer"),
} satisfies WidgetDefinition & { kind: "mediaServer" };
