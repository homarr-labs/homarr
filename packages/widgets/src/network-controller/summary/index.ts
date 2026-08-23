import { IconServerOff, IconTopologyFull } from "@tabler/icons-react";


import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("networkControllerSummary", {
  supportsAdvancedFocus: true,
  icon: IconTopologyFull,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.networkController.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
