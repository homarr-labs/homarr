"use client";

import { Accordion, ActionIcon, Anchor, Badge, Group, Stack, Text } from "@mantine/core";
import { IconCircleCheckFilled, IconCircleXFilled, IconEye, IconEyeOff, IconServer } from "@tabler/icons-react";

import type { CoolifyServer } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import actionTargetClasses from "../common/action-target.module.css";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
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
      <Group gap={0} wrap="nowrap">
        <Accordion.Control icon={isTiny ? null : <IconServer size={16} />} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
            <Text size="xs">{tCommon("servers")}</Text>
            <Badge variant="dot" color={getBadgeColor(onlineServers, servers.length)} size="xs">
              {onlineServers} / {servers.length}
            </Badge>
          </Group>
        </Accordion.Control>
        <ActionIcon
          className={actionTargetClasses.root}
          aria-label={t(showIp ? "action.hideIp" : "action.showIp")}
          aria-pressed={showIp}
          size="xs"
          variant="subtle"
          c="dimmed"
          mr="xs"
          onClick={onToggleIp}
        >
          {showIp ? <IconEye size={12} /> : <IconEyeOff size={12} />}
        </ActionIcon>
      </Group>
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
  const serverUrl = getSafeApplicationUrl(`${baseUrl}/server/${server.uuid}`);
  const StatusIcon = isOnline ? IconCircleCheckFilled : IconCircleXFilled;

  return (
    <Stack gap={0}>
      <Group wrap="nowrap" gap={isTiny ? 4 : "xs"}>
        <StatusIcon
          aria-label={t(isOnline ? "status.online" : "status.offline")}
          size={isTiny ? 12 : 16}
          color={`var(--mantine-color-${isOnline ? "green" : "red"}-6)`}
        />
        <Anchor
          className={actionTargetClasses.root}
          component={serverUrl ? "a" : "span"}
          href={serverUrl}
          target={serverUrl ? "_blank" : undefined}
          rel={serverUrl ? SAFE_NEW_TAB_REL : undefined}
          fz="xs"
          c="inherit"
          truncate="end"
          style={{ display: "inline-flex", alignItems: "center", overflow: "hidden" }}
        >
          {server.name}
        </Anchor>
        {isBuildServer ? (
          <Badge size="xs" variant="light" color="violet">
            {t("server.buildServer")}
          </Badge>
        ) : (
          <Text fz="10px" c="dimmed">
            ({t("server.resourceCounts", { applications: counts.apps, services: counts.services })})
          </Text>
        )}
      </Group>
      <Group wrap="nowrap" gap={4} ml={16}>
        <Text fz="10px" c="dimmed">
          {showIp ? server.ip : "***.***.***.***"}
        </Text>
      </Group>
    </Stack>
  );
}
