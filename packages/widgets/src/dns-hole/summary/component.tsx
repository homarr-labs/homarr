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
import { zoomCompensatedSize } from "@homarr/ui";
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
  displayScale = 1,
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
            <StatCard
              key={item.color}
              item={item}
              usePiHoleColors={options.usePiHoleColors}
              data={data}
              t={t}
              displayScale={displayScale}
            />
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
  displayScale: number;
}
const StatCard = ({ item, data, usePiHoleColors, t, displayScale }: StatCardProps) => {
  const { ref, height, width } = useElementSize();
  let layoutScale = displayScale;
  if (!Number.isFinite(layoutScale) || layoutScale <= 0) layoutScale = 1;

  // Element measurements are logical pixels; density follows the displayed card.
  const displayedWidth = width * layoutScale;
  const displayedHeight = height * layoutScale;
  const isLong = displayedWidth > displayedHeight + 20;
  const canStackText = displayedHeight > 32;
  const isCompact = (displayedHeight <= 32 && displayedWidth <= 256) || (displayedHeight <= 64 && displayedWidth <= 92);
  const board = useRequiredBoard();
  const label = translateIfNecessary(t, item.label);
  const value = item.value(data, isCompact || displayedWidth <= 64 ? "sm" : "md");
  let tooltip = item.tooltip?.(data, t);
  let padding: number | "sm" = "sm";
  let valueSize: "xs" | "lg" = "lg";
  if (isCompact) {
    padding = 2;
    valueSize = "xs";
    let compactTooltip = `${label}: ${value}`;
    if (tooltip) compactTooltip += `. ${tooltip}`;
    tooltip = compactTooltip;
  }
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
        p={padding}
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
          {!isCompact && (
            <item.icon
              className="summary-card-icon"
              style={{
                ...zoomCompensatedSize(24),
                minWidth: "calc(24px * var(--board-canvas-ui-scale, 1))",
                minHeight: "calc(24px * var(--board-canvas-ui-scale, 1))",
              }}
            />
          )}
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
            <Text className="summary-card-value text-flash" ta="center" size={valueSize} fw="bold" maw="100%">
              {value}
            </Text>
            {!isCompact && (
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
