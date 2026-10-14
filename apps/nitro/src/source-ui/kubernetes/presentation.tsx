import { Alert, Button, Select, Skeleton, Stack, Text, Title } from "@mantine/core";
import type { ClusterResourceCount, KubernetesCluster, KubernetesLabelResourceType } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { Suspense } from "react";

import type {
  KubernetesContextsMetadata,
  KubernetesDisplayInventory,
  KubernetesResourceView,
  KubernetesPresentationView,
} from "./contracts";
import { kubernetesViews } from "./contracts";
import { KubernetesTable } from "../../features/kubernetes/components";
import { createKubernetesContextsModel } from "../../features/kubernetes/models";
import { ClusterDashboard } from "./cluster-dashboard/cluster-dashboard";
import { ConfigmapsTable } from "./configmaps/configmaps-table";
import { IngressesTable } from "./ingresses/ingresses-table";
import { KubernetesContextSelector } from "./kubernetes-context-selector";
import { NamespacesTable } from "./namespaces/namespaces-table";
import { NodesTable } from "./nodes/nodes-table";
import { PodsTable } from "./pods/pods-table";
import { SecretsTable } from "./secrets/secrets-table";
import { ServicesTable } from "./services/services-table";
import { VolumesTable } from "./volumes/volumes-table";

export function resourceInventoryView(label: KubernetesLabelResourceType): KubernetesResourceView {
  if (label === "configmaps") return "configMaps";
  return label;
}

export function KubernetesInventoryPresentation({ inventory }: { inventory: KubernetesDisplayInventory }) {
  switch (inventory.kind) {
    case "nodes":
      return <NodesTable data={inventory.items} />;
    case "namespaces":
      return <NamespacesTable data={inventory.items} />;
    case "pods":
      return <PodsTable data={inventory.items} />;
    case "services":
      return <ServicesTable data={inventory.items} />;
    case "ingresses":
      return <IngressesTable data={inventory.items} />;
    case "secrets":
      return <SecretsTable data={inventory.items} />;
    case "configMaps":
      return <ConfigmapsTable data={inventory.items} />;
    case "volumes":
      return <VolumesTable data={inventory.items} />;
  }
}

export interface KubernetesPresentationProps {
  contexts: KubernetesContextsMetadata;
  contextId: string;
  view: KubernetesPresentationView;
  displayLabel: string;
  unavailableReason: string;
  snapshot?: {
    contextId: string;
    cluster?: KubernetesCluster;
    resourceCounts?: ClusterResourceCount[];
    inventory?: KubernetesDisplayInventory;
  };
  assetBase?: string;
  onContextChange(contextId: string): void;
  onViewChange(view: KubernetesPresentationView): void;
}

export function KubernetesPresentation(props: KubernetesPresentationProps) {
  const tResource = useI18n("kubernetes.cluster.resources");
  const snapshot = props.snapshot?.contextId === props.contextId ? props.snapshot : undefined;
  const context = props.contexts.contexts.find((item) => item.contextId === props.contextId);
  return (
    <Stack>
      <Alert color="yellow" title={props.displayLabel}>
        <Stack gap="xs">
          <Text size="sm">{props.unavailableReason}</Text>
          <Button disabled variant="light" size="xs" w="fit-content">
            Live refresh unavailable
          </Button>
        </Stack>
      </Alert>
      <KubernetesContextSelector
        data={props.contexts}
        contextId={props.contextId}
        onContextChange={props.onContextChange}
      />
      <Select<KubernetesPresentationView>
        label="View"
        data={kubernetesViews.map((item) => ({ ...item }))}
        value={props.view}
        allowDeselect={false}
        onChange={(view) => {
          if (view) props.onViewChange(view);
        }}
      />
      {!context && <Alert>No Kubernetes context is selected.</Alert>}
      {context && props.view === "contexts" && (
        <KubernetesTable model={createKubernetesContextsModel(props.contexts)} />
      )}
      {context && props.view === "cluster" && snapshot && (
        <Stack>
          {(!snapshot.cluster || !snapshot.resourceCounts) && (
            <Alert>
              Some cluster display data was not supplied. Missing sections are unavailable, not empty inventories.
            </Alert>
          )}
          <ClusterDashboard
            contextId={props.contextId}
            cluster={snapshot.cluster}
            resourceCounts={snapshot.resourceCounts}
            assetBase={props.assetBase}
            onResourceNavigate={(label) => props.onViewChange(resourceInventoryView(label))}
          />
        </Stack>
      )}
      {context && props.view !== "cluster" && props.view !== "contexts" && (
        <Stack key={`${props.contextId}:${props.view}`}>
          <Title order={1}>{tResource(props.view === "configMaps" ? "configmaps" : props.view)}</Title>
          {snapshot?.inventory?.kind === props.view ? (
            <Suspense fallback={<Skeleton height={200} />}>
              <KubernetesInventoryPresentation inventory={snapshot.inventory} />
            </Suspense>
          ) : (
            <Alert>
              No display snapshot was supplied for this context and resource. Live inventory is unavailable.
            </Alert>
          )}
        </Stack>
      )}
      {context && props.view === "cluster" && !snapshot && (
        <Alert>No display snapshot was supplied for this context. Live cluster reads are unavailable.</Alert>
      )}
    </Stack>
  );
}
