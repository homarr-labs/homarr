import { IconVideo } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("mediaServer", {
  icon: IconVideo,
  mobile: {
    width: 2,
    height: 1,
    supportsCompactSummary: true,
    supportsDetailView: true,
    unmountWhenOffscreen: true,
  },
  queryKey: [["widget", "mediaServer"]],
  refetchInterval: 5,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showOnlyPlaying: factory.switch({ defaultValue: true, withDescription: true }),
    }));
  },
  supportedIntegrations: getIntegrationKindsByCategory("mediaService"),
}).withDynamicImport(() => import("./component"));
