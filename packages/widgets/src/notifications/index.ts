import { IconMessage } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("notifications", {
  icon: IconMessage,
  mobile: {
    width: 2,
    height: 1,
    supportsCompactSummary: true,
    supportsDetailView: true,
  },
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      hideLogos: factory.switch({ defaultValue: false }),
    }));
  },
  supportedIntegrations: getIntegrationKindsByCategory("notifications"),
}).withDynamicImport(() => import("./component"));
