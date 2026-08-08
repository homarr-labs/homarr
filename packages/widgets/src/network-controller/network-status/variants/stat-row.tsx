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
    <Stack gap={0}>
      <Text size={compact ? "xl" : "2xl"} fw={800} lh={1}>
        {value}
      </Text>
      <Text size={compact ? "sm" : "md"} c="dimmed">
        {label}
      </Text>
    </Stack>
  );
};
