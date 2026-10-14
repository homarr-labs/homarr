import { clientApi } from "@homarr/api/client";

import { createWidgetDefinition } from "../../definition";
import { createDefinition } from "./definition";

const albumCarouselDefinition = createDefinition({
  useAlbums: (input, options) => clientApi.widget.immich.getAlbums.useQuery(input, options),
});

export const { definition, componentLoader } = createWidgetDefinition(
  "immich-albumCarousel",
  albumCarouselDefinition,
).withDynamicImport(() => import("./component"));
