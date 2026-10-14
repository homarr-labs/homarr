import { Alert, SimpleGrid, Skeleton, Stack, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { kubernetesLabelResourceTypes } from "@homarr/definitions";
import type { ClusterResourceCount, KubernetesCluster, KubernetesLabelResourceType } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { KubernetesErrorPage } from "./error";
import { HeaderCard } from "./header-card/header-card";
import { ResourceGauge } from "./resource-gauge/resource-gauge";
import { ResourceTile } from "./resource-tile/resource-tile";

export interface ClusterDashboardProps {
  contextId: string;
  cluster?: KubernetesCluster;
  resourceCounts?: ClusterResourceCount[];
  clusterLoading?: boolean;
  countsLoading?: boolean;
  clusterError?: boolean;
  countsError?: boolean;
  assetBase?: string;
  onResourceNavigate?(label: KubernetesLabelResourceType): void;
  onCheckLogs?(): void;
}

export function ClusterDashboard(props: ClusterDashboardProps) {
  const tCluster = useI18n("kubernetes.cluster");
  return (
    <Stack bg="var(--mantine-color-body)">
      <Title>{tCluster("title")}</Title>
      <SimpleGrid cols={{ xs: 1, sm: 2, md: 3 }}>
        {props.clusterError &&
          Array.from({ length: 3 }, (_, index) => <KubernetesErrorPage key={index} onCheckLogs={props.onCheckLogs} />)}
        {!props.clusterError &&
          props.clusterLoading &&
          Array.from({ length: 3 }, (_, index) => <Skeleton key={index} height={65} />)}
        {!props.clusterError && !props.clusterLoading && props.cluster && (
          <>
            <HeaderCard headerType="providers" value={props.cluster.providers} />
            <HeaderCard headerType="version" value={props.cluster.kubernetesVersion} />
            <HeaderCard headerType="architecture" value={props.cluster.architecture} />
          </>
        )}
      </SimpleGrid>
      <Title>{tCluster("capacity.title")}</Title>
      {props.cluster?.metricsAvailable === false && (
        <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />}>
          {tCluster("capacity.metricsUnavailable")}
        </Alert>
      )}
      <SimpleGrid cols={{ xs: 1, sm: 2, md: 3 }}>
        {props.clusterError &&
          Array.from({ length: 3 }, (_, index) => <KubernetesErrorPage key={index} onCheckLogs={props.onCheckLogs} />)}
        {!props.clusterError &&
          props.clusterLoading &&
          Array.from({ length: 3 }, (_, index) => <Skeleton key={index} height={200} />)}
        {!props.clusterError &&
          !props.clusterLoading &&
          props.cluster?.capacity.map((capacity) => (
            <ResourceGauge kubernetesCapacity={capacity} key={capacity.type} />
          ))}
      </SimpleGrid>
      <Title>{tCluster("resources.title")}</Title>
      <SimpleGrid cols={{ xs: 1, sm: 2, md: 3 }}>
        {props.countsError &&
          Array.from({ length: 8 }, (_, index) => <KubernetesErrorPage key={index} onCheckLogs={props.onCheckLogs} />)}
        {!props.countsError &&
          props.countsLoading &&
          Array.from({ length: 8 }, (_, index) => <Skeleton key={index} height={100} />)}
        {!props.countsError &&
          !props.countsLoading &&
          props.resourceCounts?.map((resource) => {
            const label = kubernetesLabelResourceTypes.find((item) => item === resource.label);
            if (!label) return <Alert key={resource.label}>Unknown resource: {resource.label}</Alert>;
            return (
              <ResourceTile
                count={resource.count}
                contextId={props.contextId}
                label={label}
                key={label}
                assetBase={props.assetBase}
                onNavigate={props.onResourceNavigate}
              />
            );
          })}
      </SimpleGrid>
    </Stack>
  );
}
