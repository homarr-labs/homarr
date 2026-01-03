"use client";

import { Accordion, Badge, Group, Indicator, ScrollArea, Stack, Table, Text } from "@mantine/core";
import { IconCloud, IconServer, IconStack2 } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useTimeAgo } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

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
  const t = useScopedI18n("widget.coolify");
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
  const displayUrl = integrationUrl.replace(/^https?:\/\//, "");

  const runningApps = instanceInfo.applications.filter((app) => parseStatus(app.status) === "running").length;
  const totalApps = instanceInfo.applications.length;

  const services = instanceInfo.services ?? [];
  const runningServices = services.filter((svc) => parseStatus(svc.status ?? "") === "running").length;
  const totalServices = services.length;

  // Build a map of server IDs to resource counts
  // Coolify Cloud uses settings.server_id, self-hosted uses server.id
  const serverResourceCounts = new Map<number, { apps: number; services: number }>();
  for (const server of instanceInfo.servers) {
    const serverId = server.settings?.server_id ?? server.id ?? 0;
    serverResourceCounts.set(serverId, { apps: 0, services: 0 });
  }
  // Apps/Services have server_id field that matches settings.server_id in Coolify Cloud
  for (const app of instanceInfo.applications) {
    const serverId = app.server_id ?? app.destination_id ?? 0;
    if (serverResourceCounts.has(serverId)) {
      const counts = serverResourceCounts.get(serverId)!;
      counts.apps++;
    }
  }
  for (const service of instanceInfo.services ?? []) {
    const serverId = service.server_id ?? service.destination_id ?? 0;
    if (serverResourceCounts.has(serverId)) {
      const counts = serverResourceCounts.get(serverId)!;
      counts.services++;
    }
  }

  const getAccordionBadgeColor = (running: number, total: number) => {
    if (total === 0) return "gray";
    if (running === total) return "green";
    if (running > 0) return "orange";
    return "red";
  };

  const defaultOpenSections = ["applications"];

  return (
    <ScrollArea h="100%">
      <Stack gap={0}>
        <Group
          p="xs"
          justify="center"
          gap="xs"
          style={{
            borderBottom: "2px solid #8B5CF6",
          }}
        >
          <Group gap={2}>
            <img
              src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/coolify.svg"
              alt="Coolify"
              width={isTiny ? 18 : 24}
              height={isTiny ? 18 : 24}
            />
            <Text fz={isTiny ? "xs" : "sm"} fw={700} style={{ color: "#8B5CF6" }}>
              oolify
            </Text>
          </Group>
          <Text fz={isTiny ? "xs" : "sm"} fw={500} c="dimmed" lineClamp={1}>
            {displayUrl}
          </Text>
        </Group>

        <Accordion variant="contained" chevronPosition="right" multiple defaultValue={defaultOpenSections}>
          {options.showServers && (
            <Accordion.Item value="servers">
              <Accordion.Control icon={isTiny ? null : <IconServer size={16} />}>
                <Group gap="xs">
                  <Text size="xs">{t("tab.servers")}</Text>
                  <Badge variant="light" color="gray" size="xs">
                    {instanceInfo.servers.length}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                {instanceInfo.servers.length > 0 ? (
                  <Table highlightOnHover>
                    <Table.Thead>
                      <Table.Tr fz={isTiny ? "8px" : "xs"}>
                        <Table.Th ta="start" p={0}>
                          {t("table.name")}
                        </Table.Th>
                        {!isTiny && (
                          <Table.Th ta="start" p={0}>
                            {t("table.ip")}
                          </Table.Th>
                        )}
                        <Table.Th ta="center" p={0}>
                          {t("table.resources")}
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {instanceInfo.servers.map((server) => {
                        const serverId = server.settings?.server_id ?? server.id ?? 0;
                        const counts = serverResourceCounts.get(serverId) ?? { apps: 0, services: 0 };
                        const isBuildServer = server.settings?.is_build_server === true;
                        return (
                          <Table.Tr key={server.uuid} fz={isTiny ? "8px" : "xs"}>
                            <Table.Td>
                              <Group wrap="nowrap" gap={isTiny ? 4 : "xs"}>
                                <Indicator size={isTiny ? 4 : 8} color="green" />
                                <Text lineClamp={1} fz={isTiny ? "8px" : "xs"}>
                                  {server.name}
                                </Text>
                                {isBuildServer && (
                                  <Badge size="xs" variant="light" color="violet">
                                    {t("server.buildServer")}
                                  </Badge>
                                )}
                              </Group>
                            </Table.Td>
                            {!isTiny && (
                              <Table.Td>
                                <Text fz="xs" c="dimmed">
                                  {server.ip}
                                </Text>
                              </Table.Td>
                            )}
                            <Table.Td ta="center">
                              <Text fz={isTiny ? "8px" : "xs"} c="dimmed">
                                {counts.apps} / {counts.services}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text size="sm" c="dimmed" ta="center" py="xs">
                    {t("empty.servers")}
                  </Text>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          )}

          {options.showApplications && (
            <Accordion.Item value="applications">
              <Accordion.Control icon={isTiny ? null : <IconCloud size={16} />}>
                <Group gap="xs">
                  <Text size="xs">{t("tab.applications")}</Text>
                  <Badge variant="dot" color={getAccordionBadgeColor(runningApps, totalApps)} size="xs">
                    {runningApps} / {totalApps}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                {instanceInfo.applications.length > 0 ? (
                  <Table highlightOnHover>
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
                      {instanceInfo.applications.map((app) => {
                        const status = parseStatus(app.status);
                        const statusColor = getStatusColor(status);
                        return (
                          <Table.Tr key={app.uuid} fz={isTiny ? "8px" : "xs"}>
                            <Table.Td>
                              <Group wrap="nowrap" gap={isTiny ? 4 : "xs"}>
                                <Indicator size={isTiny ? 4 : 8} color={statusColor} />
                                <Text lineClamp={1} fz={isTiny ? "8px" : "xs"}>
                                  {app.name}
                                </Text>
                              </Group>
                            </Table.Td>
                            {!isTiny && (
                              <Table.Td>
                                <Text fz="xs" c="dimmed" lineClamp={1}>
                                  {app.projectName ?? "-"} / {app.environmentName ?? "-"}
                                </Text>
                              </Table.Td>
                            )}
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text size="sm" c="dimmed" ta="center" py="xs">
                    {t("empty.applications")}
                  </Text>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          )}

          {options.showServices && (
            <Accordion.Item value="services">
              <Accordion.Control icon={isTiny ? null : <IconStack2 size={16} />}>
                <Group gap="xs">
                  <Text size="xs">{t("tab.services")}</Text>
                  <Badge variant="dot" color={getAccordionBadgeColor(runningServices, totalServices)} size="xs">
                    {runningServices} / {totalServices}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                {services.length > 0 ? (
                  <Table highlightOnHover>
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
                      {services.map((svc) => {
                        const status = parseStatus(svc.status ?? "");
                        const statusColor = getStatusColor(status);
                        return (
                          <Table.Tr key={svc.uuid} fz={isTiny ? "8px" : "xs"}>
                            <Table.Td>
                              <Group wrap="nowrap" gap={isTiny ? 4 : "xs"}>
                                <Indicator size={isTiny ? 4 : 8} color={statusColor} />
                                <Text lineClamp={1} fz={isTiny ? "8px" : "xs"}>
                                  {svc.name}
                                </Text>
                              </Group>
                            </Table.Td>
                            {!isTiny && (
                              <Table.Td>
                                <Text fz="xs" c="dimmed" lineClamp={1}>
                                  {svc.projectName ?? "-"} / {svc.environmentName ?? "-"}
                                </Text>
                              </Table.Td>
                            )}
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text size="sm" c="dimmed" ta="center" py="xs">
                    {t("empty.services")}
                  </Text>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          )}
        </Accordion>

        <Group justify="space-between" p={4} style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
          <Group gap={2}>
            <img
              src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/coolify.svg"
              alt="Coolify"
              width={16}
              height={16}
            />
            <Text size="xs" c="dimmed">
              v{instanceInfo.version}
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

function parseStatus(status: string): string {
  return status.split(":")[0]?.toLowerCase() ?? "unknown";
}

function getStatusColor(status: string): string {
  switch (status) {
    case "running":
      return "green";
    case "stopped":
    case "exited":
      return "red";
    case "starting":
    case "restarting":
      return "yellow";
    default:
      return "gray";
  }
}
