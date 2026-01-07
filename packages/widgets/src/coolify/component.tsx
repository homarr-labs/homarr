"use client";

import {
  Accordion,
  ActionIcon,
  Anchor,
  Badge,
  Card,
  Group,
  Image,
  Indicator,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import {
  IconCloud,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconFileText,
  IconLink,
  IconServer,
  IconStack2,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useTimeAgo } from "@homarr/common";
import type {
  CoolifyApplicationWithContext,
  CoolifyInstanceInfo,
  CoolifyServer,
  CoolifyServiceWithContext,
} from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import {
  buildServerResourceCounts,
  cleanFqdn,
  createWidgetKey,
  getBadgeColor,
  getResourceTimestamp,
  getStatusColor,
  parseStatus,
} from "./coolify-utils";

const COOLIFY_ICON_URL = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/coolify.svg";

interface InstanceData {
  integrationId: string;
  integrationName: string;
  integrationUrl: string;
  instanceInfo: CoolifyInstanceInfo;
  updatedAt: Date;
}

export default function CoolifyWidget({ options, integrationIds, width }: WidgetComponentProps<"coolify">) {
  const t = useScopedI18n("widget.coolify");

  if (integrationIds.length === 0) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text c="dimmed">{t("error.noIntegration")}</Text>
      </Stack>
    );
  }

  return <CoolifyContent integrationIds={integrationIds} options={options} width={width} />;
}

interface CoolifyContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"coolify">["options"];
  width: number;
}

function CoolifyContent({ integrationIds, options, width }: CoolifyContentProps) {
  const [instancesData] = clientApi.widget.coolify.getInstancesInfo.useSuspenseQuery({ integrationIds });

  const utils = clientApi.useUtils();
  clientApi.widget.coolify.subscribeInstancesInfo.useSubscription(
    { integrationIds },
    {
      onData(newData: { integrationId: string; instanceInfo: CoolifyInstanceInfo; timestamp: Date }) {
        utils.widget.coolify.getInstancesInfo.setData({ integrationIds }, (prevData) => {
          if (!prevData) return prevData;
          return prevData.map((instance) =>
            instance.integrationId === newData.integrationId
              ? { ...instance, instanceInfo: newData.instanceInfo, updatedAt: newData.timestamp }
              : instance,
          );
        });
      },
    },
  );

  const isTiny = width < 256;
  const [firstInstance] = instancesData;
  const widgetKey = createWidgetKey(integrationIds);

  if (instancesData.length === 1 && firstInstance) {
    return <SingleInstanceLayout instance={firstInstance} options={options} isTiny={isTiny} widgetKey={widgetKey} />;
  }

  return (
    <ScrollArea h="100%">
      <Stack gap="xs" p="xs">
        {instancesData.map((instance) => (
          <InstanceCard
            key={instance.integrationId}
            instance={instance}
            options={options}
            isTiny={isTiny}
            widgetKey={widgetKey}
          />
        ))}
      </Stack>
    </ScrollArea>
  );
}

interface SingleInstanceLayoutProps {
  instance: InstanceData;
  options: WidgetComponentProps<"coolify">["options"];
  isTiny: boolean;
  widgetKey: string;
}

