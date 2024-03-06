import { IconApps } from "@homarr/ui";
import { z } from "@homarr/validation";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader, serverDataLoader } =
  createWidgetDefinition("app", {
    icon: IconApps,
    options: optionsBuilder.from((factory) => ({
      appId: factory.text({
        defaultValue: "eycutq7hu3j5mi3cez3phpll",
        validate: z.string(),
      }),
      openInNewTab: factory.switch({ defaultValue: true }),
      showDescriptionTooltip: factory.switch({ defaultValue: false }),
    })),
  })
    .withServerData(() => import("./serverData"))
    .withDynamicImport(() => import("./component"));
