import { IconBinaryTree, IconServerOff } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("smartHome-entityState", {
  icon: IconBinaryTree,
  queryKey: [["widget", "smartHome"]],
  maxIntegrations: 1,
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
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.smartHome-entityState.error.loadFailed"),
    },
  },
}).withDynamicImport(() => import("./component"));
