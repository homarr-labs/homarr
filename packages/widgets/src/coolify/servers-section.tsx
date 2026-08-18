"use client";

import { Accordion, ActionIcon, Anchor, Badge, Group, Stack, Text } from "@mantine/core";
import {
  IconCircleCheckFilled,
  IconCircleFilled,
  IconCircleXFilled,
  IconEye,
  IconEyeOff,
  IconServer,
} from "@tabler/icons-react";

import type { CoolifyServer } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import actionTargetClasses from "../common/action-target.module.css";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { getBadgeColor, getCoolifyServerState, isCoolifyServerOnline } from "./coolify-utils";

interface ServersSectionProps {
  servers: CoolifyServer[];
  serverResourceCounts: Map<number, { apps: number; services: number }>;
  baseUrl: string;
  isTiny: boolean;
  isAdvanced: boolean;
  showIp: boolean;
  onToggleIp: () => void;
}

export function ServersSection({
  servers,
  serverResourceCounts,
  baseUrl,
  isTiny,
  isAdvanced,
  showIp,
  onToggleIp,
}: ServersSectionProps) {
  const t = useScopedI18n("widget.coolify");
  const tCommon = useScopedI18n("common");
  const onlineServers = servers.filter(isCoolifyServerOnline).length;

  return (
    <Accordion.Item value="servers">
      <Group gap={0} wrap="nowrap">
        <Accordion.Control icon={isTiny ? null : <IconServer size="var(--mantine-font-size-md)" />} style={{ flex: 1, minWidth: 0 }}>
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
          {showIp ? <IconEye size="var(--mantine-font-size-xs)" /> : <IconEyeOff size="var(--mantine-font-size-xs)" />}
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
                isAdvanced={isAdvanced}
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
  isAdvanced: boolean;
  showIp: boolean;
}

function ServerRow({ server, counts, baseUrl, isTiny, isAdvanced, showIp }: ServerRowProps) {
  const t = useScopedI18n("widget.coolify");
  const isBuildServer = server.settings?.is_build_server === true;
  const reachability = getCoolifyServerState(server, "is_reachable");
  const usability = getCoolifyServerState(server, "is_usable");
  const serverUrl = getSafeApplicationUrl(`${baseUrl}/server/${server.uuid}`);
  const status = reachability === true ? "online" : reachability === false ? "offline" : "unknown";
  const StatusIcon =
    reachability === true ? IconCircleCheckFilled : reachability === false ? IconCircleXFilled : IconCircleFilled;
  const statusColor = reachability === true ? "green" : reachability === false ? "red" : "gray";

  return (
    <Stack gap={0}>
      <Group wrap="nowrap" gap={isTiny ? 4 : "xs"}>
        <StatusIcon
          aria-label={t(`status.${status}`)}
          size={isTiny ? 12 : 16}
          color={`var(--mantine-color-${statusColor}-6)`}
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
          {showIp ? (server.ip ?? "—") : "***.***.***.***"}
        </Text>
      </Group>
      {isAdvanced && (
        <Group gap={4} ml={16} wrap="wrap">
          <ServerStateBadge field="reachability" value={reachability} />
          <ServerStateBadge field="usability" value={usability} />
        </Group>
      )}
    </Stack>
  );
}

const ServerStateBadge = ({ field, value }: { field: "reachability" | "usability"; value: boolean | undefined }) => {
  const t = useScopedI18n("widget.coolify");
  const status =
    value === undefined
      ? t("status.unknown")
      : field === "reachability"
        ? t(value ? "status.reachable" : "status.unreachable")
        : t(value ? "status.usable" : "status.unusable");
  return (
    <Badge size="xs" variant="light" color={value === true ? "green" : value === false ? "red" : "gray"}>
      {t(`server.${field}`)}: {status}
    </Badge>
  );
};
