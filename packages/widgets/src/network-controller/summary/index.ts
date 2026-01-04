import IconServerOff from "@tabler/icons-react/icons/IconServerOff";
import IconTopologyFull from "@tabler/icons-react/icons/IconTopologyFull";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("networkControllerSummary", {
  icon: IconTopologyFull,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  supportedIntegrations: getIntegrationKindsByCategory("networkController"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.networkController.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
