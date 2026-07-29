"use client";

import type { CSSProperties, RefObject } from "react";
import { useMemo, useRef } from "react";
import { Box } from "@mantine/core";

import { getDesktopLayout, useRequiredBoard } from "@homarr/boards/context";
import { ReadOnlyEditModeProvider } from "@homarr/boards/edit-mode";
import type { GridItemHTMLElement, GridStack as GridStackInstance } from "@homarr/gridstack";

import { BoardItemContent } from "../items/item-content";
import { SectionProvider } from "../sections/section-context";
import classes from "./mobile-board.module.css";
import { createMobileBoardItems, getMobileRootSection, mobileColumnCount } from "./mobile-layout";

export const MobileBoard = () => {
  const board = useRequiredBoard();
  const desktopLayout = getDesktopLayout(board);
  const items = useMemo(() => createMobileBoardItems(board, desktopLayout.id), [board, desktopLayout.id]);
  const rootSection = getMobileRootSection(board);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, RefObject<GridItemHTMLElement | null>>>({});
  const gridstackRef = useRef<GridStackInstance | null>(null);

  return (
    <ReadOnlyEditModeProvider>
      <SectionProvider
        value={{
          section: rootSection,
          items,
          innerSections: [],
          refs: { wrapper: wrapperRef, items: itemRefs, gridstack: gridstackRef },
        }}
      >
        <Box
          className={classes.grid}
          style={{ "--mobile-column-count": mobileColumnCount } as CSSProperties}
          data-mobile-board
        >
          {items.map((item) => (
            <Box
              key={item.id}
              className={classes.item}
              style={{ gridColumn: `span ${item.width}`, gridRow: `span ${item.height}` }}
              data-mobile-board-item={item.id}
            >
              <BoardItemContent item={item} />
            </Box>
          ))}
        </Box>
      </SectionProvider>
    </ReadOnlyEditModeProvider>
  );
};
