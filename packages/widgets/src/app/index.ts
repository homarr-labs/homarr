import { IconApps } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader, serverDataLoader } = createWidgetDefinition("app", {
  icon: IconApps,
  options: optionsBuilder.from((factory) => ({
    appId: factory.app(),
    openInNewTab: factory.switch({ defaultValue: true }),
    showDescriptionTooltip: factory.switch({ defaultValue: false }),
    pingEnabled: factory.switch({ defaultValue: false }),
  })),
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
