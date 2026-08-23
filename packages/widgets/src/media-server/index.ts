import { IconVideo } from "@tabler/icons-react";


import { createWidgetDefinition, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("mediaServer", {
  icon: IconVideo,
  supportsAdvancedFocus: true,
  queryMatcher: ({ input }, scope) =>
    widgetQueryInputMatches(input, {
      integrationIds: scope.integrationIds,
      showOnlyPlaying: scope.options.showOnlyPlaying,
    }),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showOnlyPlaying: factory.switch({ defaultValue: true, withDescription: true }),
      showBitrate: factory.switch({ defaultValue: true, withDescription: true }),
      showLocation: factory.switch({ defaultValue: true, withDescription: true }),
    }));
  },
}).withDynamicImport(() => import("./component"));
