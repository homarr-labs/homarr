import { Group, Paper } from "@mantine/core";

import type { ManageStickyFooterProps } from "./contracts";

export const ManageStickyFooter = ({ secondary, children }: ManageStickyFooterProps) => (
  <Paper
    withBorder
    shadow="md"
    radius="md"
    p="sm"
    pos="sticky"
    bottom="var(--mantine-spacing-md)"
    bg="var(--mantine-color-body)"
    style={{ zIndex: 2 }}
  >
    <Group justify="space-between" align="center" gap="sm" wrap="wrap">
      <Group gap="xs" wrap="wrap">
        {secondary}
      </Group>
      <Group gap="sm" wrap="nowrap" ml="auto">
        {children}
      </Group>
    </Group>
  </Paper>
);
