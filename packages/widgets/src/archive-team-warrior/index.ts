import { IconArchive } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("archiveTeamWarrior", {
  icon: IconArchive,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      url: factory.text({
        defaultValue: "http://localhost:8001",
        validate: z.string().url(),
      }),
      showBroadcastMessage: factory.switch({
        defaultValue: true,
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
