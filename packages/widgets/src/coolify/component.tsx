"use client";

import { Badge, Group, ScrollArea, Stack, Tabs, Text } from "@mantine/core";
import { IconCloud, IconFolder, IconServer, IconSettings } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useTimeAgo } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

export default function CoolifyWidget({ options, integrationIds }: WidgetComponentProps<"coolify">) {
  const t = useScopedI18n("widget.coolify");
  const integrationId = integrationIds[0];

  if (!integrationId) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text c="dimmed">{t("error.noIntegration")}</Text>
      </Stack>
    );
  }

  return <CoolifyContent integrationId={integrationId} options={options} />;
}

interface CoolifyContentProps {
  integrationId: string;
  options: WidgetComponentProps<"coolify">["options"];
}

function CoolifyContent({ integrationId, options }: CoolifyContentProps) {
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
            instanceInfo: newData.instanceInfo,
            updatedAt: newData.timestamp,
          },
        );
      },
    },
  );

  const { instanceInfo } = data;

  return (
    <Stack h="100%" gap="xs">
      <ScrollArea flex={1}>
        <Tabs defaultValue="servers" variant="outline">
          <Tabs.List grow>
            {options.showServers && (
              <Tabs.Tab value="servers" leftSection={<IconServer size={14} />}>
                {t("tab.servers")} ({instanceInfo.servers.length})
              </Tabs.Tab>
            )}
            {options.showProjects && (
              <Tabs.Tab value="projects" leftSection={<IconFolder size={14} />}>
                {t("tab.projects")} ({instanceInfo.projects.length})
              </Tabs.Tab>
            )}
            {options.showApplications && (
              <Tabs.Tab value="applications" leftSection={<IconCloud size={14} />}>
                {t("tab.applications")} ({instanceInfo.applications.length})
              </Tabs.Tab>
            )}
            {options.showServices && (
              <Tabs.Tab value="services" leftSection={<IconSettings size={14} />}>
                {t("tab.services")} ({instanceInfo.services.length})
              </Tabs.Tab>
            )}
          </Tabs.List>

          {options.showServers && (
            <Tabs.Panel value="servers" pt="xs">
              <Stack gap="xs">
                {instanceInfo.servers.map((server) => (
                  <Group
                    key={server.uuid}
                    justify="space-between"
                    p="xs"
                    style={{ borderBottom: "1px solid var(--mantine-color-dark-4)" }}
                  >
                    <Text size="sm">{server.name}</Text>
                    <Text size="xs" c="dimmed">
                      {server.ip}
                    </Text>
                  </Group>
                ))}
                {instanceInfo.servers.length === 0 && (
                  <Text size="sm" c="dimmed" ta="center">
                    {t("empty.servers")}
                  </Text>
                )}
              </Stack>
            </Tabs.Panel>
          )}

          {options.showProjects && (
            <Tabs.Panel value="projects" pt="xs">
              <Stack gap="xs">
                {instanceInfo.projects.map((project) => (
                  <Group
                    key={project.uuid}
                    justify="space-between"
                    p="xs"
                    style={{ borderBottom: "1px solid var(--mantine-color-dark-4)" }}
                  >
                    <Text size="sm">{project.name}</Text>
                    {project.description && (
                      <Text size="xs" c="dimmed">
                        {project.description}
                      </Text>
                    )}
                  </Group>
                ))}
                {instanceInfo.projects.length === 0 && (
                  <Text size="sm" c="dimmed" ta="center">
                    {t("empty.projects")}
                  </Text>
                )}
              </Stack>
            </Tabs.Panel>
          )}

          {options.showApplications && (
            <Tabs.Panel value="applications" pt="xs">
              <Stack gap="xs">
                {instanceInfo.applications.map((app) => (
                  <Group
                    key={app.uuid}
                    justify="space-between"
                    p="xs"
                    style={{ borderBottom: "1px solid var(--mantine-color-dark-4)" }}
                  >
                    <Text size="sm">{app.name}</Text>
                    <Badge size="xs" color={getStatusColor(app.status)}>
                      {app.status}
                    </Badge>
                  </Group>
                ))}
                {instanceInfo.applications.length === 0 && (
                  <Text size="sm" c="dimmed" ta="center">
                    {t("empty.applications")}
                  </Text>
                )}
              </Stack>
            </Tabs.Panel>
          )}

          {options.showServices && (
            <Tabs.Panel value="services" pt="xs">
              <Stack gap="xs">
                {instanceInfo.services.map((service) => (
                  <Group
                    key={service.uuid}
                    justify="space-between"
                    p="xs"
                    style={{ borderBottom: "1px solid var(--mantine-color-dark-4)" }}
                  >
                    <Text size="sm">{service.name}</Text>
                    {service.description && (
                      <Text size="xs" c="dimmed">
                        {service.description}
                      </Text>
                    )}
                  </Group>
                ))}
                {instanceInfo.services.length === 0 && (
                  <Text size="sm" c="dimmed" ta="center">
                    {t("empty.services")}
                  </Text>
                )}
              </Stack>
            </Tabs.Panel>
          )}
        </Tabs>
      </ScrollArea>

      <Group justify="space-between" p={4} style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
        <Group gap={4}>
          <IconCloud size={16} />
          <Text size="xs">v{instanceInfo.version}</Text>
        </Group>
        <Text size="xs" c="dimmed">
          {t("footer.updated", { when: relativeTime })}
        </Text>
      </Group>
    </Stack>
  );
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "running":
      return "green";
    case "stopped":
      return "red";
    case "starting":
    case "restarting":
      return "yellow";
    default:
      return "gray";
  }
}
