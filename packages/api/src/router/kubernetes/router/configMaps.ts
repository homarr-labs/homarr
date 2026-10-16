import { ApiError } from "../../../procedure";

import type { KubernetesBaseResource } from "@homarr/definitions";

import { kubernetesMiddleware } from "../../../middlewares/kubernetes";
import { createApiRouter, permissionRequiredProcedure } from "../../../procedure";
import { getKubernetesClient, kubernetesContextInput } from "../kubernetes-context";

export const configMapsRouter = createApiRouter({
  getConfigMaps: permissionRequiredProcedure
    .requiresPermission("admin")
    .concat(kubernetesMiddleware())
    .input(kubernetesContextInput)
    .query(async ({ input }): Promise<KubernetesBaseResource[]> => {
      const { coreApi } = getKubernetesClient(input.contextId);

      try {
        const configMaps = await coreApi.listConfigMapForAllNamespaces();

        return configMaps.items.map((configMap) => {
          return {
            name: configMap.metadata?.name ?? "unknown",
            namespace: configMap.metadata?.namespace ?? "unknown",
            creationTimestamp: configMap.metadata?.creationTimestamp,
          };
        });
      } catch (error) {
        throw new ApiError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching Kubernetes ConfigMaps",
          cause: error,
        });
      }
    }),
});
