import { z } from "zod/v4";

import { createTRPCRouter, permissionRequiredProcedure } from "../../trpc";

const kubernetesContextInput = z.object({ contextId: z.string().min(1) });

const contextsRouter = createTRPCRouter({
  getContexts: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "List configured Kubernetes contexts with availability, metrics status, and default-context metadata. Requires admin permission.",
      },
    })
    .query(async ({ ctx }) => {
      const { contextsRouter: router } = await import("./router/contexts");
      return await router.createCaller(ctx).getContexts();
    }),
});

const ingressesRouter = createTRPCRouter({
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
    .query(async ({ ctx, input }) => {
      const { ingressesRouter: router } = await import("./router/ingresses");
      return await router.createCaller(ctx).getIngresses(input);
    }),
});

const podsRouter = createTRPCRouter({
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
    .query(async ({ ctx, input }) => {
      const { podsRouter: router } = await import("./router/pods");
      return await router.createCaller(ctx).getPods(input);
    }),
});

export const kubernetesMcpRouter = createTRPCRouter({
  contexts: contextsRouter,
  ingresses: ingressesRouter,
  pods: podsRouter,
});
