import { IconBinaryTree } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("smartHome-executeAutomation", {
  icon: IconBinaryTree,
  mobile: {
    width: 1,
    height: 1,
    supportsCompactSummary: true,
    eager: true,
  },
  createOptions() {
    return optionsBuilder.from((factory) => ({
      displayName: factory.text(),
      automationId: factory.text(),
    }));
  },
  supportedIntegrations: getIntegrationKindsByCategory("smartHomeServer"),
}).withDynamicImport(() => import("./component"));
