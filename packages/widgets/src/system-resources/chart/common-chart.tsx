/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useState } from "react";
import { Box, Card, Center, Group, Stack, Text, Tooltip, useComputedColorScheme, useMantineTheme } from "@mantine/core";
import { useElementSize, useHover, useMergedRef } from "@mantine/hooks";

import { useRequiredBoard } from "@homarr/boards/context";
import { zoomCompensatedSize } from "@homarr/ui";
import type { TablerIcon } from "@homarr/ui";

import type { LabelDisplayModeOption } from "..";
import { Sparkline } from "../../common/sparkline";

export const CommonChart = ({
  data,
  series,
  title,
  icon: Icon,
  labelDisplayMode,
  tooltipLabel,
  yDomain,
  lastValue,
  chartType = "line",
  advanced = false,
  plain = false,
  positions,
}: {
  data: Record<string, any>[];
  /** Where each row sits across the chart, 0 to 1 (by its time). Without them the rows are evenly spaced. */
  positions?: readonly number[];
  series: { name: string; color: string }[];
  title: ReactNode;
  icon: TablerIcon;
  labelDisplayMode: LabelDisplayModeOption;
  // What to show on hover. Defaults to lastValue when omitted. Pass a function to reflect
  // the datum under the cursor as it moves across multi-point data (e.g. memory's
  // used/available at that point), instead of always showing the latest value.
  tooltipLabel?: ReactNode | ((index: number) => ReactNode);
  yDomain?: readonly [number, number];
  lastValue?: string;
  chartType?: "line" | "area";
  advanced?: boolean;
  /** Draw directly on the widget without the inner card background, for a chart that fills its widget. */
  plain?: boolean;
}) => {
  const { ref: elementSizeRef, height } = useElementSize();
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light");
  const board = useRequiredBoard();
  const { hovered, ref: hoverRef } = useHover();
  const ref = useMergedRef(elementSizeRef, hoverRef);

  const opacity = board.opacity / 100;
  let backgroundColor = colorScheme === "dark" ? `rgba(57, 57, 57, ${opacity})` : `rgba(246, 247, 248, ${opacity})`;
  if (plain) backgroundColor = "transparent";
  const cardStyle: CSSProperties = { overflow: "hidden" };
  // Matches the previous Recharts layout: 5px root padding plus Recharts' default 5px plot margin.
  const chartRootStyle: CSSProperties = {
    // A plain chart runs edge to edge; the widget card's rounded corners clip it.
    padding: plain ? 0 : 10,
    // A plain chart follows the widget card's own rounded clip instead of rounding a second time.
    borderRadius: plain ? 0 : theme.radius[board.itemRadius ?? "default"],
  };
  if (advanced) {
    backgroundColor = "rgb(from var(--mantine-color-primaryColor-filled) r g b / calc(var(--opacity, 1) * 0.12))";
    cardStyle.border =
      "1px solid rgb(from var(--mantine-color-secondaryColor-filled) r g b / calc(var(--opacity, 1) * 0.45))";
    chartRootStyle.backgroundColor = backgroundColor;
  }

  const showIcon = labelDisplayMode === "icon" || labelDisplayMode === "textWithIcon";
  const showText = labelDisplayMode === "text" || labelDisplayMode === "textWithIcon";

  // Track which data point the cursor is over so the tooltip can reflect that point
  // instead of always showing the latest value while scrubbing across the chart.
  const [hoveredIndex, setHoveredIndex] = useState(data.length - 1);
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (data.length <= 1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = positions
      ? positions.reduce(
          (best, position, candidate) =>
            Math.abs(position - ratio) < Math.abs((positions[best] ?? 0) - ratio) ? candidate : best,
          0,
        )
      : Math.round(ratio * (data.length - 1));
    setHoveredIndex(Math.min(data.length - 1, Math.max(0, index)));
  };

  // Clamp on read rather than syncing via an effect - handles data growing/shrinking
  // between renders (e.g. history resetting on integration change) without ever
  // handing a stale or out-of-range index to tooltipLabel.
  const clampedHoveredIndex = Math.max(0, Math.min(hoveredIndex, data.length - 1));
  const resolvedTooltipLabel =
    typeof tooltipLabel === "function" ? tooltipLabel(clampedHoveredIndex) : (tooltipLabel ?? lastValue);

  return (
    <Tooltip.Floating label={resolvedTooltipLabel} disabled={data.length <= 1 || !resolvedTooltipLabel}>
      <Card
        ref={ref}
        h={"100%"}
        pos={"relative"}
        style={cardStyle}
        p={0}
        bg={backgroundColor}
        radius={plain ? 0 : (board.itemRadius ?? undefined)}
        // The widget card already draws the border; a second one would show a card inside the card.
        withBorder={!plain}
        onPointerMove={handlePointerMove}
      >
        {data.length > 1 && height > 40 && !hovered && (
          <Group
            pos={"absolute"}
            top={0}
            left={0}
            p={8}
            pt={6}
            gap={5}
            wrap={"nowrap"}
            style={{ zIndex: 2, pointerEvents: "none" }}
            align="center"
          >
            {showIcon && (
              <Icon
                color="var(--mantine-color-dimmed)"
                style={zoomCompensatedSize(height > 100 ? 20 : 14)}
                stroke={1.5}
              />
            )}
            {showText && (
              <Text c={"dimmed"} size={height > 100 ? "md" : "xs"} fw={"bold"}>
                {title}
              </Text>
            )}
            {lastValue && (
              <Text c={"dimmed"} size={height > 100 ? "md" : "xs"} lineClamp={1}>
                {lastValue}
              </Text>
            )}
          </Group>
        )}
        {advanced && data.length > 1 && height > 0 && height <= 40 && lastValue && !hovered && (
          <Center pos="absolute" w="100%" h="100%" style={{ zIndex: 2, pointerEvents: "none" }}>
            <Text size="xs" fw={600}>
              {lastValue}
            </Text>
          </Center>
        )}
        {data.length <= 1 ? (
          <Center pos="absolute" w="100%" h="100%">
            <Stack px={"xs"} align={"center"} gap={4}>
              {showIcon && (
                <Icon
                  color="var(--mantine-color-dimmed)"
                  style={zoomCompensatedSize(height > 100 ? 20 : 14)}
                  stroke={1.5}
                />
              )}
              {showText && (
                <Text c={"dimmed"} size={height > 100 ? "md" : "xs"} fw={"bold"} ta="center">
                  {title}
                </Text>
              )}
              {advanced && lastValue && (
                <Text size={height > 100 ? "md" : "xs"} fw={600} ta="center">
                  {lastValue}
                </Text>
              )}
            </Stack>
          </Center>
        ) : (
          // Absolutely positioned so the SVG's intrinsic aspect ratio never sizes the surrounding grid cell.
          <Box pos="absolute" top={0} left={0} right={0} bottom={0} bg={backgroundColor} style={chartRootStyle}>
            <Sparkline
              series={series.map(({ name, color }) => ({
                color,
                values: data.map((row) => row[name] as number | null | undefined),
                positions,
              }))}
              yDomain={yDomain}
              variant={chartType}
            />
          </Box>
        )}
      </Card>
    </Tooltip.Floating>
  );
};
