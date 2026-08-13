import { kubernetesMiddleware } from "../../../middlewares/kubernetes";
import { createTRPCRouter, permissionRequiredProcedure } from "../../../trpc";
import { KubernetesClient } from "../kubernetes-client";

export const contextsRouter = createTRPCRouter({
  getContexts: permissionRequiredProcedure
    .requiresPermission("admin")
    .concat(kubernetesMiddleware())
    .query(async () => await KubernetesClient.getContextsAsync()),
});
