"use client";

import type { BoxProps } from "@mantine/core";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Box,
  Card,
  Flex,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconBarrierBlock, IconPercentage, IconSearch, IconWorldWww } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { formatNumber } from "@homarr/common";
import { integrationDefs } from "@homarr/definitions";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import type { stringOrTranslation, TranslationFunction } from "@homarr/translation";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import type { widgetKind } from ".";
import type { WidgetComponentProps, WidgetProps } from "../../definition";
import { IntegrationErrorIndicator } from "../../common/integration-error-indicator";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../../common/query-state";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";

export default function DnsHoleSummaryWidget({
  options,
  integrationIds,
  width,
  height,
}: WidgetComponentProps<typeof widgetKind>) {
  const summaryQuery = clientApi.widget.dnsHole.summary.useQuery({
    integrationIds,
  });
  const summaries = getUsableWidgetQueryData(summaryQuery) ?? [];

  const t = useI18n();
  const tDns = useI18n("widget.dnsHoleSummary");
  const tWidgetCommon = useI18n("widget.common");

  const successfulSummaries = summaries.filter(({ summary }) => summary !== null);
  const data = successfulSummaries.flatMap(({ summary }) => (summary ? [summary] : []));
  const layoutProps = boxPropsByLayout(options.layout);
  const showSourceStatuses = successfulSummaries.length > 1 && width >= 240 && height >= 220;

  if (isInitialWidgetQueryPending(summaryQuery)) return <WidgetQueryLoadingState />;

  return (
    <Stack h="100%" gap={0} pos="relative">
      <Box pos="absolute" top={4} right={4} style={{ zIndex: 2 }}>
        <Group gap={0}>
          <IntegrationErrorIndicator results={summaries} />
        </Group>
      </Box>
      <SimpleGrid cols={2} spacing="xs" p="xs" {...layoutProps} style={{ ...layoutProps.style, flex: 1, minHeight: 0 }}>
        {data.length > 0 ? (
          stats.map((item) => (
            <StatCard key={item.color} item={item} usePiHoleColors={options.usePiHoleColors} data={data} t={t} />
          ))
        ) : (
          <Stack
            aria-live="polite"
            h="100%"
            w="100%"
            justify="center"
            align="center"
            gap="sm"
            p="sm"
            style={{ gridColumn: "1 / -1" }}
          >
            <AvatarGroup spacing="md">
              {successfulSummaries.map(({ integration }) => (
                <Tooltip key={integration.id} label={integration.name}>
                  <Avatar h={30} w={30} src={integrationDefs[integration.kind].iconUrl} />
                </Tooltip>
              ))}
            </AvatarGroup>
            <Text fz="md" ta="center">
              {tWidgetCommon("integrationDisconnected")}
            </Text>
          </Stack>
        )}
      </SimpleGrid>
      {showSourceStatuses && (
        <ScrollArea px="xs" pb="xs">
          <Group gap="xs" wrap="nowrap">
            {successfulSummaries.map(({ integration, summary }) => (
              <Badge
                key={integration.id}
                variant="light"
                color={summary?.status === "enabled" ? "green" : summary?.status === "disabled" ? "red" : "gray"}
                style={{ flexShrink: 0 }}
              >
                {integration.name}: {tDns(`status.${summary?.status ?? "unknown"}` as never)}
              </Badge>
            ))}
          </Group>
        </ScrollArea>
      )}
    </Stack>
  );
}

