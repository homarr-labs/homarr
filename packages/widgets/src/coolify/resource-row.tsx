"use client";

import { ActionIcon, Anchor, Group, Stack, Text } from "@mantine/core";
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconFileText,
  IconHelpCircleFilled,
  IconLink,
  IconLoader2,
} from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import actionTargetClasses from "../common/action-target.module.css";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { cleanFqdn, getResourceTimestamp, getStatusColor, parseStatus } from "./coolify-utils";

interface ResourceRowProps {
  item: {
    uuid: string;
    name: string;
    status?: string | null;
    fqdn?: string | null;
    updated_at?: string | null;
    last_online_at?: string | null;
    projectName?: string;
    projectUuid?: string;
    environmentName?: string;
    environmentUuid?: string;
  };
  baseUrl: string;
  isTiny: boolean;
  resourceType: "application" | "service";
}

export function ResourceRow({ item, baseUrl, isTiny, resourceType }: ResourceRowProps) {
  const t = useScopedI18n("widget.coolify");
  const status = parseStatus(item.status ?? "");
  const statusColor = getStatusColor(status);
  const isTransitioning = status === "starting" || status === "restarting";
  const StatusIcon =
    status === "running"
      ? IconCircleCheckFilled
      : isTransitioning
        ? IconLoader2
        : status === "unknown"
          ? IconHelpCircleFilled
          : IconCircleXFilled;
  const statusLabel =
    status === "running"
      ? t("status.running")
      : status === "stopped"
        ? t("status.stopped")
        : status === "exited"
          ? t("status.exited")
          : status === "starting"
            ? t("status.starting")
            : status === "restarting"
              ? t("status.restarting")
              : t("status.unknown");

  const resourceUrl = getSafeApplicationUrl(
    item.projectUuid && item.environmentUuid
      ? `${baseUrl}/project/${item.projectUuid}/environment/${item.environmentUuid}/${resourceType}/${item.uuid}`
      : undefined,
  );

  const logsUrl = getSafeApplicationUrl(resourceUrl ? `${resourceUrl}/logs` : undefined);
  const publicUrl = getSafeApplicationUrl(cleanFqdn(item.fqdn));
  const resourceTimestamp = getResourceTimestamp(item, resourceType);

  return (
    <Stack gap={0}>
      <Group wrap="nowrap" gap={isTiny ? 4 : "xs"}>
        <StatusIcon aria-label={statusLabel} size={isTiny ? 12 : 16} color={`var(--mantine-color-${statusColor}-6)`} />
        {resourceUrl ? (
          <Anchor
            className={actionTargetClasses.root}
            href={resourceUrl}
            target="_blank"
            rel={SAFE_NEW_TAB_REL}
            fz="xs"
            c="inherit"
            truncate="end"
            style={{ display: "inline-flex", alignItems: "center", overflow: "hidden" }}
          >
            {item.name}
          </Anchor>
        ) : (
          <Text lineClamp={1} fz="xs">
            {item.name}
          </Text>
        )}
      </Group>
      <Group wrap="nowrap" gap={4} ml={16}>
        {publicUrl && (
          <ActionIcon
            className={actionTargetClasses.root}
            component="a"
            href={publicUrl}
            target="_blank"
            rel={SAFE_NEW_TAB_REL}
            aria-label={t("action.openResource", { name: item.name })}
            size="xs"
            variant="subtle"
            c="dimmed"
          >
            <IconLink size="var(--mantine-font-size-xs)" />
          </ActionIcon>
        )}
        {!isTiny && logsUrl && (
          <ActionIcon
            className={actionTargetClasses.root}
            component="a"
            href={logsUrl}
            target="_blank"
            rel={SAFE_NEW_TAB_REL}
            aria-label={t("action.openLogs", { name: item.name })}
            size="xs"
            variant="subtle"
            c="dimmed"
          >
            <IconFileText size="var(--mantine-font-size-xs)" />
          </ActionIcon>
        )}
        {!isTiny && (
          <Text fz="10px" c="dimmed" lineClamp={1}>
            {item.projectName ?? "-"} / {item.environmentName ?? "-"}
          </Text>
        )}
        {!isTiny && resourceTimestamp && (
          <Text fz="10px" c="dimmed" ml="auto">
            {resourceTimestamp}
          </Text>
        )}
      </Group>
    </Stack>
  );
}
