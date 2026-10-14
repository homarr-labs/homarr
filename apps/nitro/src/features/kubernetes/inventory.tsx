import { Alert, Skeleton, Stack, Text, Title } from "@mantine/core";
import type { QueryOptionsOut } from "@orpc/tanstack-query";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { useI18n } from "@homarr/translation/client";

import { KubernetesErrorPage } from "../../source-ui/kubernetes/cluster-dashboard/error";
import { ConfigmapsTable } from "../../source-ui/kubernetes/configmaps/configmaps-table";
import { IngressesTable } from "../../source-ui/kubernetes/ingresses/ingresses-table";
import { NamespacesTable } from "../../source-ui/kubernetes/namespaces/namespaces-table";
import { NodesTable } from "../../source-ui/kubernetes/nodes/nodes-table";
import { PodsTable } from "../../source-ui/kubernetes/pods/pods-table";
import { SecretsTable } from "../../source-ui/kubernetes/secrets/secrets-table";
import { ServicesTable } from "../../source-ui/kubernetes/services/services-table";
import { VolumesTable } from "../../source-ui/kubernetes/volumes/volumes-table";
import { KubernetesReadContent } from "./components";
import type { KubernetesInventoryView } from "./contracts";
import type { KubernetesQueries } from "./queries";

interface InventoryProps {
  queries: KubernetesQueries;
  contextId: string;
  view: KubernetesInventoryView;
  onCheckLogs?(): void;
}

function ResourceRead<T>({
  options,
  label,
  children,
  errorPresentation,
}: {
  options: QueryOptionsOut<T, Error, T, undefined>;
  label: string;
  children(data: T): ReactNode;
  errorPresentation?: ReactNode;
}) {
  const query = useQuery(options);
  return (
    <>
      {query.isError && errorPresentation}
      <KubernetesReadContent query={query} label={label}>
        {(data) => <Suspense fallback={<Skeleton height={200} />}>{children(data)}</Suspense>}
      </KubernetesReadContent>
    </>
  );
}

function InventoryTable({ queries, contextId, view, onCheckLogs }: InventoryProps) {
  switch (view) {
    case "nodes":
      return (
        <ResourceRead
          options={queries.nodes(contextId)}
          label="Nodes"
          errorPresentation={<KubernetesErrorPage onCheckLogs={onCheckLogs} />}
        >
          {(data) => <NodesTable data={data} />}
        </ResourceRead>
      );
    case "namespaces":
      return (
        <ResourceRead options={queries.namespaces(contextId)} label="Namespaces">
          {(data) => <NamespacesTable data={data} />}
        </ResourceRead>
      );
    case "pods":
      return (
        <ResourceRead options={queries.pods(contextId)} label="Pods">
          {(data) => <PodsTable data={data} />}
        </ResourceRead>
      );
    case "services":
      return (
        <ResourceRead options={queries.services(contextId)} label="Services">
          {(data) => <ServicesTable data={data} />}
        </ResourceRead>
      );
    case "ingresses":
      return (
        <ResourceRead
          options={queries.ingresses(contextId)}
          label="Ingresses"
          errorPresentation={<KubernetesErrorPage onCheckLogs={onCheckLogs} />}
        >
          {(data) => <IngressesTable data={data} />}
        </ResourceRead>
      );
    case "secrets":
      return (
        <ResourceRead options={queries.secrets(contextId)} label="Secrets">
          {(data) => <SecretsTable data={data} />}
        </ResourceRead>
      );
    case "configMaps":
      return (
        <ResourceRead options={queries.configMaps(contextId)} label="ConfigMaps">
          {(data) => <ConfigmapsTable data={data} />}
        </ResourceRead>
      );
    case "volumes":
      return (
        <ResourceRead options={queries.volumes(contextId)} label="Volumes">
          {(data) => <VolumesTable data={data} />}
        </ResourceRead>
      );
  }
}

export function KubernetesInventoryViewContent(props: InventoryProps) {
  const tResource = useI18n("kubernetes.cluster.resources");
  const namespaced = props.view !== "nodes" && props.view !== "namespaces";
  return (
    <Stack>
      <Title order={1}>{tResource(props.view === "configMaps" ? "configmaps" : props.view)}</Title>
      <Text size="sm">
        {namespaced
          ? "Inventory across all namespaces in the selected context."
          : "Cluster-wide inventory in the selected context."}
      </Text>
      {props.view === "secrets" && (
        <Alert title="Secret metadata only">
          Secret values, encoded data and credentials are not returned or displayed.
        </Alert>
      )}
      {props.view === "configMaps" && (
        <Text size="sm">This inventory lists metadata only, not ConfigMap contents.</Text>
      )}
      <InventoryTable {...props} />
    </Stack>
  );
}
