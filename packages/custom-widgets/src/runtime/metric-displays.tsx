import { Card, Flex, Group, Progress, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";

import type { CustomWidgetDisplayData } from "./display-types";

export function SingleValueDisplay({ data }: { data: CustomWidgetDisplayData }) {
  const size = String(data.valueSize ?? "lg");
  const labelAbove = data.labelPosition === "above";
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
        {data.unit ? ` ${String(data.unit)}` : ""}
      </Title>
      {!labelAbove && label}
    </Stack>
  );
}

interface MetricItem {
  label: string;
  unit: string;
  color: string;
  value: unknown;
}

function StatGridCard({ item, cardStyle }: { item: MetricItem; cardStyle: string }) {
  const { ref, height, width } = useElementSize();
  const isWide = width > height + 20;
  const background = cardStyle === "outline" ? "transparent" : `var(--mantine-color-${item.color}-light)`;
  return (
    <Card ref={ref} p="sm" radius="md" bg={background} withBorder={cardStyle === "outline"} h="100%">
      <Flex h="100%" align="center" justify="center" direction={isWide ? "row" : "column"} gap={isWide ? 8 : 4}>
        <Flex direction="column" align={isWide ? "flex-start" : "center"} gap={0}>
          <Text size="md" fw={700} ta="center" lh={1.1}>
            {String(item.value ?? "—")}
            {item.unit ? ` ${item.unit}` : ""}
          </Text>
          {height > 38 && (
            <Text size="xs" c="dimmed" ta="center" tt="uppercase" lh={1.3}>
              {item.label}
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}

export function StatGridDisplay({ data }: { data: CustomWidgetDisplayData }) {
  const items = (data.items as MetricItem[] | undefined) ?? [];
  const columns = Number(data.columns ?? 2);
  return (
    <SimpleGrid
      cols={columns}
      spacing="xs"
      p="xs"
      h="100%"
      style={{ gridTemplateRows: `repeat(${Math.ceil(items.length / columns)}, 1fr)` }}
    >
      {items.map((item, index) => (
        <StatGridCard key={index} item={item} cardStyle={String(data.cardStyle ?? "filled")} />
      ))}
    </SimpleGrid>
  );
}

export function ProgressBarsDisplay({ data }: { data: CustomWidgetDisplayData }) {
  const bars = (data.bars as Array<MetricItem & { value: number; max?: number }> | undefined) ?? [];
  const sizes: Record<string, number> = { sm: 8, md: 14, lg: 22 };
  return (
    <Stack h="100%" justify="center" gap="sm" p="sm">
      {bars.map((bar, index) => {
        const max = bar.max ?? 100;
        const percentage = max > 0 ? Math.min((bar.value / max) * 100, 100) : 0;
        const value =
          data.showPercentage !== false ? `${percentage.toFixed(0)}%` : `${bar.value}${bar.unit ? ` ${bar.unit}` : ""}`;
        return (
          <Stack key={index} gap={4}>
            <Group justify="space-between" wrap="nowrap">
              <Text size="xs" fw={500}>
                {bar.label}
              </Text>
              <Text size="xs" c="dimmed">
                {value}
              </Text>
            </Group>
            <Progress
              value={percentage}
              size={sizes[String(data.barSize ?? "md")] ?? 14}
              color={bar.color}
              radius="sm"
            />
          </Stack>
        );
      })}
    </Stack>
  );
}

export function CountGridDisplay({ data }: { data: CustomWidgetDisplayData }) {
  const items = (data.items as MetricItem[] | undefined) ?? [];
  return (
    <SimpleGrid cols={Number(data.columns ?? 2)} spacing="xs" p="sm" h="100%">
      {items.map((item, index) => (
        <Stack key={index} align="center" justify="center" gap={0}>
          <Text size={String(data.valueSize ?? "md")} fw={700}>
            {String(item.value ?? "—")}
            {item.unit ? ` ${item.unit}` : ""}
          </Text>
          <Text size="xs" c="dimmed" tt="uppercase" ta="center">
            {item.label}
          </Text>
        </Stack>
      ))}
    </SimpleGrid>
  );
}
