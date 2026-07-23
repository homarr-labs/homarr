"use client";

import type { CSSProperties, RefObject } from "react";
import { useMemo, useRef } from "react";
import { Box, Center, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconLayoutBoard } from "@tabler/icons-react";

import { getDesktopLayout, useRequiredBoard } from "@homarr/boards/context";
import { ReadOnlyEditModeProvider } from "@homarr/boards/edit-mode";
import type { GridItemHTMLElement, GridStack as GridStackInstance } from "@homarr/gridstack";
import { useI18n } from "@homarr/translation/client";
import { widgetImports } from "@homarr/widgets";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import { BoardItemContent } from "../items/item-content";
import { SectionProvider } from "../sections/section-context";
import { DeferredMobileItem } from "./deferred-mobile-item";
import classes from "./mobile-board.module.css";
import { MobileWidgetActions } from "./mobile-widget-actions";
import {
  createMobileBoardElements,
  createMobileBoardItems,
  getMobileRootSection,
  mobileColumnCount,
} from "./mobile-layout";
import type { MobileBoardElement, MobileBoardSectionHeading } from "./mobile-layout";
import { resolveMobileItemPresentation } from "./mobile-presentation";

type MobileBoardRenderBlock =
  | MobileBoardSectionHeading
  | {
      type: "items";
      id: string;
      items: SectionItem[];
    };

const createRenderBlocks = (elements: MobileBoardElement[]): MobileBoardRenderBlock[] => {
  const blocks: MobileBoardRenderBlock[] = [];

  for (const element of elements) {
    if (element.type === "sectionHeading") {
      blocks.push(element);
      continue;
    }

    const previousBlock = blocks.at(-1);
    if (previousBlock?.type === "items") {
      previousBlock.items.push(element);
    } else {
      blocks.push({ type: "items", id: `items-${element.id}`, items: [element] });
    }
  }

  return blocks;
};

const getMobilePresentation = (item: SectionItem) => {
  const definition = widgetImports[item.kind].definition;
  return resolveMobileItemPresentation(item, "mobile" in definition ? definition.mobile : undefined);
};

const MobileBoardItem = ({ item }: { item: SectionItem }) => {
  const widgetStateRef = useRef<Record<string, unknown> | null>(null);
  const presentation = getMobilePresentation(item);

  return (
    <Box
      className={classes.item}
      style={{ gridColumn: `span ${presentation.width}`, gridRow: `span ${presentation.height}` }}
      data-mobile-board-item={item.id}
      data-mobile-display-mode={presentation.displayMode}
    >
      <DeferredMobileItem eager={presentation.eager}>
        <BoardItemContent
          item={item}
          displayMode={presentation.displayMode}
          disableContextMenu
          widgetStateRef={widgetStateRef}
        />
        <MobileWidgetActions
          item={item}
          supportsDetails={presentation.supportsDetails}
          widgetStateRef={widgetStateRef}
        />
      </DeferredMobileItem>
    </Box>
  );
};

export const MobileBoard = () => {
  const board = useRequiredBoard();
  const t = useI18n();
  const desktopLayout = getDesktopLayout(board);
  const items = useMemo(() => createMobileBoardItems(board, desktopLayout.id), [board, desktopLayout.id]);
  const elements = useMemo(() => createMobileBoardElements(board, desktopLayout.id), [board, desktopLayout.id]);
  const renderBlocks = useMemo(() => createRenderBlocks(elements), [elements]);
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
        <Box className={classes.stream} data-mobile-board>
          {elements.length === 0 ? (
            <Center className={classes.empty}>
              <Stack align="center" gap="xs" ta="center" maw={360}>
                <ThemeIcon size={48} radius="xl" variant="light">
                  <IconLayoutBoard size={24} />
                </ThemeIcon>
                <Title order={2} size="h3">
                  {t("board.mobile.empty.title")}
                </Title>
                <Text c="dimmed" size="sm">
                  {t("board.mobile.empty.description")}
                </Text>
              </Stack>
            </Center>
          ) : (
            renderBlocks.map((block) =>
              block.type === "sectionHeading" ? (
                <Title
                  key={block.id}
                  id={block.anchorId}
                  order={2}
                  size="h4"
                  className={classes.sectionHeading}
                  tabIndex={-1}
                >
                  {block.title}
                </Title>
              ) : (
                <Box
                  key={block.id}
                  className={classes.grid}
                  style={{ "--mobile-column-count": mobileColumnCount } as CSSProperties}
                >
                  {block.items.map((item) => (
                    <MobileBoardItem key={item.id} item={item} />
                  ))}
                </Box>
              ),
            )
          )}
        </Box>
      </SectionProvider>
    </ReadOnlyEditModeProvider>
  );
};
