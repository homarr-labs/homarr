import type { ReactNode } from "react";
import { Group, Paper } from "@mantine/core";

export interface ManageStickyFooterProps {
  /** Secondary controls, pinned to the start of the bar. */
  secondary?: ReactNode;
  /** The primary action(s) of the page, pinned to the end of the bar. */
  children: ReactNode;
}

/**
 * A bar that stays visible at the bottom of the viewport while the page scrolls,
 * so the primary action of a long page is always one click away.
 */
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
