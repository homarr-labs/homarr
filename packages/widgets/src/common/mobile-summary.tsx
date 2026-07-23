import { Center, Group, Stack, Text } from "@mantine/core";

interface WidgetMobileSummaryProps {
  value: number | string;
  label: string;
  description?: string;
}

export function WidgetMobileSummary({ value, label, description }: WidgetMobileSummaryProps) {
  return (
    <Center h="100%" p="sm">
      <Stack align="center" gap={2} w="100%" style={{ minWidth: 0 }}>
        <Group gap="xs" justify="center" wrap="nowrap" w="100%">
          <Text fz="xl" fw={700} lh={1}>
            {value}
          </Text>
          <Text size="sm" fw={600} lineClamp={1}>
            {label}
          </Text>
        </Group>
        {description !== undefined && (
          <Text c="dimmed" size="xs" lineClamp={1} ta="center" w="100%">
            {description}
          </Text>
        )}
      </Stack>
    </Center>
  );
}
