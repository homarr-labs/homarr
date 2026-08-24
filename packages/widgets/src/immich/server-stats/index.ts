import { IconGraphFilled } from "@tabler/icons-react";

import { createWidgetDefinition, matchesWidgetRuntimeQuery } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("immich-serverStats", {
  icon: IconGraphFilled,
  supportsAdvancedFocus: true,
  queryKeys: [[["widget", "immich", "getServerStats"]], [["widget", "immich", "getAlbums"]]],
  queryMatcher: matchesWidgetRuntimeQuery,
  refetchInterval: null,
  supportedIntegrations: ["immich", "mock"],
  integrationsRequired: true,
  maxIntegrations: 1,
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
}).withDynamicImport(() => import("./component"));
