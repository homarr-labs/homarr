import { IconMovie } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("mediaMissing", {
  icon: IconMovie,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showMissing: factory.switch({ defaultValue: true }),
      showQueued: factory.switch({ defaultValue: true }),
      pageSize: factory.number({ defaultValue: 10, validate: z.number().min(1).max(50) }),
    }));
  },
  supportedIntegrations: getIntegrationKindsByCategory("mediaOrganizer"),
}).withDynamicImport(() => import("./component"));
