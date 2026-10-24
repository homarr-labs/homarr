import { IconCube } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition, matchesWidgetRuntimeQuery } from "../../definition";
import { widgetQuery } from "../../data";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("thingport-libraryStats", {
  icon: IconCube,
  supportsAdvancedFocus: false,
  queryKey: [["widget", "thingport", "getLibraryStats"]],
  queryMatcher: matchesWidgetRuntimeQuery,
  refetchInterval: null,
  ...getWidgetIntegrationConfig("thingport-libraryStats"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTitle: factory.switch({ defaultValue: false }),
      showModels: factory.switch({ defaultValue: true }),
      showCollections: factory.switch({ defaultValue: true }),
      showCategories: factory.switch({ defaultValue: true }),
      showAuthors: factory.switch({ defaultValue: true }),
      openInNewTab: factory.switch({ defaultValue: true }),
    }));
  },
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds }) => ({
      main: widgetQuery("widget.thingport.getLibraryStats", { integrationId: integrationIds[0] ?? "" }),
    }),
  })
  .withDynamicImport(() => import("./component"));
