import { IconBinaryTree } from "@tabler/icons-react";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("smartHome-executeAutomation", {
  icon: IconBinaryTree,
  options: optionsBuilder.from((factory) => ({
    displayName: factory.text(),
    automationId: factory.text(),
  })),
  supportedIntegrations: ["homeAssistant"],
}).withDynamicImport(() => import("./component"));
