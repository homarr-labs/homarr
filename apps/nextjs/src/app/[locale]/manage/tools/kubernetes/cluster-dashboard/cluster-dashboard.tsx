"use client";

import { Alert, SimpleGrid, Stack, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { KubernetesLabelResourceType } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import KubernetesErrorPage from "~/app/[locale]/manage/tools/kubernetes/cluster-dashboard/error";
import { HeaderCard } from "~/app/[locale]/manage/tools/kubernetes/cluster-dashboard/header-card/header-card";
import { ResourceGauge } from "~/app/[locale]/manage/tools/kubernetes/cluster-dashboard/resource-gauge/resource-gauge";
import { ResourceTile } from "~/app/[locale]/manage/tools/kubernetes/cluster-dashboard/resource-tile/resource-tile";
import { createKubernetesResourceQueryOptions } from "../kubernetes-query-options";

interface ClusterDashboardProps {
  contextId: string;
  initialCluster: RouterOutputs["kubernetes"]["cluster"]["getCluster"] | null;
  initialResourceCounts: RouterOutputs["kubernetes"]["cluster"]["getClusterResourceCounts"] | null;
}

export function ClusterDashboard({ contextId, initialCluster, initialResourceCounts }: ClusterDashboardProps) {
  const tCluster = useI18n("kubernetes.cluster");

  const { data: clusterData, isError: isClusterError } = clientApi.kubernetes.cluster.getCluster.useQuery(
    { contextId },
    createKubernetesResourceQueryOptions(initialCluster ?? undefined),
  );

  const { data: resourceCountsData, isError: isResourceCountsError } =
    clientApi.kubernetes.cluster.getClusterResourceCounts.useQuery(
      { contextId },
      createKubernetesResourceQueryOptions(initialResourceCounts ?? undefined),
    );

  return (
    <Stack bg="var(--mantine-color-body)">
      <Title>{tCluster("title")}</Title>
      <SimpleGrid cols={{ xs: 1, sm: 2, md: 3 }}>
        {isClusterError || !clusterData ? (
          Array.from({ length: 3 }, (_, index) => <KubernetesErrorPage key={index} />)
        ) : (
          <>
            <HeaderCard headerType={"providers"} value={clusterData ? clusterData.providers : ""} />
            <HeaderCard headerType={"version"} value={clusterData ? clusterData.kubernetesVersion : ""} />
            <HeaderCard headerType={"architecture"} value={clusterData ? clusterData.architecture : ""} />
          </>
        )}
      </SimpleGrid>

      <Title>{tCluster("capacity.title")}</Title>

      {clusterData?.metricsAvailable === false && (
        <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />}>
          {tCluster("capacity.metricsUnavailable")}
        </Alert>
      )}

      <SimpleGrid cols={{ xs: 1, sm: 2, md: 3 }}>
        {isClusterError || !clusterData
          ? Array.from({ length: 3 }, (_, index) => <KubernetesErrorPage key={index} />)
          : clusterData.capacity.map((capacity) => <ResourceGauge kubernetesCapacity={capacity} key={capacity.type} />)}
      </SimpleGrid>

      <Title>{tCluster("resources.title")}</Title>

      <SimpleGrid cols={{ xs: 1, sm: 2, md: 3 }}>
        {isResourceCountsError || !resourceCountsData
          ? Array.from({ length: 8 }, (_, index) => <KubernetesErrorPage key={index} />)
          : resourceCountsData.map((clusterResourceCount) => (
              <ResourceTile
                count={clusterResourceCount.count}
                contextId={contextId}
                label={clusterResourceCount.label as KubernetesLabelResourceType}
                key={clusterResourceCount.label}
              />
            ))}
      </SimpleGrid>
    </Stack>
  );
}