function SingleInstanceLayout({ instance, options, isTiny, widgetKey }: SingleInstanceLayoutProps) {
  const t = useScopedI18n("widget.coolify");
  const [showIp, setShowIp] = useLocalStorage({
    key: `coolify-show-ip-${widgetKey}`,
    defaultValue: false,
  });
  const [openSections, setOpenSections] = useLocalStorage<string[]>({
    key: `coolify-sections-${widgetKey}`,
    defaultValue: ["applications"],
  });

  const serverResourceCounts = buildServerResourceCounts(
    instance.instanceInfo.servers,
    instance.instanceInfo.applications,
    instance.instanceInfo.services,
  );

  const baseUrl = instance.integrationUrl.replace(/\/+$/, "");
  const displayUrl = baseUrl.replace(/^https?:\/\//, "");
  const relativeTime = useTimeAgo(instance.updatedAt);

  return (
    <ScrollArea h="100%">
      <Stack gap={0}>
        <Group p="xs" justify="center" gap="xs" style={{ borderBottom: "2px solid #8B5CF6" }}>
          <Group gap={2}>
            <Image src={COOLIFY_ICON_URL} alt="Coolify" w={isTiny ? 18 : 24} h={isTiny ? 18 : 24} />
            <Text fz={isTiny ? "xs" : "sm"} fw={700} style={{ color: "#8B5CF6" }}>
              oolify
            </Text>
          </Group>
          <Anchor href={baseUrl} target="_blank" fz={isTiny ? "xs" : "sm"} fw={500} c="dimmed" lineClamp={1}>
            {displayUrl}
          </Anchor>
        </Group>

        <Accordion variant="contained" chevronPosition="right" multiple value={openSections} onChange={setOpenSections}>
          {options.showServers && (
            <ServersSection
              servers={instance.instanceInfo.servers}
              serverResourceCounts={serverResourceCounts}
              baseUrl={baseUrl}
              isTiny={isTiny}
              showIp={showIp}
              onToggleIp={() => setShowIp((prev) => !prev)}
            />
          )}
          {options.showApplications && (
            <ApplicationsSection applications={instance.instanceInfo.applications} baseUrl={baseUrl} isTiny={isTiny} />
          )}
          {options.showServices && (
            <ServicesSection services={instance.instanceInfo.services} baseUrl={baseUrl} isTiny={isTiny} />
          )}
        </Accordion>

        <Group justify="space-between" p={4} style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
          <Group gap={2}>
            <Image src={COOLIFY_ICON_URL} alt="Coolify" w={16} h={16} />
            <Text size="xs" c="dimmed">
              v{instance.instanceInfo.version}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {t("footer.updated", { when: relativeTime })}
          </Text>
        </Group>
      </Stack>
    </ScrollArea>
  );
}

interface InstanceCardProps {
  instance: InstanceData;
  options: WidgetComponentProps<"coolify">["options"];
  isTiny: boolean;
  widgetKey: string;
}

function InstanceCard({ instance, options, isTiny, widgetKey }: InstanceCardProps) {
  const t = useScopedI18n("widget.coolify");
  const cardKey = `${widgetKey}-${instance.integrationId}`;
  const [showIp, setShowIp] = useLocalStorage({
    key: `coolify-show-ip-${cardKey}`,
    defaultValue: false,
  });
  const [openSections, setOpenSections] = useLocalStorage<string[]>({
    key: `coolify-sections-${cardKey}`,
    defaultValue: ["applications"],
  });

  const serverResourceCounts = buildServerResourceCounts(
    instance.instanceInfo.servers,
    instance.instanceInfo.applications,
    instance.instanceInfo.services,
  );

  const baseUrl = instance.integrationUrl.replace(/\/+$/, "");
  const relativeTime = useTimeAgo(instance.updatedAt);

  const onlineServers = instance.instanceInfo.servers.filter((s) => s.is_reachable !== false).length;
  const runningApps = instance.instanceInfo.applications.filter((a) => parseStatus(a.status) === "running").length;
  const runningServices = instance.instanceInfo.services.filter(
    (s) => parseStatus(s.status ?? "") === "running",
  ).length;

  return (
    <Card p={0} radius="sm" withBorder>
      <Group
        p="xs"
        justify="space-between"
        wrap="nowrap"
        style={{ borderBottom: "1px solid var(--mantine-color-dark-4)" }}
      >
        <Group gap={4} wrap="nowrap">
          <Image src={COOLIFY_ICON_URL} alt="Coolify" w={16} h={16} />
          <Anchor href={baseUrl} target="_blank" fz={isTiny ? "10px" : "xs"} fw={600} c="inherit" lineClamp={1}>
            {instance.integrationName}
          </Anchor>
        </Group>
        <Group gap={4} wrap="nowrap">
          {options.showServers && (
            <Badge variant="dot" color={getBadgeColor(onlineServers, instance.instanceInfo.servers.length)} size="xs">
              {onlineServers}/{instance.instanceInfo.servers.length}
            </Badge>
          )}
          {options.showApplications && (
            <Badge
              variant="dot"
              color={getBadgeColor(runningApps, instance.instanceInfo.applications.length)}
              size="xs"
            >
              {runningApps}/{instance.instanceInfo.applications.length}
            </Badge>
          )}
          {options.showServices && (
            <Badge
              variant="dot"
              color={getBadgeColor(runningServices, instance.instanceInfo.services.length)}
              size="xs"
            >
              {runningServices}/{instance.instanceInfo.services.length}
            </Badge>
          )}
        </Group>
      </Group>

      <Accordion variant="filled" chevronPosition="right" multiple value={openSections} onChange={setOpenSections}>
        {options.showServers && (
          <ServersSection
            servers={instance.instanceInfo.servers}
            serverResourceCounts={serverResourceCounts}
            baseUrl={baseUrl}
            isTiny={isTiny}
            showIp={showIp}
            onToggleIp={() => setShowIp((prev) => !prev)}
          />
        )}
        {options.showApplications && (
          <ApplicationsSection applications={instance.instanceInfo.applications} baseUrl={baseUrl} isTiny={isTiny} />
        )}
        {options.showServices && (
          <ServicesSection services={instance.instanceInfo.services} baseUrl={baseUrl} isTiny={isTiny} />
        )}
      </Accordion>

      <Group justify="space-between" p={4} style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
        <Text size="10px" c="dimmed">
          v{instance.instanceInfo.version}
        </Text>
        <Text size="10px" c="dimmed">
          {t("footer.updated", { when: relativeTime })}
        </Text>
      </Group>
    </Card>
  );
}

interface ServersSectionProps {
  servers: CoolifyServer[];
  serverResourceCounts: Map<number, { apps: number; services: number }>;
  baseUrl: string;
  isTiny: boolean;
  showIp: boolean;
  onToggleIp: () => void;
}

function ServersSection({ servers, serverResourceCounts, baseUrl, isTiny, showIp, onToggleIp }: ServersSectionProps) {
  const t = useScopedI18n("widget.coolify");
  const tCommon = useScopedI18n("common");
  const onlineServers = servers.filter((server) => server.is_reachable !== false).length;

  return (
    <Accordion.Item value="servers">
      <Accordion.Control icon={isTiny ? null : <IconServer size={16} />}>
        <Group gap="xs" justify="space-between" wrap="nowrap" style={{ flex: 1 }}>
          <Group gap="xs">
            <Text size="xs">{tCommon("servers")}</Text>
            <Badge variant="dot" color={getBadgeColor(onlineServers, servers.length)} size="xs">
              {onlineServers} / {servers.length}
            </Badge>
          </Group>
          <ActionIcon
            size="xs"
            variant="subtle"
            c="dimmed"
            onClick={(event) => {
              event.stopPropagation();
              onToggleIp();
            }}
          >
            {showIp ? <IconEye size={12} /> : <IconEyeOff size={12} />}
          </ActionIcon>
        </Group>
      </Accordion.Control>
      <Accordion.Panel p={4}>
        {servers.length > 0 ? (
          <Stack gap={4}>
            {servers.map((server) => (
              <ServerRow
                key={server.uuid}
                server={server}
                counts={
                  serverResourceCounts.get(server.settings?.server_id ?? server.id ?? 0) ?? { apps: 0, services: 0 }
                }
                baseUrl={baseUrl}
                isTiny={isTiny}
                showIp={showIp}
              />
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="xs">
            {t("empty.servers")}
          </Text>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

interface ServerRowProps {
  server: CoolifyServer;
  counts: { apps: number; services: number };
  baseUrl: string;
  isTiny: boolean;
  showIp: boolean;
}

function ServerRow({ server, counts, baseUrl, isTiny, showIp }: ServerRowProps) {
  const t = useScopedI18n("widget.coolify");
  const isBuildServer = server.settings?.is_build_server === true;
  const isOnline = server.is_reachable !== false;
  const serverUrl = `${baseUrl}/server/${server.uuid}`;

  return (
    <Stack gap={0}>
      <Group wrap="nowrap" gap={isTiny ? 4 : "xs"}>
        <Indicator size={isTiny ? 4 : 8} color={isOnline ? "green" : "red"} />
        <Anchor href={serverUrl} target="_blank" fz={isTiny ? "8px" : "xs"} c="inherit" lineClamp={1}>
          {server.name}
        </Anchor>
        {isBuildServer ? (
          <Badge size="xs" variant="light" color="violet">
            {t("server.buildServer")}
          </Badge>
        ) : (
          <Text fz="10px" c="dimmed">
            ({counts.apps} apps / {counts.services} svcs)
          </Text>
        )}
      </Group>
      <Group wrap="nowrap" gap={4} ml={16}>
        <ActionIcon component="a" href={serverUrl} target="_blank" size="xs" variant="subtle" c="dimmed">
          <IconExternalLink size={12} />
        </ActionIcon>
        <Text fz="10px" c="dimmed">
          {showIp ? server.ip : "***.***.***.***"}
        </Text>
      </Group>
    </Stack>
  );
}

interface ApplicationsSectionProps {
  applications: CoolifyApplicationWithContext[];
  baseUrl: string;
  isTiny: boolean;
}

function ApplicationsSection({ applications, baseUrl, isTiny }: ApplicationsSectionProps) {
  const t = useScopedI18n("widget.coolify");
  const tCommon = useScopedI18n("common");
  const runningApps = applications.filter((app) => parseStatus(app.status) === "running").length;

  return (
    <Accordion.Item value="applications">
      <Accordion.Control icon={isTiny ? null : <IconCloud size={16} />}>
        <Group gap="xs">
          <Text size="xs">{tCommon("applications")}</Text>
          <Badge variant="dot" color={getBadgeColor(runningApps, applications.length)} size="xs">
            {runningApps} / {applications.length}
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel p={4}>
        {applications.length > 0 ? (
          <Stack gap={4}>
            {applications.map((app) => (
              <ResourceRow key={app.uuid} item={app} baseUrl={baseUrl} isTiny={isTiny} resourceType="application" />
            ))}
          </Stack>
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
  baseUrl: string;
  isTiny: boolean;
}

function ServicesSection({ services, baseUrl, isTiny }: ServicesSectionProps) {
  const t = useScopedI18n("widget.coolify");
  const tCommon = useScopedI18n("common");
  const runningServices = services.filter((svc) => parseStatus(svc.status ?? "") === "running").length;

  return (
    <Accordion.Item value="services">
      <Accordion.Control icon={isTiny ? null : <IconStack2 size={16} />}>
        <Group gap="xs">
          <Text size="xs">{tCommon("services")}</Text>
          <Badge variant="dot" color={getBadgeColor(runningServices, services.length)} size="xs">
            {runningServices} / {services.length}
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel p={4}>
        {services.length > 0 ? (
          <Stack gap={4}>
            {services.map((service) => (
              <ResourceRow key={service.uuid} item={service} baseUrl={baseUrl} isTiny={isTiny} resourceType="service" />
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="xs">
            {t("empty.services")}
          </Text>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

interface ResourceRowProps {
  item: {
    uuid: string;
    name: string;
    status?: string;
    fqdn?: string | null;
    updated_at?: string;
    last_online_at?: string;
    projectName?: string;
    projectUuid?: string;
    environmentName?: string;
    environmentUuid?: string;
  };
  baseUrl: string;
  isTiny: boolean;
  resourceType: "application" | "service";
}

function ResourceRow({ item, baseUrl, isTiny, resourceType }: ResourceRowProps) {
  const status = parseStatus(item.status ?? "");
  const statusColor = getStatusColor(status);

  const resourceUrl =
    item.projectUuid && item.environmentUuid
      ? `${baseUrl}/project/${item.projectUuid}/environment/${item.environmentUuid}/${resourceType}/${item.uuid}`
      : undefined;

  const logsUrl = resourceUrl ? `${resourceUrl}/logs` : undefined;

  return (
    <Stack gap={0}>
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
      </Group>
      <Group wrap="nowrap" gap={4} ml={16}>
        {cleanFqdn(item.fqdn) && (
          <ActionIcon component="a" href={cleanFqdn(item.fqdn)} target="_blank" size="xs" variant="subtle" c="dimmed">
            <IconLink size={12} />
          </ActionIcon>
        )}
        {resourceUrl && (
          <ActionIcon component="a" href={resourceUrl} target="_blank" size="xs" variant="subtle" c="dimmed">
            <IconExternalLink size={12} />
          </ActionIcon>
        )}
        {logsUrl && (
          <ActionIcon component="a" href={logsUrl} target="_blank" size="xs" variant="subtle" c="dimmed">
            <IconFileText size={12} />
          </ActionIcon>
        )}
        <Text fz="10px" c="dimmed" lineClamp={1}>
          {item.projectName ?? "-"} / {item.environmentName ?? "-"}
        </Text>
        {getResourceTimestamp(item, resourceType) && (
          <Text fz="10px" c="dimmed" ml="auto">
            {getResourceTimestamp(item, resourceType)}
          </Text>
        )}
      </Group>
    </Stack>
  );
}
