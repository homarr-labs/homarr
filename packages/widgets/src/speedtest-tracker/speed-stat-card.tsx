"use client";

import { Card, Flex, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";

import { useRequiredBoard } from "@homarr/boards/context";
import type { TablerIcon } from "@homarr/ui";

export interface SpeedStatCardProps {
  icon: TablerIcon;
  color: string;
  value: string;
  label: string;
  compact?: boolean;
}

export function SpeedStatCard({ icon: Icon, color, value, label, compact = false }: SpeedStatCardProps) {
  const { ref, height, width } = useElementSize<HTMLDivElement>();
  const board = useRequiredBoard();
  const isWide = width > height + 20;
  const hideLabel = height > 0 && height <= 38;

  return (
    <Card
      ref={ref}
      p={compact ? "xs" : "sm"}
      radius={board.itemRadius}
      bg={`var(--mantine-color-${color}-light)`}
      h="100%"
      style={{ flex: 1 }}
    >
      <Flex
        h="100%"
        w="100%"
        align="center"
        justify="center"
        direction={isWide ? "row" : "column"}
        gap={isWide ? 8 : 4}
      >
        <Icon size={compact ? 16 : 20} color={`var(--mantine-color-${color}-5)`} style={{ flexShrink: 0 }} />
        <Flex direction="column" align={isWide ? "flex-start" : "center"} gap={0}>
          <Text size={compact ? "sm" : "md"} fw={700} ta="center" lh={1.1}>
            {value}
          </Text>
          {!hideLabel && (
            <Text size="xs" c="dimmed" ta="center" lh={1.3}>
              {label}
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}
