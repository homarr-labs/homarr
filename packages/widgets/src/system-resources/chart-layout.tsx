import type { ReactNode } from "react";
import { Children } from "react";
import { ScrollArea, SimpleGrid } from "@mantine/core";

type ChartLayoutMode = "vertical" | "horizontal" | "grid";

export const ChartLayout = ({
  children,
  layout,
  minimumColumnWidth,
  columns,
  gap,
}: {
  children: ReactNode;
  layout: ChartLayoutMode;
  minimumColumnWidth: number;
  columns?: number;
  gap: number | "xs";
}) => {
  const count = Math.max(1, Children.toArray(children).length);
  const horizontal = layout === "horizontal";
  const spacing = gap === "xs" ? "var(--mantine-spacing-xs)" : `${gap}px`;

  return (
    <ScrollArea
      h="100%"
      miw={0}
      type="auto"
      scrollbars="x"
      offsetScrollbars="present"
      scrollbarSize={6}
      styles={{ content: { height: "100%", display: "block" } }}
    >
      <SimpleGrid
        h="100%"
        cols={horizontal ? count : (columns ?? 1)}
        minColWidth={layout === "grid" && columns === undefined ? `min(${minimumColumnWidth}px, 100%)` : undefined}
        autoFlow="auto-fit"
        autoRows="minmax(0, 1fr)"
        spacing={gap}
        style={{
          // Keep explicit pixels in sync with board coordinates; numeric Mantine
          // size props would apply the board's scale a second time.
          minWidth: horizontal && count > 1 ? `calc(${count * minimumColumnWidth}px + ${count - 1} * ${spacing})` : 0,
        }}
      >
        {children}
      </SimpleGrid>
    </ScrollArea>
  );
};
