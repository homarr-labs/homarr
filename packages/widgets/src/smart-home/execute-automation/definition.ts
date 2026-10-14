import { IconBinaryTree } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const definition = {
  kind: "smartHome-executeAutomation",
  icon: IconBinaryTree,
  supportsAdvancedFocus: true,
  ...getWidgetIntegrationConfig("smartHome-executeAutomation"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      displayName: factory.text(),
      automationId: factory.text(),
    }));
  },
} satisfies WidgetDefinition & { kind: "smartHome-executeAutomation" };
