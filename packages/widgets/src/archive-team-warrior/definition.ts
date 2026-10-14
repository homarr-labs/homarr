import { IconArchive } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "archiveTeamWarrior",
  icon: IconArchive,
  supportsAdvancedFocus: true,
  ...getWidgetIntegrationConfig("archiveTeamWarrior"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showBroadcastMessage: factory.switch({
        defaultValue: true,
      }),
    }));
  },
} satisfies WidgetDefinition & { kind: "archiveTeamWarrior" };
