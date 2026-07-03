"use client";

import React from "react";
import { Badge, Box, Card, Flex, Group, Text } from "@mantine/core";
import { IconArrowsExchange, IconMapPin, IconShieldCheck, IconShieldX } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { useRequiredBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";

import { getStatusColor, RUNNING_STATUS } from "./helpers";

export type VpnInfo = RouterOutputs["widget"]["vpn"]["getSummaries"][number]["summary"];

export function VpnIntegrationCard({
  vpn,
  integrationName,
  variant = "single",
}: {
  vpn: VpnInfo;
  integrationName?: string;
  variant?: "single" | "list";
}) {
  const board = useRequiredBoard();
  const compact = variant === "list";

  const content = vpn ? (
    <Flex direction="row" w="100%" align="center" gap="xs">
      <VpnStatusColumn vpnStatus={vpn.vpnStatus} dnsStatus={vpn.dnsStatus} compact={compact} />
      <VpnInfoColumn
        integrationName={compact ? integrationName : undefined}
        publicIp={vpn.publicIp}
        city={vpn.city}
        country={vpn.country}
        provider={vpn.vpnProvider.provider}
        protocol={vpn.vpnProvider.protocol}
        compact={compact}
      />
    </Flex>
  ) : (
    <VpnUnavailableContent compact={compact} integrationName={compact ? integrationName : undefined} />
  );

  if (compact) {
    return (
      <Card withBorder radius={board.itemRadius} p="xs" w="100%">
        {content}
      </Card>
    );
  }

  return <Box w="100%">{content}</Box>;
}

function VpnUnavailableContent({ compact, integrationName }: { compact: boolean; integrationName?: string }) {
  const t = useScopedI18n("widget.vpn");

  return (
    <Flex direction="row" w="100%" align="center" gap="xs">
      {/* Empty statuses render the shield and DNS badge in red (see getStatusColor). */}
      <VpnStatusColumn vpnStatus="" dnsStatus="" compact={compact} />
      <Flex gap={2} direction="column" w="100%" align="flex-start" style={{ minWidth: 0 }}>
        {integrationName ? (
          <Text fw={600} size="xs" lh={1.2} c="dimmed" lineClamp={1}>
            {integrationName}
          </Text>
        ) : null}
        <Text fw={700} size={compact ? "md" : "lg"} lh={1.2} c="red" lineClamp={2}>
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
}: {
  vpnStatus: string;
  dnsStatus: string;
  compact: boolean;
}) {
  // Connected shows a shield with a check; anything else (stopped or unavailable) shows a shield with a cross.
  const ShieldIcon = vpnStatus === RUNNING_STATUS ? IconShieldCheck : IconShieldX;

  return (
    <Flex gap={4} direction="column" w={compact ? "28%" : "30%"} miw={compact ? 56 : undefined} align="center">
      <ShieldIcon stroke={2} color={getStatusColor(vpnStatus)} size={compact ? 44 : 52} />
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
}: {
  integrationName?: string;
  publicIp: string;
  city: string;
  country: string;
  provider: string;
  protocol: string;
  compact: boolean;
}) {
  return (
    <Flex gap={2} direction="column" w="100%" align="flex-start" style={{ minWidth: 0 }}>
      {integrationName ? (
        <Text fw={600} size="xs" lh={1.2} c="dimmed" lineClamp={1}>
          {integrationName}
        </Text>
      ) : null}
      <Text fw={700} size={compact ? "xl" : "2xl"} lh={1.1} lineClamp={1}>
        {publicIp}
      </Text>
      <Group gap={4} justify="flex-start" wrap="nowrap">
        <IconMapPin size={10} />
        <Text fs="italic" fw={500} size="sm" lh={1.2} lineClamp={1}>
          {city}, {country}
        </Text>
      </Group>
      <VpnProviderDetails provider={provider} protocol={protocol} />
    </Flex>
  );
}

function VpnProviderDetails({ provider, protocol }: { provider: string; protocol: string }) {
  return (
    <Group gap={6} justify="flex-start" wrap="nowrap" style={{ minWidth: 0 }}>
      <Text fz="xs" lh={1.2} tt="capitalize" lineClamp={1}>
        {provider}
      </Text>
      <IconArrowsExchange stroke={1} size={12} style={{ flexShrink: 0 }} />
      <Text fz="xs" lh={1.2} tt="capitalize" lineClamp={1}>
        {protocol}
      </Text>
    </Group>
  );
}

function StatusDot({ status, size = 10 }: { status: string; size?: number }) {
  return <Box bg={getStatusColor(status)} h={size} w={size} style={{ borderRadius: 999 }} />;
}

function DnsStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      color={getStatusColor(status)}
      size="xs"
      radius="xl"
      leftSection={<StatusDot status={status} size={5} />}
    >
      DNS
    </Badge>
  );
}
