"use client";

import { Anchor, Badge, Group, Stack, Text } from "@mantine/core";
import { IconCircleCheckFilled, IconCircleFilled, IconCircleXFilled } from "@tabler/icons-react";

import type { CoolifyServer } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import actionTargetClasses from "../common/action-target.module.css";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { getCoolifyServerState } from "./coolify-utils";

interface ServerRowProps {
  server: CoolifyServer;
  counts: { apps: number; services: number };
  baseUrl: string;
  showIp: boolean;
}

export function ServerRow({ server, counts, baseUrl, showIp }: ServerRowProps) {
  const t = useI18n("widget.coolify");
  const isBuildServer = server.settings?.is_build_server === true;
  const reachability = getCoolifyServerState(server, "is_reachable");
  const usability = getCoolifyServerState(server, "is_usable");
  const serverUrl = getSafeApplicationUrl(`${baseUrl}/server/${server.uuid}`);
  const status =
    reachability === false
      ? "offline"
      : usability === false
        ? "unusable"
        : reachability === true
          ? "online"
          : "unknown";
  const StatusIcon =
    status === "online" ? IconCircleCheckFilled : status === "unknown" ? IconCircleFilled : IconCircleXFilled;
  const statusColor = status === "online" ? "green" : status === "unknown" ? "gray" : "red";

  return (
    <Stack gap={0}>
      <Group wrap="nowrap" gap="xs">
        <StatusIcon aria-label={t(`status.${status}`)} size={16} color={`var(--mantine-color-${statusColor}-6)`} />
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
          <Badge size="xs" variant="light" color="gray">
            {t("server.buildServer")}
          </Badge>
        ) : (
          <Text fz="xs" c="dimmed">
            ({t("server.resourceCounts", { applications: counts.apps, services: counts.services })})
          </Text>
        )}
      </Group>
      {server.description && (
        <Text fz="xs" c="dimmed" ml={16} truncate>
          {server.description}
        </Text>
      )}
      <Group wrap="nowrap" gap={4} ml={16}>
        <Text fz="xs" c="dimmed">
          {showIp ? (server.ip ?? "—") : "***.***.***.***"}
        </Text>
      </Group>
      <Group gap={4} ml={16} wrap="wrap">
        <ServerStateBadge field="reachability" value={reachability} />
        <ServerStateBadge field="usability" value={usability} />
      </Group>
    </Stack>
  );
}

const ServerStateBadge = ({ field, value }: { field: "reachability" | "usability"; value: boolean | undefined }) => {
  const t = useI18n("widget.coolify");
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