const stats = [
  {
    icon: IconBarrierBlock,
    value: (data, size) =>
      formatNumber(
        data.reduce((count, { adsBlockedToday }) => count + adsBlockedToday, 0),
        size === "sm" ? 0 : 2,
      ),
    label: (t) => t("widget.dnsHoleSummary.data.adsBlockedToday"),
    color: "var(--mantine-color-red-light)",
  },
  {
    icon: IconPercentage,
    value: (data, size) => {
      const totalCount = data.reduce((count, { dnsQueriesToday }) => count + dnsQueriesToday, 0);
      const blocked = data.reduce((count, { adsBlockedToday }) => count + adsBlockedToday, 0);
      return `${formatNumber(totalCount === 0 ? 0 : (blocked / totalCount) * 100, size === "sm" ? 0 : 2)}%`;
    },
    label: (t) => t("widget.dnsHoleSummary.data.adsBlockedTodayPercentage"),
    color: "var(--mantine-color-yellow-light)",
  },
  {
    icon: IconSearch,
    value: (data, size) =>
      formatNumber(
        data.reduce((count, { dnsQueriesToday }) => count + dnsQueriesToday, 0),
        size === "sm" ? 0 : 2,
      ),
    label: (t) => t("widget.dnsHoleSummary.data.dnsQueriesToday"),
    color: "var(--mantine-color-cyan-light)",
  },
  {
    icon: IconWorldWww,
    value: (data, size) => {
      // We use a suffix to indicate that there might be more domains in the at least two lists.
      const suffix = data.length >= 2 ? "+" : "";
      return (
        formatNumber(
          data.reduce((count, { domainsBeingBlocked }) => count + domainsBeingBlocked, 0),
          size === "sm" ? 0 : 2,
        ) + suffix
      );
    },
    tooltip: (data, t) => (data.length >= 2 ? t("widget.dnsHoleSummary.domainsTooltip") : undefined),
    label: (t) => t("widget.dnsHoleSummary.data.domainsBeingBlocked"),
    color: "var(--mantine-color-green-light)",
  },
] satisfies StatItem[];

interface StatItem {
  icon: TablerIcon;
  value: (summaries: DnsHoleSummary[], size: "sm" | "md") => string;
  tooltip?: (summaries: DnsHoleSummary[], t: TranslationFunction) => string | undefined;
  label: stringOrTranslation;
  color: string;
}

interface StatCardProps {
  item: StatItem;
  data: DnsHoleSummary[];
  usePiHoleColors: boolean;
  t: TranslationFunction;
}
const StatCard = ({ item, data, usePiHoleColors, t }: StatCardProps) => {
  const { ref, height, width } = useElementSize();
  const isLong = width > height + 20;
  const canStackText = height > 32;
  const hideLabel = (height <= 32 && width <= 256) || (height <= 64 && width <= 92);
  const tooltip = item.tooltip?.(data, t);
  const board = useRequiredBoard();
  const label = translateIfNecessary(t, item.label);
  const value = item.value(data, width <= 64 ? "sm" : "md");
  const backgroundColor = usePiHoleColors
    ? `rgb(from ${item.color} r g b / calc(var(--opacity, 1) * 0.4))`
    : "rgb(from var(--mantine-color-primaryColor-filled) r g b / calc(var(--opacity, 1) * 0.12))";

  return (
    <Tooltip label={tooltip} disabled={!tooltip} w={250} multiline events={{ hover: true, focus: true, touch: true }}>
      <Card
        ref={ref}
        component="section"
        tabIndex={tooltip ? 0 : undefined}
        aria-label={`${label}: ${value}`}
        className="summary-card"
        p="sm"
        radius={board.itemRadius}
        bg={backgroundColor}
        style={{
          flex: 1,
          border:
            "1px solid rgb(from var(--mantine-color-secondaryColor-filled) r g b / calc(var(--opacity, 1) * 0.45))",
        }}
      >
        <Flex
          className="summary-card-elements"
          h="100%"
          w="100%"
          align="center"
          justify="center"
          direction={isLong ? "row" : "column"}
          gap={0}
        >
          <item.icon className="summary-card-icon" size={24} style={{ minWidth: 24, minHeight: 24 }} />
          <Flex
            className="summary-card-texts"
            justify="center"
            align="center"
            direction={isLong && !canStackText ? "row" : "column"}
            style={{
              flex: isLong ? 1 : undefined,
            }}
            w="100%"
            gap={isLong ? 4 : 0}
            wrap="wrap"
          >
            <Text className="summary-card-value text-flash" ta="center" size="lg" fw="bold" maw="100%">
              {value}
            </Text>
            {!hideLabel && (
              <Text className="summary-card-label" ta="center" size="xs" maw="100%">
                {label}
              </Text>
            )}
          </Flex>
        </Flex>
      </Card>
    </Tooltip>
  );
};

const boxPropsByLayout = (layout: WidgetProps<"dnsHoleSummary">["options"]["layout"]): BoxProps => {
  if (layout === "grid") {
    return {
      display: "grid",
      style: {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
      },
    };
  }

  return {
    display: "flex",
    style: {
      flexDirection: layout,
    },
  };
};
