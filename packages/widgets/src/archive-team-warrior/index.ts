import { IconArchive } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("archiveTeamWarrior", {
  icon: IconArchive,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showBroadcastMessage: factory.switch({
        defaultValue: true,
      }),
    }));
  },
  supportedIntegrations: ["archiveTeamWarrior"],
}).withDynamicImport(() => import("./component"));
