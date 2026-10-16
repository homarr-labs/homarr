"use client";

import { useLocale } from "next-intl";
import { Alert, Box, Button, Card, Group, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconCertificate, IconCertificateOff } from "@tabler/icons-react";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";
import { getMantineColor } from "@homarr/common/theme";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { ApiPageTabs } from "~/app/[locale]/manage/tools/api/components/api-page-tabs";
import { ScalarApiReferenceFrame } from "~/app/[locale]/manage/tools/api/components/scalar-api-reference-frame";
import { BackupExportCard } from "~/app/[locale]/manage/tools/backup/_components/backup-export-card";
import { BackupImportCard } from "~/app/[locale]/manage/tools/backup/_components/backup-import-card";
import { AddCertificateSection } from "~/app/[locale]/manage/tools/certificates/_components/add-certificate";
import { RemoveCertificate } from "~/app/[locale]/manage/tools/certificates/_components/remove-certificate";
import { RemoveHostnameActionIcon } from "~/app/[locale]/manage/tools/certificates/hostnames/_components/remove-hostname";
import { DockerReconciliation } from "~/app/[locale]/manage/tools/docker/docker-reconciliation";
import { DockerTable } from "~/app/[locale]/manage/tools/docker/docker-table";
import { ClientSideDockerLogsTerminal } from "~/app/[locale]/manage/tools/docker/logs/[containerId]/client";
import { ClusterDashboard } from "~/app/[locale]/manage/tools/kubernetes/cluster-dashboard/cluster-dashboard";
import { ConfigmapsTable } from "~/app/[locale]/manage/tools/kubernetes/configmaps/configmaps-table";
import { IngressesTable } from "~/app/[locale]/manage/tools/kubernetes/ingresses/ingresses-table";
import {
  KubernetesContextSelector,
  useSelectedKubernetesContextId,
} from "~/app/[locale]/manage/tools/kubernetes/kubernetes-context-selector";
import { NamespacesTable } from "~/app/[locale]/manage/tools/kubernetes/namespaces/namespaces-table";
import { NodesTable } from "~/app/[locale]/manage/tools/kubernetes/nodes/nodes-table";
import { PodsTable } from "~/app/[locale]/manage/tools/kubernetes/pods/pods-table";
import { SecretsTable } from "~/app/[locale]/manage/tools/kubernetes/secrets/secrets-table";
import { ServicesTable } from "~/app/[locale]/manage/tools/kubernetes/services/services-table";
import { VolumesTable } from "~/app/[locale]/manage/tools/kubernetes/volumes/volumes-table";
import { ClientSideTerminalComponent } from "~/app/[locale]/manage/tools/logs/client";
import { LogFontSizeSlider } from "~/app/[locale]/manage/tools/logs/font-size-slider";
import { LogLevelSelection } from "~/app/[locale]/manage/tools/logs/level-selection";
import { LogContextProvider } from "~/app/[locale]/manage/tools/logs/log-context";
import { TasksTable } from "~/app/[locale]/manage/tools/tasks/_components/tasks-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { NoResults } from "~/components/no-results";
import { fullHeightWithoutHeaderAndFooter } from "~/constants";
import { useWorkerBootstrap, useWorkerWorkspace } from "~/worker/context";

import { WorkerQuery, WorkerQueryStatus } from "./query-state";
import { WorkerAboutPage } from "./tools-about";
import { WorkerMcpInstructions } from "./tools-mcp";

import "@xterm/xterm/css/xterm.css";

export function WorkerToolsRoute({ segments, searchParams }: { segments: string[]; searchParams: URLSearchParams }) {
  const { session, runtime } = useWorkerBootstrap();
  const isAdmin = session.user.permissions.includes("admin");
  if (segments[0] === "about") return <WorkerAboutPage />;
  if (segments[0] !== "tools") return null;
  if (segments[1] === "logs" && session.user.permissions.includes("other-view-logs")) {
    return <WorkerLogsPage searchParams={searchParams} />;
  }
  if (!isAdmin) return <UnavailableTool />;
  switch (segments[1]) {
    case "tasks":
      return <WorkerTasksPage />;
    case "docker":
      if (!runtime.dockerEnabled) return <UnavailableTool />;
      if (segments[2] === "logs" && segments[3])
        return <WorkerDockerLogsPage containerId={segments[3]} searchParams={searchParams} />;
      return <WorkerDockerPage />;
    case "kubernetes":
      if (!runtime.kubernetesEnabled) return <UnavailableTool />;
      return <WorkerKubernetesPage resource={segments[2]} />;
    case "backup":
      if (runtime.databaseDriver !== "better-sqlite3") return <UnavailableTool />;
      return <WorkerBackupPage />;
    case "api":
      return <WorkerApiPage />;
    case "certificates":
      if (segments[2] === "hostnames") return <WorkerTrustedHostnamesPage />;
      return <WorkerCertificatesPage />;
    default:
      return <UnavailableTool />;
  }
}

