"use client";
import { definition } from ".";

import type { BoxProps } from "@mantine/core";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Box,
  Card,
  Flex,
  Group,
  px,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { IconBarrierBlock, IconPercentage, IconSearch, IconWorldWww } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { calculateBoardUiScale } from "@homarr/boards/scale";
import { formatNumber } from "@homarr/common";
import { integrationDefs } from "@homarr/definitions";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import type { stringOrTranslation, TranslationFunction } from "@homarr/translation";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";
import type { TablerIcon } from "@homarr/ui";
import { useHydrationSafeElementSize } from "@homarr/ui/hooks";

import type { widgetKind } from ".";
import type { WidgetComponentProps, WidgetProps } from "../../definition";
import { IntegrationErrorIndicator } from "../../common/integration-error-indicator";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../../common/query-state";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";

type ElementSize = { width: number; height: number };

const SUMMARY_FOOTER_HEIGHT = 32;

const normalizeLayoutScale = (scale: number) => (Number.isFinite(scale) && scale > 0 ? scale : 1);

const getStatCardSize = ({
  layout,
  width,
  height,
  gridSpacing,
  footer,
}: {
  layout: WidgetProps<"dnsHoleSummary">["options"]["layout"];
  width: number;
  height: number;
  gridSpacing: number;
  footer: number;
}): ElementSize => {
  const usableWidth = Math.max(0, width - 2 * gridSpacing);
  const usableHeight = Math.max(0, height - 2 * gridSpacing - footer);

  if (layout === "row") return { width: Math.max(0, (usableWidth - 3 * gridSpacing) / 4), height: usableHeight };
  if (layout === "column") return { width: usableWidth, height: Math.max(0, (usableHeight - 3 * gridSpacing) / 4) };

  return {
    width: Math.max(0, (usableWidth - gridSpacing) / 2),
    height: Math.max(0, (usableHeight - gridSpacing) / 2),
  };
};

export default function DnsHoleSummaryWidget({
  options,
  integrationIds,
  width,
  height,
  displayScale = 1,
}: WidgetComponentProps<typeof widgetKind>) {
  const summaryQuery = clientApi.widget.dnsHole.summary.useQuery(
    definition.data.queries({ options, integrationIds }).main.input,
  );
  const summaries = getUsableWidgetQueryData(summaryQuery) ?? [];

  const t = useI18n();
  const tDns = useI18n("widget.dnsHoleSummary");
  const tWidgetCommon = useI18n("widget.common");

  const successfulSummaries = summaries.filter(({ summary }) => summary !== null);
  const data = successfulSummaries.flatMap(({ summary }) => (summary ? [summary] : []));
  const layoutProps = boxPropsByLayout(options.layout);
  const showSourceStatuses = successfulSummaries.length > 1 && width >= 240 && height >= 220;

  const theme = useMantineTheme();
  const layoutScale = normalizeLayoutScale(displayScale);
  const uiScale = calculateBoardUiScale(layoutScale);
  const gridSpacing = Number(px(theme.spacing.xs)) * uiScale;
  const statCardMetrics = {
    padding: Number(px(theme.spacing.sm)) * uiScale,
    compactPadding: 2 * uiScale,
    border: uiScale,
    initialSize: getStatCardSize({
      layout: options.layout,
      width,
      height,
      gridSpacing,
      footer: showSourceStatuses ? SUMMARY_FOOTER_HEIGHT * uiScale : 0,
    }),
  };

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
              displayScale={layoutScale}
              padding={statCardMetrics.padding}
              compactPadding={statCardMetrics.compactPadding}
              border={statCardMetrics.border}
              initialSize={statCardMetrics.initialSize}
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
    color: "var(--mantine-color-red-6)",
  },
  {
    icon: IconPercentage,
    value: (data, size) => {
      const totalCount = data.reduce((count, { dnsQueriesToday }) => count + dnsQueriesToday, 0);
      const blocked = data.reduce((count, { adsBlockedToday }) => count + adsBlockedToday, 0);
      return `${formatNumber(totalCount === 0 ? 0 : (blocked / totalCount) * 100, size === "sm" ? 0 : 2)}%`;
    },
    label: (t) => t("widget.dnsHoleSummary.data.adsBlockedTodayPercentage"),
    color: "var(--mantine-color-yellow-6)",
  },
  {
    icon: IconSearch,
    value: (data, size) =>
      formatNumber(
        data.reduce((count, { dnsQueriesToday }) => count + dnsQueriesToday, 0),
        size === "sm" ? 0 : 2,
      ),
    label: (t) => t("widget.dnsHoleSummary.data.dnsQueriesToday"),
    color: "var(--mantine-color-cyan-6)",
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
    color: "var(--mantine-color-green-6)",
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
  padding: number;
  compactPadding: number;
  border: number;
  initialSize: ElementSize;
}
const StatCard = ({
  item,
  data,
  usePiHoleColors,
  t,
  displayScale,
  padding: normalPadding,
  compactPadding,
  border,
  initialSize,
}: StatCardProps) => {
  const {
    ref,
    width: measuredWidth,
    height: measuredHeight,
  } = useHydrationSafeElementSize<HTMLDivElement>({ box: "border-box" });
  const layoutScale = normalizeLayoutScale(displayScale);

  const boxWidth = measuredWidth || initialSize.width;
  const boxHeight = measuredHeight || initialSize.height;

  const contentWidth = Math.max(0, boxWidth - 2 * (normalPadding + border));
  const contentHeight = Math.max(0, boxHeight - 2 * (normalPadding + border));
  const displayedWidth = contentWidth * layoutScale;
  const displayedHeight = contentHeight * layoutScale;
  const isLong = displayedWidth > displayedHeight + 20;
  const canStackText = displayedHeight > 32;
  const isCompact = (displayedHeight <= 32 && displayedWidth <= 256) || (displayedHeight <= 64 && displayedWidth <= 92);
  const board = useRequiredBoard();
  const label = translateIfNecessary(t, item.label);
  const value = item.value(data, isCompact || displayedWidth <= 64 ? "sm" : "md");
  let tooltip = item.tooltip?.(data, t);
  let padding: number | "sm" = "sm";
  let valueSize = "lg";
  if (isCompact) {
    const compactContentWidth = Math.max(0, boxWidth - 2 * (compactPadding + border));
    padding = 2;
    // Reserve padding and borders so four-character values fit narrow mobile cards.
    valueSize = `calc(${Math.min(12, Math.max(0, compactContentWidth * layoutScale - 6) / 3)}px * var(--board-canvas-ui-scale, 1))`;
    let compactTooltip = label;
    if (tooltip) compactTooltip += `. ${tooltip}`;
    tooltip = compactTooltip;
  }
  const backgroundColor = usePiHoleColors
    ? `color-mix(in srgb, ${item.color} calc(var(--opacity, 1) * 40%), transparent)`
    : "color-mix(in srgb, var(--mantine-color-primaryColor-filled) calc(var(--opacity, 1) * 12%), transparent)";

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
            "1px solid color-mix(in srgb, var(--mantine-color-secondaryColor-filled) calc(var(--opacity, 1) * 45%), transparent)",
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
