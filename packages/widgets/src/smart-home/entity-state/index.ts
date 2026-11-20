import { IconBinaryTree, IconServerOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";
import { createSmartHomeEntityOptions } from "../_inputs/use-smart-home-entity-options";

export const { definition, componentLoader } = createWidgetDefinition("smartHome-entityState", {
  icon: IconBinaryTree,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "smartHome"]],
  ...getWidgetIntegrationConfig("smartHome-entityState"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      entityId: factory.integrationSelect({
        searchable: true,
        useOptions: createSmartHomeEntityOptions(),
      }),
      displayName: factory.text(),
      entityUnit: factory.text(),
      clickable: factory.switch(),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.smartHome-entityState.error.loadFailed"),
    },
  },
}).withDynamicImport(() => import("./component"));
