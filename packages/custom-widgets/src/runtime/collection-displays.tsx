import { ActionIcon, Code, Group, ScrollArea, SimpleGrid, Stack, Table, Text, Tooltip } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import type { CustomWidgetDisplayData } from "./display-types";

export function KeyValueDisplay({ data }: { data: CustomWidgetDisplayData }) {
  const entries = (data.entries as Array<{ label: string; unit: string; value: unknown }> | undefined) ?? [];
  const content = entries.map((entry, index) => (
    <Group key={index} justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {entry.label}
      </Text>
      <Text size="sm" fw={600}>
        {String(entry.value ?? "—")}
        {entry.unit ? ` ${entry.unit}` : ""}
      </Text>
    </Group>
  ));
  return data.layout === "grid" ? (
    <SimpleGrid cols={Number(data.columns ?? 2)} spacing="xs" p="sm" h="100%">
      {content}
    </SimpleGrid>
  ) : (
    <Stack h="100%" justify="center" gap="xs" p="sm">
      {content}
    </Stack>
  );
}

export function TableDisplay({ data }: { data: CustomWidgetDisplayData }) {
  const columns = (data.columns as string[] | undefined) ?? [];
  const rows = (data.rows as unknown[][] | undefined) ?? [];
  return (
    <ScrollArea>
      <Table striped={data.striped !== false} highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            {columns.map((column, index) => (
              <Table.Th key={index} py={data.compact ? 4 : undefined}>
                {column}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, rowIndex) => (
            <Table.Tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <Table.Td key={cellIndex} py={data.compact ? 2 : undefined}>
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

export function StatusIndicatorDisplay({ data }: { data: CustomWidgetDisplayData }) {
  const items = (data.items as Array<{ label: string; value: string; isGood: boolean }> | undefined) ?? [];
  const size = ({ sm: 8, md: 10, lg: 14 } as Record<string, number>)[String(data.dotSize ?? "md")] ?? 10;
  const content = items.map((item, index) => (
    <Group key={index} gap="xs" wrap="nowrap">
      <div
        aria-hidden
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
  ));
  return data.layout === "grid" ? (
    <SimpleGrid cols={2} spacing="xs" p="sm" h="100%">
      {content}
    </SimpleGrid>
  ) : (
    <Stack h="100%" justify="center" gap="xs" p="sm">
      {content}
    </Stack>
  );
}

function openJsonInBrowser(value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  window.open(url);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function createRawDisplay(openJsonLabel: string) {
  return function RawDisplay({ data }: { data: CustomWidgetDisplayData }) {
    return (
      <Stack gap={4} p="xs">
        <Group justify="flex-end">
          <Tooltip label={openJsonLabel}>
            <ActionIcon
              aria-label={openJsonLabel}
              variant="subtle"
              size="sm"
              onClick={() => openJsonInBrowser(data.data)}
            >
              <IconExternalLink size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <ScrollArea mah={Number(data.maxHeight ?? 300)}>
          <Code block style={{ fontSize: 12 }}>
            {JSON.stringify(data.data, null, 2)}
          </Code>
        </ScrollArea>
      </Stack>
    );
  };
}
