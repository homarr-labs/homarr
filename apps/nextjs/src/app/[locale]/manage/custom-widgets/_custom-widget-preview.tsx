"use client";

import { useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Code,
  Collapse,
  Group,
  Loader,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconChevronDown, IconChevronUp, IconPlayerPlay } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

interface PreviewInput {
  baseUrl: string;
  endpoint: string;
  method: string;
  authType: string;
  headerName?: string;
  requestBody?: string;
  displayType: string;
  displayConfig: Record<string, unknown>;
  secrets: Array<{ kind: string; value: string }>;
  definitionId?: string;
}

interface CustomWidgetPreviewProps {
  getFormValues: () => PreviewInput;
}

export function CustomWidgetPreview({ getFormValues }: CustomWidgetPreviewProps) {
  const t = useScopedI18n("customWidget");
  const previewMutation = clientApi.customWidget.preview.useMutation();
  const [rawOpen, { toggle: toggleRaw }] = useDisclosure(false);
  const [result, setResult] = useState<typeof previewMutation.data>(undefined);

  const handleTest = async () => {
    const values = getFormValues();
    if (!values.baseUrl || !values.endpoint) return;
    const res = await previewMutation.mutateAsync(values);
    setResult(res);
  };

  return (
    <Card withBorder shadow="sm" p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Title order={5}>{t("preview.title")}</Title>
          <Button
            size="xs"
            variant="light"
            leftSection={previewMutation.isPending ? <Loader size={14} /> : <IconPlayerPlay size={14} />}
            onClick={handleTest}
            loading={previewMutation.isPending}
          >
            {t("preview.test")}
          </Button>
        </Group>

        {previewMutation.error && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} p="xs">
            <Text size="xs">{previewMutation.error.message}</Text>
          </Alert>
        )}

        {result && !result.success && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} p="xs">
            <Text size="xs" fw={500}>{result.error}</Text>
            {result.responseInfo && (
              <Badge size="xs" color="red" variant="light" mt={4}>
                {result.responseInfo.status} {result.responseInfo.statusText}
              </Badge>
            )}
          </Alert>
        )}

        {result?.success && (
          <Stack gap="xs">
            <Group gap="xs">
              <Badge size="xs" color="green" variant="light">
                {result.responseInfo.status} {result.responseInfo.statusText}
              </Badge>
            </Group>

            <Card withBorder p="xs" bg="var(--mantine-color-dark-7)">
              <PreviewDisplay data={result.displayData} />
            </Card>

            <Group gap={4}>
              <ActionIcon size="xs" variant="subtle" onClick={toggleRaw}>
                {rawOpen ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
              </ActionIcon>
              <Text size="xs" c="dimmed" style={{ cursor: "pointer" }} onClick={toggleRaw}>
                {t("preview.rawResponse")}
              </Text>
            </Group>
            <Collapse expanded={rawOpen}>
              <ScrollArea h={200}>
                <Code block style={{ fontSize: 11 }}>{result.rawResponse}</Code>
              </ScrollArea>
            </Collapse>
          </Stack>
        )}

        {!result && !previewMutation.error && !previewMutation.isPending && (
          <Text size="xs" c="dimmed" ta="center">{t("preview.hint")}</Text>
        )}
      </Stack>
    </Card>
  );
}

