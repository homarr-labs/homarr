import { clientApi } from "@homarr/api/client";

import { createWidgetDefinition } from "../definition";
import { createDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "systemDisks",
  createDefinition({
    useStorageVolumeObservations(integrationIds) {
      return clientApi.useQueries((queryBuilder) =>
        integrationIds.map((integrationId) =>
          queryBuilder.widget.healthMonitoring.listStorageVolumes({
            integrationId,
          }),
        ),
      );
    },
  }),
).withDynamicImport(() => import("./component"));
