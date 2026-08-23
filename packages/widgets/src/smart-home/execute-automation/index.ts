import { IconBinaryTree } from "@tabler/icons-react";


import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("smartHome-executeAutomation", {
  icon: IconBinaryTree,
  supportsAdvancedFocus: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      displayName: factory.text(),
      automationId: factory.text(),
    }));
  },
}).withDynamicImport(() => import("./component"));
