import { kubernetesMiddleware } from "../../../middlewares/kubernetes";
import { createTRPCRouter, permissionRequiredProcedure } from "../../../trpc";
import { KubernetesClient } from "../kubernetes-client";

export const contextsRouter = createTRPCRouter({
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
