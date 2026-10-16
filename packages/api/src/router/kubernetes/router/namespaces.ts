import { ApiError } from "../../../procedure";

import type { KubernetesNamespace, KubernetesNamespaceState } from "@homarr/definitions";

import { kubernetesMiddleware } from "../../../middlewares/kubernetes";
import { createApiRouter, permissionRequiredProcedure } from "../../../procedure";
import { getKubernetesClient, kubernetesContextInput } from "../kubernetes-context";

export const namespacesRouter = createApiRouter({
  getNamespaces: permissionRequiredProcedure
    .requiresPermission("admin")
    .concat(kubernetesMiddleware())
    .input(kubernetesContextInput)
    .query(async ({ input }): Promise<KubernetesNamespace[]> => {
      const { coreApi } = getKubernetesClient(input.contextId);

      try {
        const namespaces = await coreApi.listNamespace();

        return namespaces.items.map((namespace) => {
          return {
            status: namespace.status?.phase as KubernetesNamespaceState,
            name: namespace.metadata?.name ?? "unknown",
            creationTimestamp: namespace.metadata?.creationTimestamp,
          } satisfies KubernetesNamespace;
        });
      } catch (error) {
        throw new ApiError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching Kubernetes namespaces",
          cause: error,
        });
      }
    }),
});
