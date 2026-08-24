import { IconArchive } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("archiveTeamWarrior", {
  icon: IconArchive,
  supportsAdvancedFocus: true,
  maxIntegrations: 1,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showBroadcastMessage: factory.switch({
        defaultValue: true,
      }),
    }));
  },
  supportedIntegrations: ["archiveTeamWarrior", "mock"],
}).withDynamicImport(() => import("./component"));
