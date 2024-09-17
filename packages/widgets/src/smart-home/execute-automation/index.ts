import { IconBinaryTree } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("smartHome-executeAutomation", {
  icon: IconBinaryTree,
  options: optionsBuilder.from((factory) => ({
    displayName: factory.text(),
    automationId: factory.text(),
  })),
  supportedIntegrations: getIntegrationKindsByCategory("smartHomeServer"),
}).withDynamicImport(() => import("./component"));
