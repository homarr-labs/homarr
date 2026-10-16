import { kubernetesMiddleware } from "../../../middlewares/kubernetes";
import { createApiRouter, permissionRequiredProcedure } from "../../../procedure";
import { KubernetesClient } from "../kubernetes-client";

export const contextsRouter = createApiRouter({
  getContexts: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "List configured Kubernetes contexts with availability, metrics status, and default-context metadata. Requires admin permission.",
      },
    })
    .concat(kubernetesMiddleware())
    .query(async () => await KubernetesClient.getContextsAsync()),
});
