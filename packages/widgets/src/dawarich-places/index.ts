import { IconMapPin } from "@tabler/icons-react";
import z from "zod";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("dawarichPlaces", {
  icon: IconMapPin,
  supportedIntegrations: ["dawarich"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      maxPlaces: factory.number({ defaultValue: 10, validate: z.number().min(1).max(50) }),
    }));
  },
}).withDynamicImport(() => import("./component"));
