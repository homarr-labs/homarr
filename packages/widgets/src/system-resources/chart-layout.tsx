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
  // Keep explicit pixels in sync with board coordinates; numeric Mantine
  // size props would apply the board's scale a second time.
  const minimumContentWidth =
    horizontal && count > 1 ? `calc(${count * minimumColumnWidth}px + ${count - 1} * ${spacing})` : "100%";

  return (
    <ScrollArea
      h="100%"
      miw={0}
      type="auto"
      scrollbars="xy"
      offsetScrollbars={horizontal ? "x" : "y"}
      scrollbarSize={6}
      styles={{
        // Nested charts must scroll within their allocated group, not size its parent tracks.
        root: { contain: "size" },
        content: { minHeight: "100%", minWidth: minimumContentWidth, display: "grid" },
      }}
    >
      <SimpleGrid
        miw={0}
        cols={horizontal ? count : (columns ?? 1)}
        minColWidth={layout === "grid" && columns === undefined ? `min(${minimumColumnWidth}px, 100%)` : undefined}
        autoFlow="auto-fit"
        autoRows="minmax(20px, 1fr)"
        spacing={gap}
      >
        {children}
      </SimpleGrid>
    </ScrollArea>
  );
};
