import { IconMessage } from "@tabler/icons-react";


import { createWidgetDefinition, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("notifications", {
  supportsAdvancedFocus: true,
  icon: IconMessage,
  queryMatcher: ({ input }, scope) =>
    widgetQueryInputMatches(input, {
      hideLogos: scope.options.hideLogos,
      integrationIds: scope.integrationIds,
    }),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      hideLogos: factory.switch({ defaultValue: false }),
    }));
  },
}).withDynamicImport(() => import("./component"));