function UnavailableTool() {
  const t = useI18n("common");
  return <Alert color="gray">{t("error")}</Alert>;
}

function WorkerTasksPage() {
  const jobs = clientApi.cronJobs.getJobs.useQuery();
  const t = useI18n("common.entity");
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title>{t("tasks")}</Title>
        <WorkerQuery query={jobs}>{(data) => <TasksTable initialJobs={data} />}</WorkerQuery>
      </Stack>
    </>
  );
}

function WorkerDockerPage() {
  const { pool } = useWorkerWorkspace();
  const worker = pool.getWorker();
  let serverOrigin = "";
  if (worker?.directUrl) serverOrigin = new URL(worker.directUrl).origin;
  const containers = clientApi.docker.getContainers.useQuery();
  const t = useI18n("docker");
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title>{t("title")}</Title>
        <DockerReconciliation defaultServerOrigin={serverOrigin} />
        <WorkerQuery query={containers}>{(data) => <DockerTable initialData={data} />}</WorkerQuery>
      </Stack>
    </>
  );
}

function WorkerDockerLogsPage({ containerId, searchParams }: { containerId: string; searchParams: URLSearchParams }) {
  const endpoints = clientApi.docker.getEndpoints.useQuery();
  let endpointId = searchParams.get("endpointId") ?? undefined;
  if (!endpointId && endpoints.data?.length === 1) endpointId = endpoints.data[0]?.id;
  const logs = clientApi.docker.logs.useQuery(
    { endpointId: endpointId ?? "", id: containerId, tail: 1 },
    { enabled: Boolean(endpointId) },
  );
  if (!endpointId && !endpoints.isPending && !endpoints.error) return <UnavailableTool />;
  if (!endpointId) return <WorkerQueryStatus queries={[endpoints]} />;
  return (
    <WorkerQuery query={logs}>
      {() => (
        <>
          <Group>
            <DynamicBreadcrumb
              dynamicMappings={new Map([[containerId, searchParams.get("name") ?? containerId]])}
              nonInteractable={[containerId]}
            />
          </Group>
          <Box style={{ borderRadius: 6 }} h={fullHeightWithoutHeaderAndFooter} p="md" bg="black">
            <ClientSideDockerLogsTerminal endpointId={endpointId} containerId={containerId} />
          </Box>
        </>
      )}
    </WorkerQuery>
  );
}

function WorkerLogsPage({ searchParams }: { searchParams: URLSearchParams }) {
  const parsedFocus = Number(searchParams.get("focus"));
  let focusTimestamp: number | undefined;
  if (Number.isSafeInteger(parsedFocus) && parsedFocus > 0) focusTimestamp = parsedFocus;
  return (
    <LogContextProvider defaultLevel="info">
      <Group justify="space-between" align="center" wrap="nowrap">
        <DynamicBreadcrumb />
        <Group gap="md" wrap="nowrap">
          <LogFontSizeSlider />
          <LogLevelSelection />
        </Group>
      </Group>
      <Box style={{ borderRadius: 6 }} h={fullHeightWithoutHeaderAndFooter} p="md" bg="black">
        <ClientSideTerminalComponent focusTimestamp={focusTimestamp} />
      </Box>
    </LogContextProvider>
  );
}

function WorkerBackupPage() {
  const t = useI18n("management.page.tool.backup");
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title>{t("title")}</Title>
        <BackupExportCard />
        <BackupImportCard />
      </Stack>
    </>
  );
}

function WorkerApiPage() {
  const apiKeys = clientApi.apiKeys.getAll.useQuery();
  const t = useI18n("management.page.tool.api.tab");
  let origin = "https://homarr.dev";
  if (typeof window !== "undefined") origin = window.location.origin;
  if (!apiKeys.data) return <WorkerQueryStatus queries={[apiKeys]} />;
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <ApiPageTabs
          documentationLabel={t("documentation.label")}
          apiKeyLabel={t("apiKey.label")}
          mcpLabel={t("mcp.label")}
          documentationPanel={<ScalarApiReferenceFrame />}
          mcpPanel={<WorkerMcpInstructions />}
          apiKeys={apiKeys.data}
          baseUrl={origin}
          toolGroups={[]}
        />
      </Stack>
    </>
  );
}

function WorkerKubernetesPage({ resource }: { resource?: string }) {
  let content = <ClusterDashboard />;
  if (resource) content = <WorkerKubernetesResource resource={resource} />;
  return (
    <Stack>
      <KubernetesContextSelector />
      <DynamicBreadcrumb />
      {content}
    </Stack>
  );
}

