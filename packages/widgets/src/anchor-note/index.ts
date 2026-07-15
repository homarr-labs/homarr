import { IconNotes } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("anchorNote", {
  icon: IconNotes,
  queryKey: [["widget", "anchorNotes"]],
  refetchIntervalSeconds: 15,
  supportedIntegrations: ["anchor"],
  createOptions() {
    return optionsBuilder.from((factory) => ({
      noteId: factory.anchorNote(),
      showTitle: factory.switch({
        defaultValue: true,
      }),
      showUpdatedAt: factory.switch({
        defaultValue: true,
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
