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
        // https://github.com/binwiederhier/ntfy/blob/630f2957deb670dcacfe0a338091d7561f176b9c/web/src/app/utils.js#L45C22-L45C47
        validate: z.string().refine((test) => /^([-_a-zA-Z0-9]{1,64})$/.test(test)),
      }),
    }));
  },
  supportedIntegrations: getIntegrationKindsByCategory("notifications"),
}).withDynamicImport(() => import("./component"));
