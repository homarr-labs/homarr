"use client";

import { Badge, Group, Paper, Stack, Text } from "@mantine/core";

/** A compact native presentation for an idle item; its normal widget observer remains mounted. */
export function NativePrototypeCompactWidget({ label }: { label: string }) {
  return (
    <Paper withBorder h="100%" p="md" data-prototype-compact={label}>
      <Group justify="space-between" h="100%" wrap="nowrap">
        <Stack gap={4}>
          <Text fw={600} style={{ fontSize: "calc(14px * var(--board-canvas-ui-scale, 1))" }}>
            {label}
          </Text>
          <Text c="dimmed" style={{ fontSize: "calc(12px * var(--board-canvas-ui-scale, 1))" }}>
            Nothing active · space available to other widgets
          </Text>
        </Stack>
        <Badge
          variant="light"
          color="gray"
          styles={{ label: { fontSize: "calc(10px * var(--board-canvas-ui-scale, 1))" } }}
        >
          Quiet
        </Badge>
      </Group>
    </Paper>
  );
}
