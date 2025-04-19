import { IconMessage } from "@tabler/icons-react";
import { z } from "zod";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("notifications", {
  icon: IconMessage,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      topics: factory.multiText({
        defaultValue: [],
        validate: z.string().regex(/\S+/), // should not contain spaces
      }),
    }));
  },
  supportedIntegrations: getIntegrationKindsByCategory("notifications"),
}).withDynamicImport(() => import("./component"));
