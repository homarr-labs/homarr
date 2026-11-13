import { IconPhoto } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { useFrameleafAlbums } from "./albums";

export const { definition, componentLoader } = createWidgetDefinition("frameleaf-albumCarousel", {
  icon: IconPhoto,
  supportsAdvancedFocus: false,
  refetchInterval: null,
  ...getWidgetIntegrationConfig("frameleaf-albumCarousel"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      albumId: factory.integrationSelect({
        useOptions: useFrameleafAlbums,
        searchable: true,
        withDescription: true,
        defaultValue: "",
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
