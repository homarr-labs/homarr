import { Stack, Text } from "@mantine/core";

export const StatRow = ({
  label,
  value,
  advanced = false,
  compact = false,
}: {
  label: string;
  value: string | number;
  advanced?: boolean;
  compact?: boolean;
}) => {
  if (!advanced) {
    return (
      <Stack gap={0}>
        <Text size="2xl" fw={900} lh={1}>
          {value}
        </Text>
        <Text size="md" c="dimmed">
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
