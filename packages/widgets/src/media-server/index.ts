import { IconVideo } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

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
    }));
  },
  supportedIntegrations: getIntegrationKindsByCategory("mediaService"),
}).withDynamicImport(() => import("./component"));
