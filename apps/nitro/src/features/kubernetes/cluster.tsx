import { Alert, Button, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { ClusterDashboard } from "../../source-ui/kubernetes/cluster-dashboard/cluster-dashboard";
import { resourceInventoryView } from "../../source-ui/kubernetes/presentation";
import type { KubernetesCluster, KubernetesInventoryView } from "./contracts";
import type { KubernetesQueries } from "./queries";
import { toKubernetesReadError } from "./errors";

export function KubernetesClusterSummary({ cluster, contextId }: { cluster: KubernetesCluster; contextId: string }) {
  return <ClusterDashboard contextId={contextId} cluster={cluster} />;
}

export function KubernetesClusterView({
  queries,
  contextId,
  onInventoryChange,
  assetBase,
  onCheckLogs,
}: {
  queries: KubernetesQueries;
  contextId: string;
  onInventoryChange(view: KubernetesInventoryView): void;
  assetBase?: string;
  onCheckLogs?(): void;
}) {
  const cluster = useQuery(queries.cluster(contextId));
  const counts = useQuery(queries.counts(contextId));
  return (
    <Stack gap="lg" aria-busy={cluster.isFetching || counts.isFetching}>
      {((cluster.isFetching && !cluster.isPending) || (counts.isFetching && !counts.isPending)) && (
        <Text component="output" size="sm">
          Updating cluster and resource counts…
        </Text>
      )}
      {(cluster.fetchStatus === "paused" || counts.fetchStatus === "paused") && (
        <Alert>Updates are waiting for a connection. Any displayed data is the last loaded snapshot.</Alert>
      )}
      {cluster.isError && (
        <Alert color="red" title="Cluster could not be loaded">
          <Stack gap="sm">
            {toKubernetesReadError(cluster.error).message}
            <Button
              variant="light"
              color="red"
              size="xs"
              w="fit-content"
              loading={cluster.isFetching}
              onClick={() => void cluster.refetch()}
            >
              Retry load
            </Button>
          </Stack>
        </Alert>
      )}
      {counts.isError && (
        <Alert color="red" title="Resource counts could not be loaded">
          <Stack gap="sm">
            {toKubernetesReadError(counts.error).message}
            <Button
              variant="light"
              color="red"
              size="xs"
              w="fit-content"
              loading={counts.isFetching}
              onClick={() => void counts.refetch()}
            >
              Retry load
            </Button>
          </Stack>
        </Alert>
      )}
      <ClusterDashboard
        contextId={contextId}
        cluster={cluster.data}
        resourceCounts={counts.data}
        clusterLoading={cluster.isPending}
        countsLoading={counts.isPending}
        clusterError={cluster.isError}
        countsError={counts.isError}
        assetBase={assetBase}
        onResourceNavigate={(label) => onInventoryChange(resourceInventoryView(label))}
        onCheckLogs={onCheckLogs}
      />
    </Stack>
  );
}