function PreviewDisplay({ data }: { data: unknown }) {
  const typed = data as Record<string, unknown>;
  if (!typed || typeof typed !== "object") {
    return <Text size="xs" c="dimmed">No data</Text>;
  }

  const renderers: Record<string, (d: Record<string, unknown>) => React.ReactNode> = {
    singleValue: (d) => {
      const labelAbove = d.labelPosition === "above";
      const label = d.label ? <Text size="xs" c="dimmed">{String(d.label)}</Text> : null;
      return (
        <Stack align="center" gap={2} p="xs">
          {labelAbove && label}
          <Text size="lg" fw={700}>{String(d.value ?? "—")}{d.unit ? ` ${d.unit}` : ""}</Text>
          {!labelAbove && label}
        </Stack>
      );
    },
    keyValue: (d) => {
      const entries = (d.entries as Array<{ label: string; unit: string; value: unknown }>) ?? [];
      const layout = (d.layout as string) ?? "list";
      const columns = (d.columns as number) ?? 2;

      if (layout === "grid") {
        return (
          <SimpleGrid cols={Math.min(columns, 3)} spacing="xs" p="xs">
            {entries.map((e, i) => (
              <Stack key={i} align="center" gap={0}>
                <Text size="xs" fw={600}>{String(e.value ?? "—")}{e.unit ? ` ${e.unit}` : ""}</Text>
                <Text size="xs" c="dimmed">{e.label}</Text>
              </Stack>
            ))}
          </SimpleGrid>
        );
      }

      return (
        <Stack gap={2} p="xs">
          {entries.map((e, i) => (
            <Group key={i} justify="space-between" wrap="nowrap">
              <Text size="xs" c="dimmed">{e.label}</Text>
              <Text size="xs" fw={600}>{String(e.value ?? "—")}{e.unit ? ` ${e.unit}` : ""}</Text>
            </Group>
          ))}
        </Stack>
      );
    },
    table: (d) => {
      const columns = (d.columns as string[]) ?? [];
      const rows = (d.rows as unknown[][]) ?? [];
      return (
        <ScrollArea>
          <table style={{ width: "100%", fontSize: 11 }}>
            <thead>
              <tr>{columns.map((c, i) => <th key={i} style={{ textAlign: "left", padding: "2px 6px" }}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row, i) => (
                <tr key={i}>{row.map((cell, j) => <td key={j} style={{ padding: "2px 6px" }}>{String(cell ?? "—")}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      );
    },
    statGrid: (d) => {
      const items = (d.items as Array<{ label: string; unit: string; color: string; value: unknown }>) ?? [];
      const columns = Math.min((d.columns as number) ?? 2, 3);
      const cardStyle = (d.cardStyle as string) ?? "filled";
      return (
        <SimpleGrid cols={columns} spacing={6} p="xs">
          {items.map((item, i) => (
            <Card key={i} p={6} radius="sm" bg={cardStyle === "outline" ? "transparent" : `var(--mantine-color-${item.color}-light)`} withBorder={cardStyle === "outline"}>
              <Stack align="center" gap={0}>
                <Text size="sm" fw={700}>{String(item.value ?? "—")}{item.unit ? ` ${item.unit}` : ""}</Text>
                <Text size="xs" c="dimmed" tt="uppercase" style={{ fontSize: 9 }}>{item.label}</Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      );
    },
    progressBars: (d) => {
      const bars = (d.bars as Array<{ label: string; unit: string; color: string; value: number; max?: number }>) ?? [];
      const showPct = (d.showPercentage as boolean) ?? true;
      return (
        <Stack gap={6} p="xs">
          {bars.map((bar, i) => {
            const max = bar.max ?? 100;
            const pct = max > 0 ? Math.min((bar.value / max) * 100, 100) : 0;
            return (
              <Stack key={i} gap={2}>
                <Group justify="space-between">
                  <Text size="xs">{bar.label}</Text>
                  <Text size="xs" c="dimmed">{showPct ? `${pct.toFixed(0)}%` : `${bar.value}${bar.unit ? ` ${bar.unit}` : ""}`}</Text>
                </Group>
                <Progress value={pct} size={8} color={bar.color} radius="sm" />
              </Stack>
            );
          })}
        </Stack>
      );
    },
    statusIndicator: (d) => {
      const items = (d.items as Array<{ label: string; value: string; isGood: boolean }>) ?? [];
      return (
        <Stack gap={4} p="xs">
          {items.map((item, i) => (
            <Group key={i} gap="xs" wrap="nowrap">
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: item.isGood ? "var(--mantine-color-green-6)" : "var(--mantine-color-red-6)", flexShrink: 0 }} />
              <Text size="xs" fw={500}>{item.label}</Text>
              <Text size="xs" c="dimmed" ml="auto">{item.value}</Text>
            </Group>
          ))}
        </Stack>
      );
    },
    countGrid: (d) => {
      const items = (d.items as Array<{ label: string; unit: string; value: unknown }>) ?? [];
      const columns = Math.min((d.columns as number) ?? 2, 3);
      return (
        <SimpleGrid cols={columns} spacing={4} p="xs">
          {items.map((item, i) => (
            <Stack key={i} align="center" gap={0}>
              <Text size="sm" fw={700}>{String(item.value ?? "—")}{item.unit ? ` ${item.unit}` : ""}</Text>
              <Text size="xs" c="dimmed" tt="uppercase" style={{ fontSize: 9 }}>{item.label}</Text>
            </Stack>
          ))}
        </SimpleGrid>
      );
    },
    raw: (d) => (
      <ScrollArea h={100}>
        <Code block style={{ fontSize: 11 }}>{JSON.stringify(d.data, null, 2)}</Code>
      </ScrollArea>
    ),
    actionButton: (d) => (
      <Center p="sm">
        <Button size="sm" color={(d.buttonColor as string) ?? "blue"} disabled>
          {(d.buttonLabel as string) ?? "Execute"}
        </Button>
      </Center>
    ),
  };

  const renderer = renderers[(typed.type as string) ?? ""];
  if (renderer) return <>{renderer(typed)}</>;

  return (
    <ScrollArea h={100}>
      <Code block style={{ fontSize: 11 }}>{JSON.stringify(data, null, 2)}</Code>
    </ScrollArea>
  );
}