function WorkerKubernetesResource({ resource }: { resource: string }) {
  const contextId = useSelectedKubernetesContextId();
  const t = useI18n("kubernetes.cluster.resources");
  const contexts = clientApi.kubernetes.contexts.getContexts.useQuery();
  const context = contexts.data?.contexts.find((item) => item.contextId === contextId);
  const enabled = Boolean(contextId) && context?.status !== "unavailable";
  const input = { contextId: contextId ?? "" };
  const nodes = clientApi.kubernetes.nodes.getNodes.useQuery(input, { enabled: enabled && resource === "nodes" });
  const pods = clientApi.kubernetes.pods.getPods.useQuery(input, { enabled: enabled && resource === "pods" });
  const namespaces = clientApi.kubernetes.namespaces.getNamespaces.useQuery(input, {
    enabled: enabled && resource === "namespaces",
  });
  const services = clientApi.kubernetes.services.getServices.useQuery(input, {
    enabled: enabled && resource === "services",
  });
  const ingresses = clientApi.kubernetes.ingresses.getIngresses.useQuery(input, {
    enabled: enabled && resource === "ingresses",
  });
  const volumes = clientApi.kubernetes.volumes.getVolumes.useQuery(input, {
    enabled: enabled && resource === "volumes",
  });
  const secrets = clientApi.kubernetes.secrets.getSecrets.useQuery(input, {
    enabled: enabled && resource === "secrets",
  });
  const configMaps = clientApi.kubernetes.configMaps.getConfigMaps.useQuery(input, {
    enabled: enabled && resource === "configmaps",
  });
  if (!contextId) return <WorkerQueryStatus queries={[contexts]} />;
  const unavailable = context?.status === "unavailable";
  switch (resource) {
    case "nodes":
      return (
        <Stack>
          <Title>{t("nodes")}</Title>
          {unavailable && <NodesTable contextId={contextId} initialNodes={[]} />}
          {!unavailable && (
            <WorkerQuery query={nodes}>
              {(data) => <NodesTable contextId={contextId} initialNodes={data} />}
            </WorkerQuery>
          )}
        </Stack>
      );
    case "pods":
      return (
        <Stack>
          <Title>{t("pods")}</Title>
          {unavailable && <PodsTable contextId={contextId} initialPods={[]} />}
          {!unavailable && (
            <WorkerQuery query={pods}>{(data) => <PodsTable contextId={contextId} initialPods={data} />}</WorkerQuery>
          )}
        </Stack>
      );
    case "namespaces":
      return (
        <Stack>
          <Title>{t("namespaces")}</Title>
          {unavailable && <NamespacesTable contextId={contextId} initialNamespaces={[]} />}
          {!unavailable && (
            <WorkerQuery query={namespaces}>
              {(data) => <NamespacesTable contextId={contextId} initialNamespaces={data} />}
            </WorkerQuery>
          )}
        </Stack>
      );
    case "services":
      return (
        <Stack>
          <Title>{t("services")}</Title>
          {unavailable && <ServicesTable contextId={contextId} initialServices={[]} />}
          {!unavailable && (
            <WorkerQuery query={services}>
              {(data) => <ServicesTable contextId={contextId} initialServices={data} />}
            </WorkerQuery>
          )}
        </Stack>
      );
    case "ingresses":
      return (
        <Stack>
          <Title>{t("ingresses")}</Title>
          {unavailable && <IngressesTable contextId={contextId} initialIngresses={[]} />}
          {!unavailable && (
            <WorkerQuery query={ingresses}>
              {(data) => <IngressesTable contextId={contextId} initialIngresses={data} />}
            </WorkerQuery>
          )}
        </Stack>
      );
    case "volumes":
      return (
        <Stack>
          <Title>{t("volumes")}</Title>
          {unavailable && <VolumesTable contextId={contextId} initialVolumes={[]} />}
          {!unavailable && (
            <WorkerQuery query={volumes}>
              {(data) => <VolumesTable contextId={contextId} initialVolumes={data} />}
            </WorkerQuery>
          )}
        </Stack>
      );
    case "secrets":
      return (
        <Stack>
          <Title>{t("secrets")}</Title>
          {unavailable && <SecretsTable contextId={contextId} initialSecrets={[]} />}
          {!unavailable && (
            <WorkerQuery query={secrets}>
              {(data) => <SecretsTable contextId={contextId} initialSecrets={data} />}
            </WorkerQuery>
          )}
        </Stack>
      );
    case "configmaps":
      return (
        <Stack>
          <Title>{t("configmaps")}</Title>
          {unavailable && <ConfigmapsTable contextId={contextId} initialConfigMaps={[]} />}
          {!unavailable && (
            <WorkerQuery query={configMaps}>
              {(data) => <ConfigmapsTable contextId={contextId} initialConfigMaps={data} />}
            </WorkerQuery>
          )}
        </Stack>
      );
    default:
      return <UnavailableTool />;
  }
}

