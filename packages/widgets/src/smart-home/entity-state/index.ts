import { IconBinaryTree } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("smartHome-entityState", {
  icon: IconBinaryTree,
  mobile: {
    width: 1,
    height: 1,
    supportsCompactSummary: true,
    eager: true,
  },
  queryKey: [["widget", "smartHome"]],
  createOptions() {
    return optionsBuilder.from((factory) => ({
      entityId: factory.text({
        defaultValue: "sun.sun",
      }),
      displayName: factory.text({
        defaultValue: "Sun",
      }),
      entityUnit: factory.text(),
      clickable: factory.switch(),
    }));
  },
  supportedIntegrations: getIntegrationKindsByCategory("smartHomeServer"),
}).withDynamicImport(() => import("./component"));
