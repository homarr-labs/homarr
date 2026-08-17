"use client";

import React from "react";
import { Badge, Box, Card, Flex, Group, Text, VisuallyHidden } from "@mantine/core";
import {
  IconArrowsExchange,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconMapPin,
  IconShieldCheck,
  IconShieldX,
} from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { useRequiredBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import { getStatusColor, RUNNING_STATUS } from "./helpers";

export type VpnInfo = RouterOutputs["widget"]["vpn"]["getSummaries"][number]["summary"];

export function VpnIntegrationCard({
  vpn,
  integrationName,
  variant = "single",
  dense = false,
}: {
  vpn: VpnInfo;
  integrationName?: string;
  variant?: "single" | "list";
  dense?: boolean;
}) {
  const board = useRequiredBoard();
  const compact = variant === "list";

  const content = vpn ? (
    <Flex direction="row" w="100%" align="center" gap="xs">
      <VpnStatusColumn vpnStatus={vpn.vpnStatus} dnsStatus={vpn.dnsStatus} compact={compact} dense={dense} />
      <VpnInfoColumn
        integrationName={compact ? integrationName : undefined}
        publicIp={vpn.publicIp}
        city={vpn.city}
        country={vpn.country}
        provider={vpn.vpnProvider.provider}
        protocol={vpn.vpnProvider.protocol}
        compact={compact}
        dense={dense}
      />
    </Flex>
  ) : (
    <VpnUnavailableContent compact={compact} dense={dense} integrationName={compact ? integrationName : undefined} />
  );

  if (compact) {
    return (
      <Card withBorder radius={board.itemRadius} p={dense ? 6 : "xs"} w="100%">
        {content}
      </Card>
    );
  }

  return <Box w="100%">{content}</Box>;
}

function VpnUnavailableContent({
  compact,
  dense,
  integrationName,
}: {
  compact: boolean;
  dense: boolean;
  integrationName?: string;
}) {
  const t = useScopedI18n("widget.vpn");

  return (
    <Flex direction="row" w="100%" align="center" gap="xs">
      {/* Empty statuses render the shield and DNS badge in red (see getStatusColor). */}
      <VpnStatusColumn vpnStatus="" dnsStatus="" compact={compact} dense={dense} />
      <Flex gap={2} direction="column" w="100%" align="flex-start" style={{ minWidth: 0 }}>
        {integrationName ? (
          <Text fw={600} size="xs" lh={1.2} c="dimmed" lineClamp={1}>
            {integrationName}
          </Text>
        ) : null}
        <Text fw={700} size={dense ? "sm" : compact ? "md" : "lg"} lh={1.2} c="red" lineClamp={2}>
          {t("serviceUnavailable")}
        </Text>
      </Flex>
    </Flex>
  );
}

function VpnStatusColumn({
  vpnStatus,
  dnsStatus,
  compact,
  dense,
}: {
  vpnStatus: string;
  dnsStatus: string;
  compact: boolean;
  dense: boolean;
}) {
  const t = useScopedI18n("widget.vpn");
  // Connected shows a shield with a check; anything else (stopped or unavailable) shows a shield with a cross.
  const ShieldIcon = vpnStatus === RUNNING_STATUS ? IconShieldCheck : IconShieldX;
  const statusLabel = t(
    vpnStatus === RUNNING_STATUS ? "status.running" : vpnStatus ? "status.notRunning" : "status.unavailable",
  );

  return (
    <Flex
      gap={4}
      direction="column"
      w={compact ? "28%" : "30%"}
      miw={dense ? 44 : compact ? 56 : undefined}
      align="center"
    >
      <ShieldIcon
        aria-label={t("status.vpn", { status: statusLabel })}
        stroke={2}
        color={getStatusColor(vpnStatus)}
        size={dense ? 32 : compact ? 44 : 52}
      />
      <DnsStatusBadge status={dnsStatus} />
    </Flex>
  );
}

function VpnInfoColumn({
  integrationName,
  publicIp,
  city,
  country,
  provider,
  protocol,
  compact,
  dense,
}: {
  integrationName?: string;
  publicIp: string;
  city: string;
  country: string;
  provider: string;
  protocol: string;
  compact: boolean;
  dense: boolean;
}) {
  return (
    <Flex gap={2} direction="column" w="100%" align="flex-start" style={{ minWidth: 0 }}>
      {integrationName ? (
        <Text fw={600} size="xs" lh={1.2} c="dimmed" lineClamp={1}>
          {integrationName}
        </Text>
      ) : null}
      <Text fw={700} size={dense ? "md" : compact ? "xl" : "2xl"} lh={1.1} lineClamp={1}>
        {publicIp || "—"}
      </Text>
      {!dense && (city || country) && (
        <Group gap={4} justify="flex-start" wrap="nowrap">
          <IconMapPin aria-hidden style={iconSizes.xs} />
          <Text fs="italic" fw={500} size="sm" lh={1.2} lineClamp={1}>
            {[city, country].filter(Boolean).join(", ")}
          </Text>
        </Group>
      )}
      {!dense && (provider || protocol) && <VpnProviderDetails provider={provider} protocol={protocol} />}
    </Flex>
  );
}

function VpnProviderDetails({ provider, protocol }: { provider: string; protocol: string }) {
  return (
    <Group gap={6} justify="flex-start" wrap="nowrap" style={{ minWidth: 0 }}>
      <Text fz="xs" lh={1.2} tt="capitalize" lineClamp={1}>
        {provider}
      </Text>
      <IconArrowsExchange stroke={1} style={iconSizes.xs} />
      <Text fz="xs" lh={1.2} tt="capitalize" lineClamp={1}>
        {protocol}
      </Text>
    </Group>
  );
}

function DnsStatusBadge({ status }: { status: string }) {
  const t = useScopedI18n("widget.vpn");
  const StatusIcon = status === RUNNING_STATUS ? IconCircleCheckFilled : IconCircleXFilled;
  const statusLabel = t(
    status === RUNNING_STATUS ? "status.running" : status ? "status.notRunning" : "status.unavailable",
  );
  return (
    <Badge
      variant="outline"
      color={getStatusColor(status)}
      size="xs"
      radius="xl"
      leftSection={<StatusIcon aria-hidden style={iconSizes.xs} />}
    >
      DNS
      <VisuallyHidden> {statusLabel}</VisuallyHidden>
    </Badge>
  );
}
