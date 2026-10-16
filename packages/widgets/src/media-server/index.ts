import { IconVideo } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";
import { widgetQuery } from "../data";

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
    }));
  },
  ...getWidgetIntegrationConfig("mediaServer"),
})
  .withData({
    mode: "queries",
    stream: true,
    queries: ({ integrationIds, options }) => ({
      main: widgetQuery("widget.mediaServer.getCurrentStreams", {
        integrationIds,
        showOnlyPlaying: options.showOnlyPlaying,
      }),
    }),
  })
  .withDynamicImport(() => import("./component"));
