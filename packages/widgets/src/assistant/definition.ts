import { IconRobot } from "@tabler/icons-react";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "assistant",
  icon: IconRobot,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
} satisfies WidgetDefinition & { kind: "assistant" };