function WorkerCertificatesPage() {
  const certificates = clientApi.frontend.certificates.useQuery();
  const locale = useLocale();
  const t = useI18n("certificate");
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Group justify="space-between">
          <Stack gap={4}>
            <Title>{t("page.list.title")}</Title>
            <Text>{t("page.list.description")}</Text>
          </Stack>
          <Button variant="default" component={Link} href="/manage/tools/certificates/hostnames">
            {t("page.list.toHostnames")}
          </Button>
        </Group>
        <AddCertificateSection />
        <WorkerQuery query={certificates}>
          {(data) => (
            <>
              {data.length === 0 && <NoResults icon={IconCertificateOff} title={t("page.list.noResults.title")} />}
              <SimpleGrid cols={{ sm: 1, lg: 2, xl: 3 }} spacing="lg">
                {data.map((certificate) => {
                  let icon = (
                    <IconAlertTriangle
                      color={getMantineColor("red", 6)}
                      style={{ minWidth: 32 }}
                      size={32}
                      stroke={1.5}
                    />
                  );
                  let subject = t("page.list.invalid.title");
                  let expiry = t("page.list.invalid.description");
                  let expiresAt: string | undefined;
                  if (certificate.validTo && !certificate.isError) {
                    const validTo = new Date(certificate.validTo);
                    icon = (
                      <IconCertificate
                        color={getMantineColor(certificateColor(validTo), 6)}
                        style={{ minWidth: 32 }}
                        size={32}
                        stroke={1.5}
                      />
                    );
                    subject = certificate.subject ?? "";
                    expiresAt = validTo.toISOString();
                    expiry = t("page.list.expires", {
                      when: new Intl.RelativeTimeFormat(locale).format(dayjs(validTo).diff(dayjs(), "days"), "days"),
                    });
                  }
                  return (
                    <Card key={certificate.fileName}>
                      <Group wrap="nowrap">
                        {icon}
                        <Stack flex={1} gap="xs" maw="calc(100% - 48px)">
                          <Group justify="space-between" wrap="nowrap">
                            <Text fw={500} lineClamp={1} style={{ wordBreak: "break-all" }}>
                              {subject}
                            </Text>
                            <Text c="gray.6" ta="end" size="sm">
                              {certificate.fileName}
                            </Text>
                          </Group>
                          <Group justify="space-between">
                            <Text size="sm" c="gray.6" title={expiresAt}>
                              {expiry}
                            </Text>
                            <RemoveCertificate fileName={certificate.fileName} />
                          </Group>
                        </Stack>
                      </Group>
                    </Card>
                  );
                })}
              </SimpleGrid>
            </>
          )}
        </WorkerQuery>
      </Stack>
    </>
  );
}

function WorkerTrustedHostnamesPage() {
  const hostnames = clientApi.frontend.trustedCertificateHostnames.useQuery();
  const t = useI18n("certificate");
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Group justify="space-between">
          <Stack gap={4}>
            <Title>{t("page.hostnames.title")}</Title>
            <Text>{t("page.hostnames.description")}</Text>
          </Stack>
          <Button variant="default" component={Link} href="/manage/tools/certificates">
            {t("page.hostnames.toCertificates")}
          </Button>
        </Group>
        <WorkerQuery query={hostnames}>
          {(data) => (
            <>
              {data.length === 0 && <NoResults icon={IconCertificateOff} title={t("page.hostnames.noResults.title")} />}
              {data.length > 0 && (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t("field.hostname.label")}</Table.Th>
                      <Table.Th>{t("field.subject.label")}</Table.Th>
                      <Table.Th>{t("field.fingerprint.label")}</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.map(({ hostname, thumbprint, subject }) => (
                      <Table.Tr key={`${hostname}-${thumbprint}`}>
                        <Table.Td>{hostname}</Table.Td>
                        <Table.Td>{subject}</Table.Td>
                        <Table.Td>{thumbprint}</Table.Td>
                        <Table.Td>
                          <Group justify="end">
                            <RemoveHostnameActionIcon hostname={hostname} thumbprint={thumbprint} />
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </>
          )}
        </WorkerQuery>
      </Stack>
    </>
  );
}

function certificateColor(validTo: Date) {
  const days = dayjs(validTo).diff(new Date(), "days");
  if (days < 1) return "red";
  if (days < 7) return "orange";
  if (days < 30) return "yellow";
  return "green";
}
