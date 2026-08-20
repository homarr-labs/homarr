"use client";

import { Sparkline } from "@mantine/charts";
import { Badge, Box, Flex, Group, Paper, SimpleGrid, Stack, Text, Title, useMantineTheme } from "@mantine/core";
import { IconMinus, IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryErrorIndicator, WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function calculateChange(currentPrice: number, previousClose: number) {
  return currentPrice - previousClose;
}

function calculateChangePercentage(currentPrice: number, previousClose: number) {
  if (previousClose === 0) return null;
  return 100 * ((currentPrice - previousClose) / previousClose);
}

export interface StockSummary {
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercentage: number | null;
  minimum: number;
  maximum: number;
  graphValues: number[];
}

export interface StockLayout {
  showName: boolean;
  showChange: boolean;
  showRange: boolean;
  graphHeight: "48%" | "68%" | "75%";
  priceOrder: 1 | 2;
}

export function getStockLayout(width: number, height: number, showDetails: boolean): StockLayout {
  return {
    showName: showDetails && width >= 300 && height >= 190,
    showChange: showDetails && width >= 260 && height >= 130,
    showRange: showDetails && width >= 220 && height >= 130,
    graphHeight: height >= 320 ? "75%" : height >= 220 ? "68%" : "48%",
    priceOrder: width >= 280 && height >= 120 ? 1 : 2,
  };
}

export function getStockSummary(priceHistory: number[], previousClose: number): StockSummary | null {
  const currentPrice = priceHistory.at(-1);
  if (currentPrice === undefined) return null;

  const minimum = Math.min(...priceHistory);
  return {
    currentPrice,
    previousClose,
    change: round(calculateChange(currentPrice, previousClose)),
    changePercentage: calculateChangePercentage(currentPrice, previousClose),
    minimum,
    maximum: Math.max(...priceHistory),
    graphValues: priceHistory.map((value) => value - minimum + 50),
  };
}

export default function StockPriceWidget({
  options,
  width,
  height,
  displayMode = "compact",
}: WidgetComponentProps<"stockPrice">) {
  const t = useScopedI18n("widget.stockPrice");
  const locale = useCurrentIntlLocale();
  const numberFormatter = new Intl.NumberFormat(locale);
  const theme = useMantineTheme();
  const stockQuery = clientApi.widget.stockPrice.getPriceHistory.useQuery(options);
  const result = getUsableWidgetQueryData(stockQuery);

  if (isInitialWidgetQueryPending(stockQuery)) return <WidgetQueryLoadingState />;
  if (!result) return <WidgetEmptyState />;
  const { data } = result;

  const summary = getStockSummary(data.priceHistory, data.previousClose);
  if (!summary) return <WidgetEmptyState />;
  const stockValuesChange = summary.change;
  const stockValuesChangePercentage = summary.changePercentage === null ? null : round(summary.changePercentage);
  const stockGraphValues = summary.graphValues;
  const trendColor = stockValuesChange > 0 ? "green.7" : stockValuesChange < 0 ? "red.7" : "gray.6";
  const layout = getStockLayout(width, height, options.showDetails);
  const formatValue = (value: number) => numberFormatter.format(round(value));
  const formatSignedValue = (value: number) => `${value > 0 ? "+" : ""}${formatValue(value)}`;

  const content =
    displayMode === "advanced" ? (
      <Stack h="100%" w="100%" gap="md" p="md" style={{ overflow: "hidden" }}>
        <Group justify="space-between" align="flex-start" gap="sm" wrap="wrap">
          <Stack gap={2}>
            <Title order={2}>{data.symbol}</Title>
            <Text c="dimmed">{data.shortName}</Text>
          </Stack>
          <Group gap="xs" wrap="wrap" justify="flex-end">
            <Badge variant="light">
              {t("option.timeRange.label")}: {t(`option.timeRange.option.${options.timeRange}.label`)}
            </Badge>
            <Badge variant="light">
              {t("option.timeInterval.label")}: {t(`option.timeInterval.option.${options.timeInterval}.label`)}
            </Badge>
          </Group>
        </Group>

        <SimpleGrid cols={width >= 840 ? 6 : width >= 480 ? 3 : 2} spacing="xs">
          <StockMetric label={t("advanced.currentPrice")} value={formatValue(summary.currentPrice)} />
          <StockMetric label={t("advanced.previousClose")} value={formatValue(summary.previousClose)} />
          <StockMetric label={t("advanced.change")} value={formatSignedValue(summary.change)} color={trendColor} />
          <StockMetric
            label={t("advanced.changePercentage")}
            value={summary.changePercentage === null ? "—" : `${formatSignedValue(summary.changePercentage)}%`}
            color={trendColor}
          />
          <StockMetric label={t("advanced.minimum")} value={formatValue(summary.minimum)} />
          <StockMetric label={t("advanced.maximum")} value={formatValue(summary.maximum)} />
        </SimpleGrid>

        <Box style={{ flex: 1, minHeight: 160 }}>
          <Sparkline
            w="100%"
            h="100%"
            data={data.priceHistory}
            curveType="linear"
            color={trendColor}
            fillOpacity={0.35}
            strokeWidth={2.5}
          />
        </Box>
      </Stack>
    ) : (
      <Flex h="100%" w="100%">
        <Sparkline
          pos="absolute"
          bottom={10}
          w="100%"
          h={layout.graphHeight}
          data={stockGraphValues}
          curveType="linear"
          color={trendColor}
          fillOpacity={0.6}
          strokeWidth={2.5}
        />

        <Stack pos="absolute" top={10} left={10}>
          <Text size="xl" fw={700} lh="0.715">
            {stockValuesChange > 0 ? (
              <IconTrendingUp size="1.5rem" color={theme.colors.green[7]} />
            ) : stockValuesChange < 0 ? (
              <IconTrendingDown size="1.5rem" color={theme.colors.red[7]} />
            ) : (
              <IconMinus size="1.5rem" color={theme.colors.gray[6]} />
            )}
            {data.symbol}
          </Text>
          {layout.showName && (
            <Text size="md" lh="1">
              {data.shortName}
            </Text>
          )}
        </Stack>

        <Title pos="absolute" bottom={10} right={10} order={layout.priceOrder} fw={700}>
          {formatValue(summary.currentPrice)}
        </Title>

        {layout.showChange && (
          <Text pos="absolute" top={10} right={10} size="xl" fw={700}>
            {numberFormatter.format(stockValuesChange)}
            {stockValuesChangePercentage === null
              ? null
              : ` (${stockValuesChange > 0 ? "+" : ""}${numberFormatter.format(stockValuesChangePercentage)}%)`}
          </Text>
        )}

        {layout.showRange && (
          <Text pos="absolute" bottom={10} left={10} fw={700}>
            {t(`option.timeRange.option.${options.timeRange}.label`)}
          </Text>
        )}
      </Flex>
    );

  return (
    <Box h="100%" w="100%" pos="relative">
      {content}
      {stockQuery.error && (
        <Box pos="absolute" top={4} right={4}>
          <WidgetQueryErrorIndicator error={stockQuery.error} label={t("name")} />
        </Box>
      )}
    </Box>
  );
}

function StockMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Paper p="sm" radius="md">
      <Text size="xs" c="dimmed" truncate>
        {label}
      </Text>
      <Text size="lg" fw={700} c={color} truncate title={value}>
        {value}
      </Text>
    </Paper>
  );
}
