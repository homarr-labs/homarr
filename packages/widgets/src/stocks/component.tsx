"use client";

import { Sparkline } from "@mantine/charts";
import { Flex, Stack, Text, Title, useMantineTheme } from "@mantine/core";
import { IconMinus, IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
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
  change: number;
  changePercentage: number | null;
  graphValues: number[];
}

export interface StockLayout {
  showName: boolean;
  showChange: boolean;
  showRange: boolean;
  graphHeight: "48%" | "68%" | "75%";
  priceOrder: 1 | 2;
}

export function getStockLayout(width: number, height: number): StockLayout {
  return {
    showName: width >= 300 && height >= 190,
    showChange: width >= 260 && height >= 130,
    showRange: width >= 220 && height >= 130,
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
    change: round(calculateChange(currentPrice, previousClose)),
    changePercentage: calculateChangePercentage(currentPrice, previousClose),
    graphValues: priceHistory.map((value) => value - minimum + 50),
  };
}

export default function StockPriceWidget({ options, width, height }: WidgetComponentProps<"stockPrice">) {
  const t = useScopedI18n("widget.stockPrice");
  const locale = useCurrentIntlLocale();
  const numberFormatter = new Intl.NumberFormat(locale);
  const theme = useMantineTheme();
  const { data: result, error } = clientApi.widget.stockPrice.getPriceHistory.useQuery(options);

  if (error && !result) throw error;
  if (!result) return <WidgetEmptyState />;
  const { data } = result;

  const summary = getStockSummary(data.priceHistory, data.previousClose);
  if (!summary) return <WidgetEmptyState />;
  const stockValuesChange = summary.change;
  const stockValuesChangePercentage = summary.changePercentage === null ? null : round(summary.changePercentage);
  const stockGraphValues = summary.graphValues;
  const trendColor = stockValuesChange > 0 ? "green.7" : stockValuesChange < 0 ? "red.7" : "gray.6";
  const layout = getStockLayout(width, height);

  return (
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
        {numberFormatter.format(round(summary.currentPrice))}
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
}
