import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import type { KubernetesClient } from "./contracts";

const resourceQueryOptions = {
  retry: false,
  refetchOnMount: "always",
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: (query: { state: { status: string } }): number | false => {
    if (query.state.status === "error") return 30_000;
    return false;
  },
} as const;

export function createKubernetesQueries(client: KubernetesClient, authorityKey: string) {
  const utils = createTanstackQueryUtils({ kubernetes: client }, { prefix: authorityKey }).kubernetes;
  return {
    contexts: () =>
      utils.contexts.getContexts.queryOptions({
        retry: false,
        refetchOnMount: "always",
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
        refetchInterval: 30_000,
      }),
    cluster: (contextId: string) => utils.cluster.getCluster.queryOptions({ input: { contextId }, retry: false }),
    counts: (contextId: string) =>
      utils.cluster.getClusterResourceCounts.queryOptions({ input: { contextId }, retry: false }),
    nodes: (contextId: string) => utils.nodes.getNodes.queryOptions({ input: { contextId }, ...resourceQueryOptions }),
    namespaces: (contextId: string) =>
      utils.namespaces.getNamespaces.queryOptions({ input: { contextId }, ...resourceQueryOptions }),
    pods: (contextId: string) => utils.pods.getPods.queryOptions({ input: { contextId }, ...resourceQueryOptions }),
    services: (contextId: string) =>
      utils.services.getServices.queryOptions({ input: { contextId }, ...resourceQueryOptions }),
    ingresses: (contextId: string) =>
      utils.ingresses.getIngresses.queryOptions({ input: { contextId }, ...resourceQueryOptions }),
    secrets: (contextId: string) =>
      utils.secrets.getSecrets.queryOptions({ input: { contextId }, ...resourceQueryOptions }),
    configMaps: (contextId: string) =>
      utils.configMaps.getConfigMaps.queryOptions({ input: { contextId }, ...resourceQueryOptions }),
    volumes: (contextId: string) =>
      utils.volumes.getVolumes.queryOptions({ input: { contextId }, ...resourceQueryOptions }),
  };
}

export type KubernetesQueries = ReturnType<typeof createKubernetesQueries>;
