import { Stack, Text } from "@mantine/core";

export const StatRow = ({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) => {
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
