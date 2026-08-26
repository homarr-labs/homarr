import { IconNotes } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("anchorNote", {
  icon: IconNotes,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "anchorNotes"]],
  maxIntegrations: 1,
  supportedIntegrations: ["anchor", "mock"],
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
