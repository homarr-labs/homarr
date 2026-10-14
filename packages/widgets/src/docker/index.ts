import { clientApi } from "@homarr/api/client";

import { createWidgetDefinition } from "../definition";
import { createDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "dockerContainers",
  createDefinition({
    useEndpoints: () => {
      const { data, isPending, isError } = clientApi.docker.getEndpoints.useQuery();
      return { data, isPending, isError };
    },
  }),
).withDynamicImport(() => import("./component"));
