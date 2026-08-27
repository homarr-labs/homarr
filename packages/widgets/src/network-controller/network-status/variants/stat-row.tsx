import { Group, Stack, Text } from "@mantine/core";

export const StatRow = ({
  label,
  value,
  advanced = false,
  compact = false,
  inline = false,
}: {
  label: string;
  value: string | number;
  advanced?: boolean;
  compact?: boolean;
  inline?: boolean;
}) => {
  if (!advanced && compact && inline) {
    return (
      <Group gap={2} align="baseline" justify="center" wrap="nowrap" miw={0}>
        <Text size="xl" fw={800} lh={1} style={{ flexShrink: 0 }}>
          {value}
        </Text>
        <Text size="sm" c="dimmed" truncate>
          {label}
        </Text>
      </Group>
    );
  }

  if (!advanced) {
    return (
      <Stack gap={0}>
        <Text size={compact ? "xl" : "2xl"} fw={compact ? 800 : 900} lh={1}>
          {value}
        </Text>
        <Text size={compact ? "sm" : "md"} c="dimmed">
          {label}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={2} align="center" justify="center">
      <Text size={compact ? "xl" : "2xl"} fw={800} lh={1} ta="center">
        {value}
      </Text>
      <Text size={compact ? "sm" : "md"} c="dimmed" ta="center">
        {label}
      </Text>
    </Stack>
  );
};
