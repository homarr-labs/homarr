"use client";

import {
  Accordion,
  ActionIcon,
  Anchor,
  Badge,
  Group,
  Image,
  Indicator,
  ScrollArea,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import {
  IconCloud,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconFileText,
  IconServer,
  IconStack2,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useTimeAgo } from "@homarr/common";
import type {
  CoolifyApplicationWithContext,
  CoolifyServer,
  CoolifyServiceWithContext,
} from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

const COOLIFY_ICON_URL = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/coolify.svg";

export default function CoolifyWidget({ options, integrationIds, width }: WidgetComponentProps<"coolify">) {
  const t = useScopedI18n("widget.coolify");
  const integrationId = integrationIds[0];

  if (!integrationId) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text c="dimmed">{t("error.noIntegration")}</Text>
      </Stack>
    );
  }

  return <CoolifyContent integrationId={integrationId} options={options} width={width} />;
}

interface CoolifyContentProps {
  integrationId: string;
  options: WidgetComponentProps<"coolify">["options"];
  width: number;
}

function CoolifyContent({ integrationId, options, width }: CoolifyContentProps) {
  const [showIp, setShowIp] = useLocalStorage({ key: `coolify-${integrationId}-show-ip`, defaultValue: false });
  const [openSections, setOpenSections] = useLocalStorage<string[]>({
    key: `coolify-${integrationId}-sections`,
    defaultValue: ["applications"],
  });
  const [data] = clientApi.widget.coolify.getInstanceInfo.useSuspenseQuery({ integrationId });
  const relativeTime = useTimeAgo(data.updatedAt);

  const utils = clientApi.useUtils();
  clientApi.widget.coolify.subscribeInstanceInfo.useSubscription(
    { integrationId },
    {
      onData(newData) {
        utils.widget.coolify.getInstanceInfo.setData(
          { integrationId },
          {
            integrationId: newData.integrationId,
            integrationName: data.integrationName,
            integrationUrl: data.integrationUrl,
            instanceInfo: newData.instanceInfo,
            updatedAt: newData.timestamp,
          },
        );
      },
    },
  );

  const { instanceInfo, integrationUrl } = data;
  const isTiny = width < 256;
  const baseUrl = integrationUrl.replace(/\/+$/, "");
  const displayUrl = baseUrl.replace(/^https?:\/\//, "");

  const serverResourceCounts = buildServerResourceCounts(
    instanceInfo.servers,
    instanceInfo.applications,
    instanceInfo.services ?? [],
  );

  return (
    <ScrollArea h="100%">
      <Stack gap={0}>
        <CoolifyHeader isTiny={isTiny} integrationUrl={baseUrl} displayUrl={displayUrl} />

        <Accordion variant="contained" chevronPosition="right" multiple value={openSections} onChange={setOpenSections}>
          {options.showServers && (
            <ServersSection
              servers={instanceInfo.servers}
              serverResourceCounts={serverResourceCounts}
              isTiny={isTiny}
              showIp={showIp}
              onToggleIp={() => setShowIp((v) => !v)}
              integrationUrl={baseUrl}
            />
          )}
          {options.showApplications && (
            <ApplicationsSection applications={instanceInfo.applications} isTiny={isTiny} integrationUrl={baseUrl} />
          )}
          {options.showServices && (
            <ServicesSection services={instanceInfo.services ?? []} isTiny={isTiny} integrationUrl={baseUrl} />
          )}
        </Accordion>

        <CoolifyFooter version={instanceInfo.version} relativeTime={relativeTime} />
      </Stack>
    </ScrollArea>
  );
}

function buildServerResourceCounts(
  servers: CoolifyServer[],
  applications: CoolifyApplicationWithContext[],
  services: CoolifyServiceWithContext[],
) {
  const serverResourceCounts = new Map<number, { apps: number; services: number }>();

  for (const server of servers) {
    const serverId = server.settings?.server_id ?? server.id ?? 0;
    serverResourceCounts.set(serverId, { apps: 0, services: 0 });
  }

  const destinationToServer = new Map<number, number>();
  for (const service of services) {
    if (service.destination_id != null && service.server_id != null) {
      destinationToServer.set(service.destination_id, service.server_id);
    }
  }

  for (const app of applications) {
    const serverId = app.server_id ?? destinationToServer.get(app.destination_id ?? 0) ?? app.destination_id ?? 0;
    const counts = serverResourceCounts.get(serverId);
    if (counts) {
      counts.apps++;
    }
  }

  for (const service of services) {
    const serverId = service.server_id ?? service.destination_id ?? 0;
    const counts = serverResourceCounts.get(serverId);
    if (counts) {
      counts.services++;
    }
  }

  return serverResourceCounts;
}

interface CoolifyHeaderProps {
  isTiny: boolean;
  integrationUrl: string;
  displayUrl: string;
}

function CoolifyHeader({ isTiny, integrationUrl, displayUrl }: CoolifyHeaderProps) {
  return (
    <Group p="xs" justify="center" gap="xs" style={{ borderBottom: "2px solid #8B5CF6" }}>
      <Group gap={2}>
        <Image src={COOLIFY_ICON_URL} alt="Coolify" w={isTiny ? 18 : 24} h={isTiny ? 18 : 24} />
        <Text fz={isTiny ? "xs" : "sm"} fw={700} style={{ color: "#8B5CF6" }}>
          oolify
        </Text>
      </Group>
      <Anchor href={integrationUrl} target="_blank" fz={isTiny ? "xs" : "sm"} fw={500} c="dimmed" lineClamp={1}>
        {displayUrl}
      </Anchor>
    </Group>
  );
}

interface CoolifyFooterProps {
  version: string;
  relativeTime: string;
}

function CoolifyFooter({ version, relativeTime }: CoolifyFooterProps) {
  const t = useScopedI18n("widget.coolify");
  return (
    <Group justify="space-between" p={4} style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
      <Group gap={2}>
        <Image src={COOLIFY_ICON_URL} alt="Coolify" w={16} h={16} />
        <Text size="xs" c="dimmed">
          v{version}
        </Text>
      </Group>
      <Text size="xs" c="dimmed">
        {t("footer.updated", { when: relativeTime })}
      </Text>
    </Group>
  );
}

interface ServersSectionProps {
  servers: CoolifyServer[];
  serverResourceCounts: Map<number, { apps: number; services: number }>;
  isTiny: boolean;
  showIp: boolean;
  onToggleIp: () => void;
  integrationUrl: string;
}

function ServersSection({
  servers,
  serverResourceCounts,
  isTiny,
  showIp,
  onToggleIp,
  integrationUrl,
}: ServersSectionProps) {
  const t = useScopedI18n("widget.coolify");
  const onlineServers = servers.filter((s) => s.is_reachable !== false).length;

  return (
    <Accordion.Item value="servers">
      <Accordion.Control icon={isTiny ? null : <IconServer size={16} />}>
        <Group gap="xs">
          <Text size="xs">{t("tab.servers")}</Text>
          <Badge variant="dot" color={getBadgeColor(onlineServers, servers.length)} size="xs">
            {onlineServers} / {servers.length}
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel p={4}>
        {servers.length > 0 ? (
          <ServersTable
            servers={servers}
            serverResourceCounts={serverResourceCounts}
            isTiny={isTiny}
            showIp={showIp}
            onToggleIp={onToggleIp}
            integrationUrl={integrationUrl}
          />
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="xs">
            {t("empty.servers")}
          </Text>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

interface ServersTableProps {
  servers: CoolifyServer[];
  serverResourceCounts: Map<number, { apps: number; services: number }>;
  isTiny: boolean;
  showIp: boolean;
  onToggleIp: () => void;
  integrationUrl: string;
}

function ServersTable({
  servers,
  serverResourceCounts,
  isTiny,
  showIp,
  onToggleIp,
  integrationUrl,
}: ServersTableProps) {
  const t = useScopedI18n("widget.coolify");

  return (
    <Table highlightOnHover verticalSpacing={2} horizontalSpacing={4}>
      <Table.Thead>
        <Table.Tr fz={isTiny ? "8px" : "xs"}>
          <Table.Th ta="start" p={0}>
            {t("table.name")}
          </Table.Th>
          {!isTiny && (
            <Table.Th ta="start" p={0}>
              <Group gap={4} wrap="nowrap">
                {t("table.ip")}
                <ActionIcon size="xs" variant="subtle" onClick={onToggleIp}>
                  {showIp ? <IconEye size={12} /> : <IconEyeOff size={12} />}
                </ActionIcon>
              </Group>
            </Table.Th>
          )}
          <Table.Th ta="center" p={0}>
            {t("table.resources")}
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {servers.map((server) => (
          <ServerRow
            key={server.uuid}
            server={server}
            counts={serverResourceCounts.get(server.settings?.server_id ?? server.id ?? 0) ?? { apps: 0, services: 0 }}
            isTiny={isTiny}
            showIp={showIp}
            integrationUrl={integrationUrl}
          />
        ))}
      </Table.Tbody>
    </Table>
  );
}

interface ServerRowProps {
  server: CoolifyServer;
  counts: { apps: number; services: number };
  isTiny: boolean;
  showIp: boolean;
  integrationUrl: string;
}

function ServerRow({ server, counts, isTiny, showIp, integrationUrl }: ServerRowProps) {
  const t = useScopedI18n("widget.coolify");
  const isBuildServer = server.settings?.is_build_server === true;
  const isOnline = server.is_reachable !== false;
  const serverUrl = `${integrationUrl}/server/${server.uuid}`;

  return (
    <Table.Tr fz={isTiny ? "8px" : "xs"}>
      <Table.Td>
        <Group wrap="nowrap" gap={isTiny ? 4 : "xs"}>
          <Indicator size={isTiny ? 4 : 8} color={isOnline ? "green" : "red"} />
          <Anchor href={serverUrl} target="_blank" fz={isTiny ? "8px" : "xs"} c="inherit" lineClamp={1}>
            {server.name}
          </Anchor>
          {!isTiny && (
            <ActionIcon component="a" href={serverUrl} target="_blank" size="xs" variant="subtle" c="dimmed">
              <IconExternalLink size={12} />
            </ActionIcon>
          )}
        </Group>
      </Table.Td>
      {!isTiny && (
        <Table.Td>
          <Text fz="xs" c="dimmed">
            {showIp ? server.ip : "***.***.***.***"}
          </Text>
        </Table.Td>
      )}
      <Table.Td ta="center">
        {isBuildServer ? (
          <Badge size="xs" variant="light" color="violet">
            {t("server.buildServer")}
          </Badge>
        ) : (
          <Text fz={isTiny ? "8px" : "xs"} c="dimmed">
            {counts.apps} / {counts.services}
          </Text>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

interface ApplicationsSectionProps {
  applications: CoolifyApplicationWithContext[];
  isTiny: boolean;
  integrationUrl: string;
}

function ApplicationsSection({ applications, isTiny, integrationUrl }: ApplicationsSectionProps) {
  const t = useScopedI18n("widget.coolify");
  const runningApps = applications.filter((app) => parseStatus(app.status) === "running").length;

  return (
    <Accordion.Item value="applications">
      <Accordion.Control icon={isTiny ? null : <IconCloud size={16} />}>
        <Group gap="xs">
          <Text size="xs">{t("tab.applications")}</Text>
          <Badge variant="dot" color={getBadgeColor(runningApps, applications.length)} size="xs">
            {runningApps} / {applications.length}
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel p={4}>
        {applications.length > 0 ? (
          <ResourceTable
            items={applications}
            isTiny={isTiny}
            integrationUrl={integrationUrl}
            resourceType="application"
          />
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="xs">
            {t("empty.applications")}
          </Text>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

interface ServicesSectionProps {
  services: CoolifyServiceWithContext[];
  isTiny: boolean;
  integrationUrl: string;
}

function ServicesSection({ services, isTiny, integrationUrl }: ServicesSectionProps) {
  const t = useScopedI18n("widget.coolify");
  const runningServices = services.filter((svc) => parseStatus(svc.status ?? "") === "running").length;

  return (
    <Accordion.Item value="services">
      <Accordion.Control icon={isTiny ? null : <IconStack2 size={16} />}>
        <Group gap="xs">
          <Text size="xs">{t("tab.services")}</Text>
          <Badge variant="dot" color={getBadgeColor(runningServices, services.length)} size="xs">
            {runningServices} / {services.length}
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel p={4}>
        {services.length > 0 ? (
          <ResourceTable items={services} isTiny={isTiny} integrationUrl={integrationUrl} resourceType="service" />
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="xs">
            {t("empty.services")}
          </Text>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

interface ResourceTableProps {
  items: Array<{
    uuid: string;
    name: string;
    status?: string;
    projectName?: string;
    projectUuid?: string;
    environmentName?: string;
    environmentUuid?: string;
  }>;
  isTiny: boolean;
  integrationUrl: string;
  resourceType: "application" | "service";
}

function ResourceTable({ items, isTiny, integrationUrl, resourceType }: ResourceTableProps) {
  const t = useScopedI18n("widget.coolify");

  return (
    <Table highlightOnHover verticalSpacing={2} horizontalSpacing={4}>
      <Table.Thead>
        <Table.Tr fz={isTiny ? "8px" : "xs"}>
          <Table.Th ta="start" p={0}>
            {t("table.name")}
          </Table.Th>
          {!isTiny && (
            <Table.Th ta="start" p={0}>
              {t("table.project")}
            </Table.Th>
          )}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {items.map((item) => (
          <ResourceRow
            key={item.uuid}
            item={item}
            isTiny={isTiny}
            integrationUrl={integrationUrl}
            resourceType={resourceType}
          />
        ))}
      </Table.Tbody>
    </Table>
  );
}

interface ResourceRowProps {
  item: {
    uuid: string;
    name: string;
    status?: string;
    projectName?: string;
    projectUuid?: string;
    environmentName?: string;
    environmentUuid?: string;
  };
  isTiny: boolean;
  integrationUrl: string;
  resourceType: "application" | "service";
}

function ResourceRow({ item, isTiny, integrationUrl, resourceType }: ResourceRowProps) {
  const status = parseStatus(item.status ?? "");
  const statusColor = getStatusColor(status);

  const resourceUrl =
    item.projectUuid && item.environmentUuid
      ? `${integrationUrl}/project/${item.projectUuid}/environment/${item.environmentUuid}/${resourceType}/${item.uuid}`
      : undefined;

  const logsUrl = resourceUrl ? `${resourceUrl}/logs` : undefined;

  return (
    <Table.Tr fz={isTiny ? "8px" : "xs"}>
      <Table.Td>
        <Group wrap="nowrap" gap={isTiny ? 4 : "xs"}>
          <Indicator size={isTiny ? 4 : 8} color={statusColor} />
          {resourceUrl ? (
            <Anchor href={resourceUrl} target="_blank" fz={isTiny ? "8px" : "xs"} c="inherit" lineClamp={1}>
              {item.name}
            </Anchor>
          ) : (
            <Text lineClamp={1} fz={isTiny ? "8px" : "xs"}>
              {item.name}
            </Text>
          )}
          {!isTiny && resourceUrl && (
            <ActionIcon component="a" href={resourceUrl} target="_blank" size="xs" variant="subtle" c="dimmed">
              <IconExternalLink size={12} />
            </ActionIcon>
          )}
          {!isTiny && logsUrl && (
            <ActionIcon component="a" href={logsUrl} target="_blank" size="xs" variant="subtle" c="dimmed">
              <IconFileText size={12} />
            </ActionIcon>
          )}
        </Group>
      </Table.Td>
      {!isTiny && (
        <Table.Td>
          <Text fz="xs" c="dimmed" lineClamp={1}>
            {item.projectName ?? "-"} / {item.environmentName ?? "-"}
          </Text>
        </Table.Td>
      )}
    </Table.Tr>
  );
}

function parseStatus(status: string): string {
  return status.split(":")[0]?.toLowerCase() ?? "unknown";
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    running: "green",
    stopped: "red",
    exited: "red",
    starting: "yellow",
    restarting: "yellow",
  };
  return colors[status] ?? "gray";
}

function getBadgeColor(running: number, total: number): string {
  if (total === 0) return "gray";
  if (running === total) return "green";
  if (running > 0) return "orange";
  return "red";
}
