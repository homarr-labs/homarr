"use client";

import { ActionIcon, Anchor, Group, Indicator, Stack, Text } from "@mantine/core";
import { IconExternalLink, IconFileText, IconLink } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

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
  isMobileDetail: boolean;
}

export function ResourceRow({ item, baseUrl, isTiny, resourceType, isMobileDetail }: ResourceRowProps) {
  const tCommon = useScopedI18n("common");
  const tApp = useScopedI18n("widget.app");
  const status = parseStatus(item.status ?? "");
  const statusColor = getStatusColor(status);
  const fqdn = cleanFqdn(item.fqdn);
  const actionIconSize = isMobileDetail ? 44 : "xs";
  const resourceLabel = resourceType === "application" ? tCommon("applications") : tCommon("services");
  const openInNewTabLabel = tApp("option.openInNewTab.label");

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
        {fqdn && (
          <ActionIcon
            component="a"
            href={fqdn}
            target="_blank"
            size={actionIconSize}
            variant="subtle"
            c="dimmed"
            aria-label={`${openInNewTabLabel}: ${fqdn}`}
          >
            <IconLink size={12} />
          </ActionIcon>
        )}
        {resourceUrl && (
          <ActionIcon
            component="a"
            href={resourceUrl}
            target="_blank"
            size={actionIconSize}
            variant="subtle"
            c="dimmed"
            aria-label={`${openInNewTabLabel}: ${resourceLabel} ${item.name}`}
          >
            <IconExternalLink size={12} />
          </ActionIcon>
        )}
        {logsUrl && (
          <ActionIcon
            component="a"
            href={logsUrl}
            target="_blank"
            size={actionIconSize}
            variant="subtle"
            c="dimmed"
            aria-label={`${tCommon("action.checkLogs")}: ${item.name}`}
          >
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
