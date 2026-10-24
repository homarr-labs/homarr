import { IconRotate360 } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition, matchesWidgetRuntimeQuery } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("thingport-featuredModel", {
  icon: IconRotate360,
  supportsAdvancedFocus: false,
  queryKey: [["widget", "thingport", "getFeaturedModel"]],
  queryMatcher: matchesWidgetRuntimeQuery,
  refetchInterval: null,
  ...getWidgetIntegrationConfig("thingport-featuredModel"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTitle: factory.switch({ defaultValue: false }),
      autoRotate: factory.switch({ defaultValue: true }),
      showDetails: factory.switch({ defaultValue: true }),
      openInNewTab: factory.switch({ defaultValue: true }),
    }));
  },
}).withDynamicImport(() => import("./component"));
