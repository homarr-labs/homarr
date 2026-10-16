import { createApiCaller } from "../../procedure";
import { z } from "zod/v4";

import { createApiRouter, permissionRequiredProcedure } from "../../procedure";

const kubernetesContextInput = z.object({ contextId: z.string().min(1) });

const contextsRouter = createApiRouter({
  getContexts: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "List configured Kubernetes contexts with availability, metrics status, and default-context metadata. Requires admin permission.",
      },
    })
    .query(async ({ context }) => {
      const { contextsRouter: router } = await import("./router/contexts");
      return await createApiCaller(router, context).getContexts();
    }),
});

const ingressesRouter = createApiRouter({
  getIngresses: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "List Kubernetes ingress inventory for a context. Get the required contextId from kubernetes_contexts_getContexts. Requires admin permission.",
      },
    })
    .input(kubernetesContextInput)
    .query(async ({ context, input }) => {
      const { ingressesRouter: router } = await import("./router/ingresses");
      return await createApiCaller(router, context).getIngresses(input);
    }),
});

const podsRouter = createApiRouter({
  getPods: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "List Kubernetes pod inventory and inferred workload types for a context. Get the required contextId from kubernetes_contexts_getContexts. Requires admin permission.",
      },
    })
    .input(kubernetesContextInput)
    .query(async ({ context, input }) => {
      const { podsRouter: router } = await import("./router/pods");
      return await createApiCaller(router, context).getPods(input);
    }),
});

export const kubernetesMcpRouter = createApiRouter({
  contexts: contextsRouter,
  ingresses: ingressesRouter,
  pods: podsRouter,
});
