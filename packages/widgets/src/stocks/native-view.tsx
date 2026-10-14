"use client";

import { Sparkline } from "@mantine/charts";
import { Badge, Box, Flex, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconMinus, IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import classes from "./stocks.module.css";

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

export interface StockNativeViewProps {
  data: { symbol: string; shortName: string; priceHistory: number[] };
  summary: StockSummary;
  showDetails: boolean;
  width: number;
  height: number;
  displayMode?: "compact" | "advanced";
  displayScale?: number;
  locale: string;
  trendColors: { green?: string; red?: string; gray?: string };
  labels: {
    timeRange: string;
    timeRangeValue: string;
    timeInterval: string;
    timeIntervalValue: string;
    currentPrice: string;
    previousClose: string;
    change: string;
    changePercentage: string;
    minimum: string;
    maximum: string;
  };
}

export function StockPriceNativeView({
  data,
  summary,
  showDetails,
  locale,
  trendColors,
  labels,
  width,
  height,
  displayMode = "compact",
  displayScale = 1,
}: StockNativeViewProps) {
  const numberFormatter = new Intl.NumberFormat(locale);
  const stockValuesChange = summary.change;
  const stockValuesChangePercentage = summary.changePercentage === null ? null : round(summary.changePercentage);
  const stockGraphValues = summary.graphValues;
  const trendColor = stockValuesChange > 0 ? "green.7" : stockValuesChange < 0 ? "red.7" : "gray.6";
  const layout = getStockLayout(width, height, showDetails);
  let scale = displayScale;
  if (!Number.isFinite(scale) || scale <= 0 || displayMode === "advanced") scale = 1;
  const visibleWidth = width * scale;
  const visibleHeight = height * scale;
  const fontSize = (size: number) => `${size / scale}px`;
  const compactPriceSize = Math.max(12, Math.min(34, visibleHeight * 0.28, visibleWidth * 0.085));
  const compactLabelSize = Math.min(16, Math.max(10, visibleHeight * 0.2));
  const showChange = layout.showChange && visibleWidth >= 180 && visibleHeight >= 48;
  const showRange = layout.showRange && visibleWidth >= 180 && visibleHeight >= 48;
  const showName = layout.showName && visibleWidth >= 240 && visibleHeight >= 130;
  const formatValue = (value: number) => numberFormatter.format(round(value));
  const formatSignedValue = (value: number) => `${value > 0 ? "+" : ""}${formatValue(value)}`;

  let changeLabel = numberFormatter.format(stockValuesChange);
  if (stockValuesChangePercentage !== null) {
    changeLabel += ` (${stockValuesChange > 0 ? "+" : ""}${numberFormatter.format(stockValuesChangePercentage)}%)`;
  }
  const rangeLabel = labels.timeRangeValue;

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
              {labels.timeRange}: {labels.timeRangeValue}
            </Badge>
            <Badge variant="light">
              {labels.timeInterval}: {labels.timeIntervalValue}
            </Badge>
          </Group>
        </Group>

        <SimpleGrid cols={width >= 840 ? 6 : width >= 480 ? 3 : 2} spacing="xs">
          <StockMetric label={labels.currentPrice} value={formatValue(summary.currentPrice)} />
          <StockMetric label={labels.previousClose} value={formatValue(summary.previousClose)} />
          <StockMetric label={labels.change} value={formatSignedValue(summary.change)} color={trendColor} />
          <StockMetric
            label={labels.changePercentage}
            value={summary.changePercentage === null ? "—" : `${formatSignedValue(summary.changePercentage)}%`}
            color={trendColor}
          />
          <StockMetric label={labels.minimum} value={formatValue(summary.minimum)} />
          <StockMetric label={labels.maximum} value={formatValue(summary.maximum)} />
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
      <Box
        h="100%"
        w="100%"
        className={classes.compact}
        style={{
          "--stock-title-inset": fontSize(16 * Math.max(1, scale)),
          display: "grid",
          gridTemplateRows: "auto auto minmax(0, 1fr)",
          gap: `var(--stock-row-gap, ${fontSize(2)})`,
          overflow: "hidden",
        }}
      >
        <Flex align="center" justify="space-between" style={{ minWidth: 0, gap: fontSize(4) }}>
          <Flex align="center" style={{ minWidth: 0, gap: fontSize(3) }}>
            {stockValuesChange > 0 ? (
              <IconTrendingUp size={fontSize(compactLabelSize)} color={trendColors.green} style={{ flexShrink: 0 }} />
            ) : stockValuesChange < 0 ? (
              <IconTrendingDown size={fontSize(compactLabelSize)} color={trendColors.red} style={{ flexShrink: 0 }} />
            ) : (
              <IconMinus size={fontSize(compactLabelSize)} color={trendColors.gray} style={{ flexShrink: 0 }} />
            )}
            <Text style={{ fontSize: fontSize(compactLabelSize) }} fw={700} lh={1.15} truncate title={data.symbol}>
              {data.symbol}
            </Text>
          </Flex>
          {showChange && (
            <Text
              fw={600}
              lh={1.15}
              style={{ maxWidth: "65%", fontSize: fontSize(Math.min(12, compactLabelSize)) }}
              truncate
              title={changeLabel}
            >
              {changeLabel}
            </Text>
          )}
        </Flex>

        <Flex align="flex-end" justify="space-between" style={{ minWidth: 0, gap: fontSize(4) }}>
          <Stack style={{ minWidth: 0, gap: fontSize(2) }}>
            {showName && (
              <Text style={{ fontSize: fontSize(14) }} lh={1.15} truncate title={data.shortName}>
                {data.shortName}
              </Text>
            )}
            <Text
              style={{ fontSize: fontSize(compactPriceSize) }}
              fw={700}
              lh={1.1}
              truncate
              title={formatValue(summary.currentPrice)}
            >
              {formatValue(summary.currentPrice)}
            </Text>
          </Stack>
          {showRange && (
            <Text
              lh={1.15}
              style={{ maxWidth: "40%", fontSize: fontSize(Math.min(12, compactLabelSize)) }}
              truncate
              title={rangeLabel}
            >
              {rangeLabel}
            </Text>
          )}
        </Flex>

        <Box style={{ minHeight: 0, minWidth: 0 }}>
          <Sparkline
            w="100%"
            h="100%"
            data={stockGraphValues}
            curveType="linear"
            color={trendColor}
            fillOpacity={0.6}
            strokeWidth={2.5}
          />
        </Box>
      </Box>
    );

  return (
    <Box h="100%" w="100%" pos="relative">
      {content}
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
