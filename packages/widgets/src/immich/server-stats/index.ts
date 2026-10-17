import { IconGraphFilled } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition, matchesWidgetRuntimeQuery } from "../../definition";
import { widgetQuery } from "../../data";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("immich-serverStats", {
  icon: IconGraphFilled,
  supportsAdvancedFocus: true,
  queryKeys: [[["widget", "immich", "getServerStats"]], [["widget", "immich", "getAlbums"]]],
  queryMatcher: matchesWidgetRuntimeQuery,
  refetchInterval: null,
  ...getWidgetIntegrationConfig("immich-serverStats"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showUsers: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showPhotos: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showVideos: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showStorage: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
    }));
  },
})
  .withData({
    mode: "queries",
    stream: true,
    queries: ({ integrationIds }) => ({
      main: widgetQuery("widget.immich.getServerStats", { integrationId: integrationIds[0] ?? "" }),
    }),
  })
  .withDynamicImport(() => import("./component"));
