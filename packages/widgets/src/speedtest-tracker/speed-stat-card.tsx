"use client";

import { Card, Flex, Text, Tooltip, VisuallyHidden } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";

import { useRequiredBoard } from "@homarr/boards/context";
import type { TablerIcon } from "@homarr/ui";

export interface SpeedStatCardProps {
  icon: TablerIcon;
  color: "blue" | "teal" | "orange" | "green" | "red";
  value: string;
  label: string;
  compact?: boolean;
}

export function SpeedStatCard({ icon: Icon, color, value, label, compact = false }: SpeedStatCardProps) {
  const { ref, height, width } = useElementSize<HTMLDivElement>();
  const board = useRequiredBoard();
  const isWide = width > height + 20;
  const hideLabel = height > 0 && height <= 38;
  const surfaceColor = `var(--mantine-color-${color}-filled)`;
  const accentColor = `var(--mantine-color-${color}-5)`;
  const surfaceAlpha = compact ? 0.1 : 0.14;
  const surfaceBackground = `rgb(from ${surfaceColor} r g b / calc(var(--opacity, 1) * ${surfaceAlpha}))`;
  const surfaceBorder = "rgb(from var(--mantine-color-default-border) r g b / calc(var(--opacity, 1) * 0.45))";

  return (
    <Tooltip label={`${label}: ${value}`} withArrow>
      <Card
        ref={ref}
        p={compact ? "xs" : "sm"}
        radius={board.itemRadius}
        withBorder
        bg={surfaceBackground}
        h="100%"
        style={{ flex: 1, minWidth: 0, borderColor: surfaceBorder }}
      >
        <Flex
          h="100%"
          w="100%"
          align="center"
          justify="center"
          direction={isWide ? "row" : "column"}
          gap={isWide ? 8 : 4}
          style={{ minWidth: 0 }}
        >
          <Icon size={compact ? 16 : 20} color={accentColor} style={{ flexShrink: 0 }} />
          <Flex direction="column" align={isWide ? "flex-start" : "center"} gap={0} style={{ minWidth: 0 }}>
            <Text size={compact ? "sm" : "md"} fw={700} ta="center" lh={1.1} truncate w="100%">
              {value}
            </Text>
            {!hideLabel && (
              <Text size="xs" c="dimmed" ta="center" lh={1.3} truncate w="100%">
                {label}
              </Text>
            )}
            {hideLabel && <VisuallyHidden>{label}</VisuallyHidden>}
          </Flex>
        </Flex>
      </Card>
    </Tooltip>
  );
}
