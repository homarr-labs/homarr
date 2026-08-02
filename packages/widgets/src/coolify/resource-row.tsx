"use client";

import { ActionIcon, Anchor, Group, Indicator, Stack, Text } from "@mantine/core";
import { IconFileText, IconLink } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import actionTargetClasses from "../common/action-target.module.css";
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
          <Anchor
            href={resourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            fz={isTiny ? "8px" : "xs"}
            c="inherit"
            lineClamp={1}
          >
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
          <ActionIcon
            className={actionTargetClasses.root}
            component="a"
            href={cleanFqdn(item.fqdn)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("action.openResource", { name: item.name })}
            size="xs"
            variant="subtle"
            c="dimmed"
          >
            <IconLink size={12} />
          </ActionIcon>
        )}
        {!isTiny && logsUrl && (
          <ActionIcon
            className={actionTargetClasses.root}
            component="a"
            href={logsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("action.openLogs", { name: item.name })}
            size="xs"
            variant="subtle"
            c="dimmed"
          >
            <IconFileText size={12} />
          </ActionIcon>
        )}
        {!isTiny && (
          <Text fz="10px" c="dimmed" lineClamp={1}>
            {item.projectName ?? "-"} / {item.environmentName ?? "-"}
          </Text>
        )}
        {!isTiny && getResourceTimestamp(item, resourceType) && (
          <Text fz="10px" c="dimmed" ml="auto">
            {getResourceTimestamp(item, resourceType)}
          </Text>
        )}
      </Group>
    </Stack>
  );
}
