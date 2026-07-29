"use client";

import { Accordion, ActionIcon, Anchor, Badge, Group, Indicator, Stack, Text } from "@mantine/core";
import { IconExternalLink, IconEye, IconEyeOff, IconServer } from "@tabler/icons-react";

import type { CoolifyServer } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { getBadgeColor } from "./coolify-utils";

interface ServersSectionProps {
  servers: CoolifyServer[];
  serverResourceCounts: Map<number, { apps: number; services: number }>;
  baseUrl: string;
  isTiny: boolean;
  showIp: boolean;
  onToggleIp: () => void;
}

export function ServersSection({
  servers,
  serverResourceCounts,
  baseUrl,
  isTiny,
  showIp,
  onToggleIp,
}: ServersSectionProps) {
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
