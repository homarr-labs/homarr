"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ComponentType } from "react";
import {
  ActionIcon,
  Button,
  Card,
  Center,
  Code,
  Flex,
  Group,
  Loader,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconAlertTriangle, IconCheck, IconExternalLink, IconPlayerPlay } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

const CustomJsxDisplay = dynamic(() => import("./custom-jsx-display"), { ssr: false });

const valueSizeMap: Record<string, string> = { sm: "sm", md: "md", lg: "lg", xl: "xl" };

function SingleValueDisplay({ data }: { data: Record<string, unknown> }) {
  const size = valueSizeMap[(data.valueSize as string) ?? "lg"] ?? "lg";
  const labelAbove = (data.labelPosition as string) === "above";
  const label = data.label ? (
    <Text c="dimmed" size="sm">
      {String(data.label)}
    </Text>
  ) : null;

  return (
    <Stack h="100%" align="center" justify="center" gap="xs">
      {labelAbove && label}
      <Title order={size === "xl" ? 1 : size === "lg" ? 2 : size === "md" ? 3 : 4}>
        {String(data.value ?? "—")}
        {data.unit ? ` ${data.unit}` : ""}
      </Title>
      {!labelAbove && label}
    </Stack>
  );
}

function KeyValueDisplay({ data }: { data: Record<string, unknown> }) {
  const entries = (data.entries as Array<{ label: string; unit: string; value: unknown }>) ?? [];
  const layout = (data.layout as string) ?? "list";
  const columns = (data.columns as number) ?? 2;

  if (layout === "grid") {
    return (
      <SimpleGrid cols={columns} spacing="xs" p="sm" h="100%">
        {entries.map((entry, i) => (
          <Stack key={i} align="center" gap={2}>
            <Text size="sm" fw={600}>
              {String(entry.value ?? "—")}
              {entry.unit ? ` ${entry.unit}` : ""}
            </Text>
            <Text size="xs" c="dimmed">
              {entry.label}
            </Text>
          </Stack>
        ))}
      </SimpleGrid>
    );
  }

  return (
    <Stack h="100%" justify="center" gap="xs" p="sm">
      {entries.map((entry, i) => (
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

function TableDisplay({ data }: { data: Record<string, unknown> }) {
  const columns = (data.columns as string[]) ?? [];
  const rows = (data.rows as unknown[][]) ?? [];
  const striped = (data.striped as boolean) ?? true;
  const compact = (data.compact as boolean) ?? false;

  return (
    <ScrollArea>
      <Table striped={striped} highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            {columns.map((col, i) => (
              <Table.Th key={i} py={compact ? 4 : undefined}>
                {col}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, i) => (
            <Table.Tr key={i}>
              {row.map((cell, j) => (
                <Table.Td key={j} py={compact ? 2 : undefined}>
                  {String(cell ?? "—")}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

function StatGridCard({
  item,
  cardStyle,
}: {
  item: { label: string; unit: string; color: string; value: unknown };
  cardStyle: string;
}) {
  const { ref, height, width } = useElementSize();
  const isWide = width > height + 20;
  const hideLabel = height > 0 && height <= 38;

  const bgMap: Record<string, string> = {
    filled: `var(--mantine-color-${item.color}-light)`,
    outline: "transparent",
    subtle: `var(--mantine-color-${item.color}-light)`,
  };

  return (
    <Card
      ref={ref}
      p="sm"
      radius="md"
      bg={bgMap[cardStyle] ?? bgMap.filled}
      withBorder={cardStyle === "outline"}
      h="100%"
      style={{ flex: 1 }}
    >
      <Flex
        h="100%"
        w="100%"
        align="center"
        justify="center"
        direction={isWide ? "row" : "column"}
        gap={isWide ? 8 : 4}
      >
        <Flex direction="column" align={isWide ? "flex-start" : "center"} gap={0}>
          <Text size="md" fw={700} ta="center" lh={1.1}>
            {String(item.value ?? "—")}
            {item.unit ? ` ${item.unit}` : ""}
          </Text>
          {!hideLabel && (
            <Text size="xs" c="dimmed" ta="center" tt="uppercase" lh={1.3} style={{ letterSpacing: "0.03em" }}>
              {item.label}
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}

function StatGridDisplay({ data }: { data: Record<string, unknown> }) {
  const items = (data.items as Array<{ label: string; unit: string; color: string; value: unknown }>) ?? [];
  const columns = (data.columns as number) ?? 2;
  const cardStyle = (data.cardStyle as string) ?? "filled";

  return (
    <SimpleGrid
      cols={columns}
      spacing="xs"
      p="xs"
      h="100%"
      style={{ gridTemplateRows: `repeat(${Math.ceil(items.length / columns)}, 1fr)` }}
    >
      {items.map((item, i) => (
        <StatGridCard key={i} item={item} cardStyle={cardStyle} />
      ))}
    </SimpleGrid>
  );
}

function ProgressBarsDisplay({ data }: { data: Record<string, unknown> }) {
  const bars = (data.bars as Array<{ label: string; unit: string; color: string; value: number; max?: number }>) ?? [];
  const showPercentage = (data.showPercentage as boolean) ?? true;
  const barSize = (data.barSize as string) ?? "md";

  const sizeMap: Record<string, number> = { sm: 8, md: 14, lg: 22 };

  return (
    <Stack h="100%" justify="center" gap="sm" p="sm">
      {bars.map((bar, i) => {
        const max = bar.max ?? 100;
        const pct = max > 0 ? Math.min((bar.value / max) * 100, 100) : 0;
        return (
          <Stack key={i} gap={4}>
            <Group justify="space-between" wrap="nowrap">
              <Text size="xs" fw={500}>
                {bar.label}
              </Text>
              <Text size="xs" c="dimmed">
                {showPercentage ? `${pct.toFixed(0)}%` : `${bar.value}${bar.unit ? ` ${bar.unit}` : ""}`}
                {bar.max !== undefined && showPercentage
                  ? ` (${bar.value}/${max}${bar.unit ? ` ${bar.unit}` : ""})`
                  : ""}
              </Text>
            </Group>
            <Progress value={pct} size={sizeMap[barSize] ?? 14} color={bar.color} radius="sm" />
          </Stack>
        );
      })}
    </Stack>
  );
}

function StatusIndicatorDisplay({ data }: { data: Record<string, unknown> }) {
  const items = (data.items as Array<{ label: string; value: string; isGood: boolean }>) ?? [];
  const layout = (data.layout as string) ?? "list";
  const dotSize = (data.dotSize as string) ?? "md";

  const dotSizeMap: Record<string, number> = { sm: 8, md: 10, lg: 14 };
  const size = dotSizeMap[dotSize] ?? 10;

  const renderItem = (item: { label: string; value: string; isGood: boolean }, i: number) => (
    <Group key={i} gap="xs" wrap="nowrap">
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: item.isGood ? "var(--mantine-color-green-6)" : "var(--mantine-color-red-6)",
          flexShrink: 0,
        }}
      />
      <Text size="sm" fw={500}>
        {item.label}
      </Text>
      <Text size="xs" c="dimmed" ml="auto">
        {item.value}
      </Text>
    </Group>
  );

  if (layout === "grid") {
    return (
      <SimpleGrid cols={2} spacing="xs" p="sm" h="100%">
        {items.map(renderItem)}
      </SimpleGrid>
    );
  }

  return (
    <Stack h="100%" justify="center" gap="xs" p="sm">
      {items.map(renderItem)}
    </Stack>
  );
}

function CountGridDisplay({ data }: { data: Record<string, unknown> }) {
  const items = (data.items as Array<{ label: string; unit: string; value: unknown }>) ?? [];
  const columns = (data.columns as number) ?? 2;
  const valueSize = (data.valueSize as string) ?? "md";

  const sizeMap: Record<string, string> = { sm: "sm", md: "md", lg: "lg" };

  return (
    <SimpleGrid cols={columns} spacing="xs" p="sm" h="100%">
      {items.map((item, i) => (
        <Stack key={i} align="center" justify="center" gap={0}>
          <Text size={sizeMap[valueSize] ?? "md"} fw={700} lh={1.2}>
            {String(item.value ?? "—")}
            {item.unit ? ` ${item.unit}` : ""}
          </Text>
          <Text size="xs" c="dimmed" tt="uppercase" ta="center" lh={1.3} style={{ letterSpacing: "0.03em" }}>
            {item.label}
          </Text>
        </Stack>
      ))}
    </SimpleGrid>
  );
}

function openJsonInBrowser(json: unknown) {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

function RawDisplay({ data }: { data: Record<string, unknown> }) {
  const maxHeight = (data.maxHeight as number) ?? 300;
  const jsonString = JSON.stringify(data.data, null, 2);

  return (
    <Stack gap={4} p="xs">
      <Group justify="flex-end">
        <Tooltip label="Open in browser JSON viewer">
          <ActionIcon variant="subtle" size="sm" onClick={() => openJsonInBrowser(data.data)}>
            <IconExternalLink size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <ScrollArea mah={maxHeight}>
        <Code block style={{ fontSize: 12 }}>
          {jsonString}
        </Code>
      </ScrollArea>
    </Stack>
  );
}

function ActionButtonDisplay({ data }: { data: Record<string, unknown> }) {
  const t = useScopedI18n("widget.customApi");
  const { openConfirmModal } = useConfirmModal();
  const executeMutation = clientApi.customWidget.execute.useMutation();
  const [lastSuccess, setLastSuccess] = useState(false);

  const buttonLabel = (data.buttonLabel as string) ?? "Execute";
  const buttonColor = (data.buttonColor as string) ?? "blue";
  const confirmText = (data.confirmText as string) || "";
  const successMessage = (data.successMessage as string) || t("executeSuccess");
  const definitionId = data.widgetDefinitionId as string | undefined;

  const handleExecute = async () => {
    if (!definitionId) return;
    setLastSuccess(false);
    try {
      const result = await executeMutation.mutateAsync({ definitionId });
      if (result.success) {
        setLastSuccess(true);
        showSuccessNotification({ title: buttonLabel, message: successMessage });
        setTimeout(() => setLastSuccess(false), 3000);
      } else {
        showErrorNotification({ title: buttonLabel, message: result.error ?? t("executeFailed") });
      }
    } catch {
      showErrorNotification({ title: buttonLabel, message: t("executeFailed") });
    }
  };

  const handleClick = () => {
    if (confirmText) {
      openConfirmModal({
        title: buttonLabel,
        children: confirmText,
        onConfirm: () => void handleExecute(),
      });
    } else {
      void handleExecute();
    }
  };

  return (
    <Center h="100%">
      <Button
        size="lg"
        color={buttonColor}
        onClick={handleClick}
        loading={executeMutation.isPending}
        leftSection={lastSuccess ? <IconCheck size={20} /> : <IconPlayerPlay size={20} />}
        variant={lastSuccess ? "light" : "filled"}
      >
        {executeMutation.isPending ? t("executing") : buttonLabel}
      </Button>
    </Center>
  );
}

export const displayComponents: Record<string, ComponentType<{ data: Record<string, unknown> }>> = {
  singleValue: SingleValueDisplay,
  keyValue: KeyValueDisplay,
  table: TableDisplay,
  statGrid: StatGridDisplay,
  progressBars: ProgressBarsDisplay,
  statusIndicator: StatusIndicatorDisplay,
  countGrid: CountGridDisplay,
  raw: RawDisplay,
  actionButton: ActionButtonDisplay,
  customJsx: CustomJsxDisplay,
};

export default function CustomApiWidget({ options }: WidgetComponentProps<"customApi">) {
  const t = useScopedI18n("widget.customApi");
  const { definitionId, refreshInterval } = options;

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

  return <CustomApiWidgetInner definitionId={definitionId} refreshInterval={refreshInterval as number} />;
}

function CustomApiWidgetInner({ definitionId, refreshInterval }: { definitionId: string; refreshInterval: number }) {
  const t = useScopedI18n("widget.customApi");
  const tCustomWidget = useScopedI18n("customWidget");
  const safeInterval = Number.isFinite(refreshInterval) ? refreshInterval : 30;
  const intervalMs = Math.max(1000, safeInterval * 1000);
  const { data, isLoading, error } = clientApi.widget.customApi.getData.useQuery(
    { definitionId },
    {
      refetchInterval: (query) => {
        const result = query.state.data as Record<string, unknown> | undefined;
        if (result?.type === "actionButton" || result?.type === "disabled") return false;
        return intervalMs;
      },
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

  if (!data) return null;

  const widgetData = data as Record<string, unknown>;
  const dataType = widgetData.type as string | undefined;

  if (dataType === "disabled") {
    return (
      <Center h="100%">
        <Text c="dimmed" size="sm">
          {tCustomWidget("widget.disabled")}
        </Text>
      </Center>
    );
  }

  const Component = dataType ? displayComponents[dataType] : undefined;
  if (Component) {
    const enrichedData = dataType === "actionButton" ? { ...widgetData, widgetDefinitionId: definitionId } : widgetData;
    return <Component data={enrichedData} />;
  }

  return (
    <ScrollArea h="100%" p="xs">
      <Code block style={{ fontSize: 11 }}>
        {JSON.stringify(data, null, 2)}
      </Code>
    </ScrollArea>
  );
}
