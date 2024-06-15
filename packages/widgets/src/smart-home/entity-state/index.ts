import { IconBinaryTree } from "@tabler/icons-react";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("smartHome-entityState", {
  icon: IconBinaryTree,
  options: optionsBuilder.from((factory) => ({
    entityId: factory.text({
      defaultValue: "sun.sun",
    }),
    displayName: factory.text({
      defaultValue: "Sun",
    }),
    entityUnit: factory.text(),
    clickable: factory.switch(),
  })),
  supportedIntegrations: ["homeAssistant"],
}).withDynamicImport(() => import("./component"));
