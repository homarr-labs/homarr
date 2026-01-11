"use client";

import { ActionIcon, Anchor, Group, Indicator, Stack, Text } from "@mantine/core";
import { IconExternalLink, IconFileText, IconLink } from "@tabler/icons-react";

import { cleanFqdn, getResourceTimestamp, getStatusColor, parseStatus } from "./coolify-utils";

interface ResourceRowProps {
  item: {
    uuid: string;
    name: string;
    status?: string | null;
    fqdn?: string | null;
    updated_at?: string;
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
