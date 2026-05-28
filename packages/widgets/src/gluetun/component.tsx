"use client";

import React from "react";
import { Badge, Box, Card, Flex, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { IconArrowsExchange, IconMapPin, IconShieldCheck } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { getStatusColor } from "./helpers";

type VpnInfo = RouterOutputs["widget"]["gluetun"]["getVpnInfo"][number];

export default function GluetunWidget({ options, integrationIds }: WidgetComponentProps<"gluetun">) {
  const [integrations] = clientApi.widget.gluetun.getVpnInfo.useSuspenseQuery(
    {
      ...options,
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );

  if (integrations.length === 0) {
    return <EmptyState />;
  }

  if (integrations.length === 1) {
    const [vpn] = integrations;

    if (!vpn) return <EmptyState />;

    return (
      <Flex align="center" justify="center" w="100%" h="100%" px="xs" py="sm">
        <VpnIntegrationCard vpn={vpn} />
      </Flex>
    );
  }

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" offsetScrollbars>
      <Stack w="100%" gap="sm" py="xs" px="xs">
        {integrations.map((vpn, index) => (
          <VpnIntegrationCard key={`${vpn.publicIp}-${index}`} vpn={vpn} variant="list" />
        ))}
      </Stack>
    </ScrollArea>
  );
}

function VpnIntegrationCard({ vpn, variant = "single" }: { vpn: VpnInfo; variant?: "single" | "list" }) {
  const board = useRequiredBoard();
  const compact = variant === "list";

  const content = (
    <Flex direction="row" w="100%" align="center" gap="xs">
      <VpnStatusColumn vpnStatus={vpn.vpnStatus} dnsStatus={vpn.dnsStatus} compact={compact} />
      <VpnInfoColumn
        publicIp={vpn.publicIp}
        city={vpn.city}
        country={vpn.country}
        provider={vpn.vpnProvider.provider}
        protocol={vpn.vpnProvider.protocol}
        compact={compact}
      />
    </Flex>
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

function VpnStatusColumn({
  vpnStatus,
  dnsStatus,
  compact,
}: {
  vpnStatus: string;
  dnsStatus: string;
  compact: boolean;
}) {
  return (
    <Flex gap={4} direction="column" w={compact ? "28%" : "30%"} miw={compact ? 56 : undefined} align="center">
      <IconShieldCheck stroke={2} color={getStatusColor(vpnStatus)} size={compact ? 44 : 52} />
      <DnsStatusBadge status={dnsStatus} />
    </Flex>
  );
}

function VpnInfoColumn({
  publicIp,
  city,
  country,
  provider,
  protocol,
  compact,
}: {
  publicIp: string;
  city: string;
  country: string;
  provider: string;
  protocol: string;
  compact: boolean;
}) {
  return (
    <Flex gap={2} direction="column" w="100%" align="flex-start" style={{ minWidth: 0 }}>
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

const EmptyState = () => {
  const t = useScopedI18n("widget.gluetun");

  return (
    <Flex align="center" justify="center" w="100%" h="100%" px="xs" py="sm">
      <Text size="sm" c="dimmed">
        {t("noItems")}
      </Text>
    </Flex>
  );
};
