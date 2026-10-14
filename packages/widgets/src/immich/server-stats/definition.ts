import { IconGraphFilled } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../../definition";
import { matchesWidgetRuntimeQuery } from "../../definition";
import { optionsBuilder } from "../../options";

export const definition = {
  kind: "immich-serverStats",
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
} satisfies WidgetDefinition & { kind: "immich-serverStats" };
