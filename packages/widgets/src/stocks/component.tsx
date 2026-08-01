"use client";

import { Sparkline } from "@mantine/charts";
import { Flex, Stack, Text, Title, useMantineTheme } from "@mantine/core";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

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

export default function StockPriceWidget({ options, width, height, displayMode }: WidgetComponentProps<"stockPrice">) {
  const t = useScopedI18n("widget.stockPrice");
  const theme = useMantineTheme();
  const { data: result } = clientApi.widget.stockPrice.getPriceHistory.useQuery(options);

  if (!result) return <WidgetEmptyState />;
  const { data } = result;

  const summary = getStockSummary(data.priceHistory, data.previousClose);
  if (!summary) return <WidgetEmptyState />;
  const stockValuesChange = summary.change;
  const stockValuesChangePercentage = summary.changePercentage === null ? null : round(summary.changePercentage);
  const stockGraphValues = summary.graphValues;
  const trendColor = stockValuesChange > 0 ? "green.7" : stockValuesChange < 0 ? "red.7" : "gray.6";

  return (
    <Flex h="100%" w="100%">
      <Sparkline
        pos="absolute"
        bottom={10}
        w="100%"
        h={displayMode === "advanced" || height > 280 ? "75%" : "50%"}
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
          ) : (
            <IconTrendingDown size="1.5rem" color={theme.colors.red[7]} />
          )}
          {data.symbol}
        </Text>
        {(displayMode === "advanced" || (width > 280 && height > 280)) && (
          <Text size="md" lh="1">
            {data.shortName}
          </Text>
        )}
      </Stack>

      <Title pos="absolute" bottom={10} right={10} order={width > 280 ? 1 : 2} fw={700}>
        {new Intl.NumberFormat().format(round(summary.currentPrice))}
      </Title>

      {(displayMode === "advanced" || width > 280) && (
        <Text pos="absolute" top={10} right={10} size="xl" fw={700}>
          {new Intl.NumberFormat().format(stockValuesChange)}
          {stockValuesChangePercentage === null
            ? null
            : ` (${stockValuesChange > 0 ? "+" : ""}${new Intl.NumberFormat().format(stockValuesChangePercentage)}%)`}
        </Text>
      )}

      {(displayMode === "advanced" || width > 280) && (
        <Text pos="absolute" bottom={10} left={10} fw={700}>
          {t(`option.timeRange.option.${options.timeRange}.label`)}
        </Text>
      )}
    </Flex>
  );
}
