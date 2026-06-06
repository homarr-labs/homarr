"use client";

import { useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Collapse,
  Group,
  Loader,
  ScrollArea,
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
            <Text size="xs" fw={500}>
              {result.error}
            </Text>
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
                <Code block style={{ fontSize: 11 }}>
                  {result.rawResponse}
                </Code>
              </ScrollArea>
            </Collapse>
          </Stack>
        )}

        {!result && !previewMutation.error && !previewMutation.isPending && (
          <Text size="xs" c="dimmed" ta="center">
            {t("preview.hint")}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

function PreviewDisplay({ data }: { data: unknown }) {
  const typed = data as { type?: string; label?: string; unit?: string; value?: unknown; entries?: Array<{ label: string; unit: string; value: unknown }>; columns?: string[]; rows?: unknown[][] };

  if (!typed || typeof typed !== "object") {
    return <Text size="xs" c="dimmed">No data</Text>;
  }

  if (typed.type === "singleValue") {
    return (
      <Stack align="center" gap={2} p="xs">
        <Text size="lg" fw={700}>
          {String(typed.value ?? "—")}
          {typed.unit ? ` ${typed.unit}` : ""}
        </Text>
        {typed.label && <Text size="xs" c="dimmed">{typed.label}</Text>}
      </Stack>
    );
  }

  if (typed.type === "keyValue" && typed.entries) {
    return (
      <Stack gap={2} p="xs">
        {typed.entries.map((entry, i) => (
          <Group key={i} justify="space-between" wrap="nowrap">
            <Text size="xs" c="dimmed">{entry.label}</Text>
            <Text size="xs" fw={600}>
              {String(entry.value ?? "—")}
              {entry.unit ? ` ${entry.unit}` : ""}
            </Text>
          </Group>
        ))}
      </Stack>
    );
  }

  if (typed.type === "table" && typed.columns && typed.rows) {
    return (
      <ScrollArea>
        <table style={{ width: "100%", fontSize: 11 }}>
          <thead>
            <tr>
              {typed.columns.map((col, i) => (
                <th key={i} style={{ textAlign: "left", padding: "2px 6px" }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {typed.rows.slice(0, 10).map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: "2px 6px" }}>{String(cell ?? "—")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea h={100}>
      <Code block style={{ fontSize: 11 }}>
        {JSON.stringify(data, null, 2)}
      </Code>
    </ScrollArea>
  );
}
