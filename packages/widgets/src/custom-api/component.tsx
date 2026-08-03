"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { ComponentType } from "react";
import {
  ActionIcon,
  Badge,
  Box,
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
import { IconAlertTriangle, IconCheck, IconExternalLink, IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { useWidgetRuntimeActions } from "../runtime-hooks";
import { getUsableWidgetQueryData } from "../common/query-state";
import actionTargetClasses from "../common/action-target.module.css";

const CustomJsxDisplay = dynamic(() => import("./custom-jsx-display"), { ssr: false });

const valueSizeMap: Record<string, "sm" | "md" | "lg" | "xl"> = { sm: "sm", md: "md", lg: "lg", xl: "xl" };

interface CustomDisplayProps {
  data: Record<string, unknown>;
  displayMode: "compact" | "advanced";
  width: number;
  height: number;
}

function SingleValueDisplay({ data, displayMode, width, height }: CustomDisplayProps) {
  const configuredSize = valueSizeMap[(data.valueSize as string) ?? "lg"] ?? "lg";
  const size = displayMode === "compact" && (width < 180 || height < 96) ? "md" : configuredSize;
  const labelAbove = (data.labelPosition as string) === "above";
  const label = data.label ? (
    <Text c="dimmed" size={height < 96 ? "xs" : "sm"} ta="center" lineClamp={2}>
      {String(data.label)}
    </Text>
  ) : null;

  return (
    <Stack h="100%" align="center" justify="center" gap="xs">
      {labelAbove && label}
      <Title order={size === "xl" ? 1 : size === "lg" ? 2 : size === "md" ? 3 : 4} ta="center" lineClamp={2} maw="100%">
        {String(data.value ?? "—")}
        {data.unit ? ` ${data.unit}` : ""}
      </Title>
      {!labelAbove && label}
    </Stack>
  );
}

function KeyValueDisplay({ data, displayMode, width, height }: CustomDisplayProps) {
  const entries = (data.entries as Array<{ label: string; unit: string; value: unknown }>) ?? [];
  const layout = (data.layout as string) ?? "list";
  const configuredColumns = Math.max(1, (data.columns as number) ?? 2);
  const columns =
    displayMode === "advanced" ? configuredColumns : Math.min(configuredColumns, Math.max(1, Math.floor(width / 140)));
  const padding = height < 112 ? "xs" : "sm";

  if (layout === "grid") {
    return (
      <ScrollArea h="100%">
        <SimpleGrid cols={columns} spacing="xs" p={padding}>
          {entries.map((entry, i) => (
            <Stack key={i} align="center" gap={2} miw={0}>
              <Text size="sm" fw={600} truncate="end" maw="100%">
                {String(entry.value ?? "—")}
                {entry.unit ? ` ${entry.unit}` : ""}
              </Text>
              <Text size="xs" c="dimmed" truncate="end" maw="100%">
                {entry.label}
              </Text>
            </Stack>
          ))}
        </SimpleGrid>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea h="100%">
      <Stack justify="center" gap={height < 112 ? 4 : "xs"} p={padding}>
        {entries.map((entry, i) => (
          <Group key={i} justify="space-between" wrap="nowrap" gap="xs">
            <Text size="sm" c="dimmed" truncate="end">
              {entry.label}
            </Text>
            <Text size="sm" fw={600} truncate="end" maw="55%">
              {String(entry.value ?? "—")}
              {entry.unit ? ` ${entry.unit}` : ""}
            </Text>
          </Group>
        ))}
      </Stack>
    </ScrollArea>
  );
}

function TableDisplay({ data, displayMode, width, height }: CustomDisplayProps) {
  const columns = (data.columns as string[]) ?? [];
  const rows = (data.rows as unknown[][]) ?? [];
  const striped = (data.striped as boolean) ?? true;
  const compact = (data.compact as boolean) ?? false;

  const visibleColumnCount = displayMode === "advanced" ? columns.length : Math.max(1, Math.floor(width / 120));
  const visibleRowCount = displayMode === "advanced" ? rows.length : Math.max(1, Math.floor(height / 32) - 1);
  const visibleColumns = columns.slice(0, visibleColumnCount);

  return (
    <ScrollArea h="100%">
      <Table striped={striped} highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            {visibleColumns.map((col, i) => (
              <Table.Th key={i} py={compact ? 4 : undefined}>
                {col}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.slice(0, visibleRowCount).map((row, i) => (
            <Table.Tr key={i}>
              {row.slice(0, visibleColumnCount).map((cell, j) => (
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
            <Text size="xs" c="dimmed" ta="center" lh={1.3} lineClamp={2}>
              {item.label}
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}

function StatGridDisplay({ data, displayMode, width, height }: CustomDisplayProps) {
  const items = (data.items as Array<{ label: string; unit: string; color: string; value: unknown }>) ?? [];
  const configuredColumns = Math.max(1, (data.columns as number) ?? 2);
  const columns =
    displayMode === "advanced" ? configuredColumns : Math.min(configuredColumns, Math.max(1, Math.floor(width / 120)));
  const cardStyle = (data.cardStyle as string) ?? "filled";

  return (
    <SimpleGrid
      cols={columns}
      spacing="xs"
      p={height < 96 ? 4 : "xs"}
      h="100%"
      style={{ gridTemplateRows: `repeat(${Math.ceil(items.length / columns)}, 1fr)` }}
    >
      {items.map((item, i) => (
        <StatGridCard key={i} item={item} cardStyle={cardStyle} />
      ))}
    </SimpleGrid>
  );
}

function ProgressBarsDisplay({ data, height }: CustomDisplayProps) {
  const bars = (data.bars as Array<{ label: string; unit: string; color: string; value: number; max?: number }>) ?? [];
  const showPercentage = (data.showPercentage as boolean) ?? true;
  const barSize = (data.barSize as string) ?? "md";

  const sizeMap: Record<string, number> = { sm: 8, md: 14, lg: 22 };

  return (
    <ScrollArea h="100%">
      <Stack justify="center" gap={height < 120 ? "xs" : "sm"} p={height < 120 ? "xs" : "sm"}>
        {bars.map((bar, i) => {
          const max = bar.max ?? 100;
          const pct = max > 0 ? Math.min((bar.value / max) * 100, 100) : 0;
          return (
            <Stack key={i} gap={4}>
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text size="xs" fw={500} truncate="end" style={{ flex: 1, minWidth: 0 }}>
                  {bar.label}
                </Text>
                <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
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
    </ScrollArea>
  );
}

function StatusIndicatorDisplay({ data, displayMode, width, height }: CustomDisplayProps) {
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
      <Text size="sm" fw={500} truncate="end" style={{ flex: 1, minWidth: 0 }}>
        {item.label}
      </Text>
      <Text size="xs" c="dimmed" ml="auto" truncate="end" maw="45%">
        {item.value}
      </Text>
    </Group>
  );

  if (layout === "grid") {
    const columns = displayMode === "advanced" || width >= 280 ? 2 : 1;
    return (
      <ScrollArea h="100%">
        <SimpleGrid cols={columns} spacing="xs" p={height < 112 ? "xs" : "sm"}>
          {items.map(renderItem)}
        </SimpleGrid>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea h="100%">
      <Stack justify="center" gap="xs" p={height < 112 ? "xs" : "sm"}>
        {items.map(renderItem)}
      </Stack>
    </ScrollArea>
  );
}

function CountGridDisplay({ data, displayMode, width, height }: CustomDisplayProps) {
  const items = (data.items as Array<{ label: string; unit: string; value: unknown }>) ?? [];
  const configuredColumns = Math.max(1, (data.columns as number) ?? 2);
  const columns =
    displayMode === "advanced" ? configuredColumns : Math.min(configuredColumns, Math.max(1, Math.floor(width / 120)));
  const valueSize = (data.valueSize as string) ?? "md";

  const sizeMap: Record<string, string> = { sm: "sm", md: "md", lg: "lg" };

  return (
    <ScrollArea h="100%">
      <SimpleGrid cols={columns} spacing="xs" p={height < 112 ? "xs" : "sm"}>
        {items.map((item, i) => (
          <Stack key={i} align="center" justify="center" gap={0} miw={0}>
            <Text size={sizeMap[valueSize] ?? "md"} fw={700} lh={1.2} truncate="end" maw="100%">
              {String(item.value ?? "—")}
              {item.unit ? ` ${item.unit}` : ""}
            </Text>
            <Text size="xs" c="dimmed" ta="center" lh={1.3} truncate="end" maw="100%">
              {item.label}
            </Text>
          </Stack>
        ))}
      </SimpleGrid>
    </ScrollArea>
  );
}

function openJsonInBrowser(json: unknown) {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

function RawDisplay({ data, displayMode, height }: CustomDisplayProps) {
  const t = useScopedI18n("widget.customApi");
  const maxHeight = displayMode === "advanced" ? Math.max(160, height - 80) : ((data.maxHeight as number) ?? 300);
  const jsonString = JSON.stringify(data.data, null, 2);

  return (
    <Stack gap={4} p="xs" h="100%">
      <Group justify="flex-end">
        <Tooltip label={t("actions.openJsonViewer")}>
          <ActionIcon
            className={actionTargetClasses.root}
            variant="subtle"
            size="sm"
            aria-label={t("actions.openJsonViewer")}
            onClick={() => openJsonInBrowser(data.data)}
          >
            <IconExternalLink size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <ScrollArea mah={maxHeight} style={{ flex: 1, minHeight: 0 }}>
        <Code block style={{ fontSize: 12 }}>
          {jsonString}
        </Code>
      </ScrollArea>
    </Stack>
  );
}

function ActionButtonDisplay({ data, width, height }: CustomDisplayProps) {
  const t = useScopedI18n("widget.customApi");
  const { openConfirmModal } = useConfirmModal();
  const executeMutation = clientApi.customWidget.execute.useMutation();
  const [lastSuccess, setLastSuccess] = useState(false);

  const buttonLabel = (data.buttonLabel as string) ?? "Execute";
  const buttonColor = (data.buttonColor as string) ?? "blue";
  const confirmText = (data.confirmText as string) || "";
  const successMessage = (data.successMessage as string) || t("executeSuccess");
  const definitionId = data.widgetDefinitionId as string | undefined;
  const boardId = data.boardId as string | undefined;
  const itemId = data.itemId as string | undefined;
  const canExecute = data.canExecute === true;

  const handleExecute = async () => {
    if (!definitionId || !boardId || !itemId || !canExecute) return;
    setLastSuccess(false);
    try {
      const result = await executeMutation.mutateAsync({ boardId, itemId, definitionId });
      if (result.success) {
        setLastSuccess(true);
        showSuccessNotification({ title: buttonLabel, message: successMessage });
        setTimeout(() => setLastSuccess(false), 3000);
      } else {
        showErrorNotification({ title: buttonLabel, message: t("executeFailed") });
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
        size={width < 180 || height < 96 ? "sm" : "lg"}
        color={buttonColor}
        onClick={handleClick}
        loading={executeMutation.isPending}
        disabled={!canExecute || !boardId || !itemId || !definitionId}
        leftSection={lastSuccess ? <IconCheck size={18} /> : <IconPlayerPlay size={18} />}
        variant={lastSuccess ? "light" : "filled"}
        maw="calc(100% - var(--mantine-spacing-sm) * 2)"
      >
        <Text truncate="end">{executeMutation.isPending ? t("executing") : buttonLabel}</Text>
      </Button>
    </Center>
  );
}

const CustomJsxAdapter = ({ data }: CustomDisplayProps) => <CustomJsxDisplay data={data} />;

export const displayComponents: Record<string, ComponentType<CustomDisplayProps>> = {
  singleValue: SingleValueDisplay,
  keyValue: KeyValueDisplay,
  table: TableDisplay,
  statGrid: StatGridDisplay,
  progressBars: ProgressBarsDisplay,
  statusIndicator: StatusIndicatorDisplay,
  countGrid: CountGridDisplay,
  raw: RawDisplay,
  actionButton: ActionButtonDisplay,
  customJsx: CustomJsxAdapter,
};

const displayTypeTranslationKeys = {
  singleValue: "displayType.singleValue",
  keyValue: "displayType.keyValue",
  table: "displayType.table",
  statGrid: "displayType.statGrid",
  progressBars: "displayType.progressBars",
  statusIndicator: "displayType.statusIndicator",
  countGrid: "displayType.countGrid",
  raw: "displayType.raw",
  actionButton: "displayType.actionButton",
  customJsx: "displayType.customJsx",
} as const;

export default function CustomApiWidget({
  options,
  boardId,
  itemId,
  width,
  height,
  displayMode = "compact",
  widgetRuntimeRef,
}: WidgetComponentProps<"customApi">) {
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

  if (!boardId || !itemId) return null;

  return (
    <CustomApiWidgetInner
      boardId={boardId}
      itemId={itemId}
      definitionId={definitionId}
      refreshInterval={refreshInterval as number}
      width={width}
      height={height}
      displayMode={displayMode}
      widgetRuntimeRef={widgetRuntimeRef}
    />
  );
}

function CustomApiWidgetInner({
  boardId,
  itemId,
  definitionId,
  refreshInterval,
  width,
  height,
  displayMode,
  widgetRuntimeRef,
}: {
  boardId: string;
  itemId: string;
  definitionId: string;
  refreshInterval: number;
  width: number;
  height: number;
  displayMode: "compact" | "advanced";
  widgetRuntimeRef?: WidgetComponentProps<"customApi">["widgetRuntimeRef"];
}) {
  const t = useScopedI18n("widget.customApi");
  const tCustomWidget = useScopedI18n("customWidget");
  const safeInterval = Number.isFinite(refreshInterval) ? refreshInterval : 30;
  const intervalMs = Math.max(1000, safeInterval * 1000);
  const [pollingPaused, setPollingPaused] = useState(false);
  const query = clientApi.widget.customApi.getData.useQuery(
    { boardId, itemId, definitionId },
    {
      refetchInterval: (query) => {
        const result = query.state.data as Record<string, unknown> | undefined;
        if (pollingPaused || result?.type === "actionButton" || result?.type === "disabled") return false;
        return intervalMs;
      },
      retry: (failureCount, err) => {
        if (err.data?.code === "NOT_FOUND") return false;
        return failureCount < 3;
      },
    },
  );
  const data = getUsableWidgetQueryData(query);
  const { isLoading, refetch, isFetching } = query;

  const widgetData = (data ?? {}) as Record<string, unknown>;
  const dataType = widgetData.type as string | undefined;
  const canTogglePolling = Boolean(data) && dataType !== "actionButton" && dataType !== "disabled";
  const togglePolling = useCallback(() => {
    if (pollingPaused) void refetch();
    setPollingPaused((value) => !value);
  }, [pollingPaused, refetch]);

  useWidgetRuntimeActions(widgetRuntimeRef, canTogglePolling ? { togglePolling } : {});

  if (isLoading) {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );
  }

  if (!data) return null;

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
    const displayTypeKey = displayTypeTranslationKeys[dataType as keyof typeof displayTypeTranslationKeys];
    const pollingLabel = pollingPaused ? t("actions.resumePolling") : t("actions.pausePolling");
    const enrichedData =
      dataType === "actionButton" ? { ...widgetData, boardId, itemId, widgetDefinitionId: definitionId } : widgetData;
    const content = <Component data={enrichedData} displayMode={displayMode} width={width} height={height} />;
    if (displayMode === "compact") return content;
    return (
      <Stack h="100%" gap="xs" p="xs">
        <Group justify="space-between" wrap="nowrap">
          <Badge variant="light">{displayTypeKey ? t(displayTypeKey) : t("displayType.unknown")}</Badge>
          {dataType !== "actionButton" && (
            <Tooltip label={pollingLabel}>
              <ActionIcon
                className={actionTargetClasses.root}
                aria-label={pollingLabel}
                variant="subtle"
                loading={isFetching}
                onClick={togglePolling}
              >
                {pollingPaused ? <IconPlayerPlay size={16} /> : <IconPlayerPause size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
        <Box style={{ flex: 1, minHeight: 0 }}>{content}</Box>
      </Stack>
    );
  }

  return (
    <ScrollArea h="100%" p="xs">
      <Code block style={{ fontSize: 11 }}>
        {JSON.stringify(data, null, 2)}
      </Code>
    </ScrollArea>
  );
}
