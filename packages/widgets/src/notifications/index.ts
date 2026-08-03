import { IconMessage } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("notifications", {
  supportsAdvancedFocus: false,
  icon: IconMessage,
  queryKey: [["widget", "notifications", "getNotifications"]],
  queryMatcher: ({ input }, scope) =>
    widgetQueryInputMatches(input, {
      hideLogos: scope.options.hideLogos,
      integrationIds: scope.integrationIds,
    }),
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      hideLogos: factory.switch({ defaultValue: false }),
    }));
  },
  supportedIntegrations: getIntegrationKindsByCategory("notifications"),
}).withDynamicImport(() => import("./component"));
