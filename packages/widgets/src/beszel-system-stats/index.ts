import { clientApi } from "@homarr/api/client";

import { createWidgetDefinition } from "../definition";
import { createDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "beszelSystemStats",
  createDefinition({
    useSystems: (input, options) => clientApi.widget.beszel.getSystems.useQuery(input, options),
  }),
).withDynamicImport(() => import("./component"));
