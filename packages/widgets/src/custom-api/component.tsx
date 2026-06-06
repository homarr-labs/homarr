"use client";

import type { ComponentType } from "react";
import { Center, Group, Loader, Stack, Table, Text, Title } from "@mantine/core";
import { AreaChart, BarChart, LineChart, Sparkline } from "@mantine/charts";
import { IconAlertTriangle } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

interface SingleValueResult {
  type: "singleValue";
  label: string;
  unit: string;
  value: unknown;
}

interface KeyValueResult {
  type: "keyValue";
  entries: Array<{ label: string; unit: string; value: unknown }>;
}

interface TableResult {
  type: "table";
  columns: string[];
  rows: unknown[][];
}

interface ChartSeries {
  name: string;
  color: string;
}

interface LineChartResult {
  type: "lineChart";
  data: Record<string, unknown>[];
  xKey: string;
  series: ChartSeries[];
  height: number;
  curveType: "linear" | "monotone" | "step";
}

interface AreaChartResult {
  type: "areaChart";
  data: Record<string, unknown>[];
  xKey: string;
  series: ChartSeries[];
  height: number;
  curveType: "linear" | "monotone" | "step";
}

interface BarChartResult {
  type: "barChart";
  data: Record<string, unknown>[];
  xKey: string;
  series: ChartSeries[];
  height: number;
  orientation: "horizontal" | "vertical";
}

interface SparklineResult {
  type: "sparkline";
  data: number[];
  height: number;
  color: string;
}

type WidgetData =
  | SingleValueResult
  | KeyValueResult
  | TableResult
  | LineChartResult
  | AreaChartResult
  | BarChartResult
  | SparklineResult;

function SingleValueDisplay({ data }: { data: SingleValueResult }) {
  return (
    <Stack h="100%" align="center" justify="center" gap="xs">
      <Title order={2}>
        {String(data.value ?? "—")}
        {data.unit ? ` ${data.unit}` : ""}
      </Title>
      {data.label && (
        <Text c="dimmed" size="sm">
          {data.label}
        </Text>
      )}
    </Stack>
  );
}

function KeyValueDisplay({ data }: { data: KeyValueResult }) {
  return (
    <Stack h="100%" justify="center" gap="xs" p="sm">
      {data.entries.map((entry, i) => (
        <Group key={i} justify="space-between" wrap="nowrap">
          <Text size="sm" c="dimmed">
            {entry.label}
          </Text>
          <Text size="sm" fw={600}>
            {String(entry.value ?? "—")}
            {entry.unit ? ` ${entry.unit}` : ""}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

function TableDisplay({ data }: { data: TableResult }) {
  return (
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          {data.columns.map((col, i) => (
            <Table.Th key={i}>{col}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {data.rows.map((row, i) => (
          <Table.Tr key={i}>
            {row.map((cell, j) => (
              <Table.Td key={j}>{String(cell ?? "—")}</Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function LineChartDisplay({ data }: { data: LineChartResult }) {
  return (
    <LineChart
      h={data.height}
      data={data.data}
      dataKey={data.xKey}
      series={data.series}
      curveType={data.curveType}
      withDots={false}
    />
  );
}

function AreaChartDisplay({ data }: { data: AreaChartResult }) {
  return (
    <AreaChart h={data.height} data={data.data} dataKey={data.xKey} series={data.series} curveType={data.curveType} />
  );
}

function BarChartDisplay({ data }: { data: BarChartResult }) {
  return (
    <BarChart
      h={data.height}
      data={data.data}
      dataKey={data.xKey}
      series={data.series}
      orientation={data.orientation}
    />
  );
}

function SparklineDisplay({ data }: { data: SparklineResult }) {
  return (
    <Center h="100%">
      <Sparkline h={data.height} w="80%" data={data.data} color={data.color} />
    </Center>
  );
}

const displayComponents: Record<string, ComponentType<{ data: WidgetData }>> = {
  singleValue: SingleValueDisplay as ComponentType<{ data: WidgetData }>,
  keyValue: KeyValueDisplay as ComponentType<{ data: WidgetData }>,
  table: TableDisplay as ComponentType<{ data: WidgetData }>,
  lineChart: LineChartDisplay as ComponentType<{ data: WidgetData }>,
  areaChart: AreaChartDisplay as ComponentType<{ data: WidgetData }>,
  barChart: BarChartDisplay as ComponentType<{ data: WidgetData }>,
  sparkline: SparklineDisplay as ComponentType<{ data: WidgetData }>,
};

function FlowGraphDisplay({ data }: { data: Record<string, unknown> }) {
  const t = useScopedI18n("widget.customApi");
  const displayEntries = Object.entries(data);

  if (displayEntries.length === 0) {
    return (
      <Center h="100%">
        <Text c="dimmed" size="sm">
          {t("noDisplayOutput")}
        </Text>
      </Center>
    );
  }

  return (
    <Stack h="100%" gap="xs">
      {displayEntries.map(([nodeId, nodeData]) => {
        const typed = nodeData as WidgetData;
        const Component = displayComponents[typed.type];
        if (!Component) return null;
        return <Component key={nodeId} data={typed} />;
      })}
    </Stack>
  );
}

export default function CustomApiWidget({ options }: WidgetComponentProps<"customApi">) {
  const t = useScopedI18n("widget.customApi");
  const { definitionId } = options;

  if (!definitionId) {
    return (
      <Center h="100%">
        <Stack align="center" gap="xs">
          <IconAlertTriangle size={32} color="var(--mantine-color-yellow-6)" />
          <Text c="dimmed" size="sm">
            {t("noDefinition")}
          </Text>
        </Stack>
      </Center>
    );
  }

  return <CustomApiWidgetInner definitionId={definitionId} />;
}

function CustomApiWidgetInner({ definitionId }: { definitionId: string }) {
  const t = useScopedI18n("widget.customApi");
  const { data, isLoading, error } = clientApi.widget.customApi.getData.useQuery(
    { definitionId },
    {
      refetchInterval: 30_000,
      retry: (failureCount, err) => {
        if (err.data?.code === "NOT_FOUND") return false;
        return failureCount < 3;
      },
    },
  );

  if (isLoading) {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );
  }

  if (error) {
    const isNotFound = error.data?.code === "NOT_FOUND";
    return (
      <Center h="100%">
        <Stack align="center" gap="xs">
          <IconAlertTriangle size={32} color={`var(--mantine-color-${isNotFound ? "yellow" : "red"}-6)`} />
          <Text c="dimmed" size="sm" ta="center">
            {isNotFound ? t("definitionNotFound") : error.message}
          </Text>
        </Stack>
      </Center>
    );
  }

  if (!data) {
    return null;
  }

  const widgetData = data as WidgetData | Record<string, unknown>;

  if ("type" in widgetData && typeof widgetData.type === "string") {
    const Component = displayComponents[widgetData.type];
    if (Component) return <Component data={widgetData as WidgetData} />;
  }

  return <FlowGraphDisplay data={widgetData as Record<string, unknown>} />;
}
