import { IconMovie } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

const pageSizeOptions = ["10", "20", "30", "50"] as const;

export const { componentLoader, definition } = createWidgetDefinition("mediaMissing", {
  icon: IconMovie,
  mobile: {
    width: 2,
    height: 1,
    supportsCompactSummary: true,
    supportsDetailView: true,
  },
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showMissing: factory.switch({ defaultValue: true }),
      showQueued: factory.switch({ defaultValue: true }),
      pageSize: factory.select({
        defaultValue: "10",
        options: pageSizeOptions.map((value) => ({
          value,
          label: value,
        })),
      }),
    }));
  },
  supportedIntegrations: getIntegrationKindsByCategory("mediaOrganizer"),
}).withDynamicImport(() => import("./component"));
