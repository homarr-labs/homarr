"use client";

import { Badge, Card, Collapse, Group, Stack, Title, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import { useRequiredBoard } from "@homarr/boards/context";

import type {
  Board,
  CategorySection,
  DynamicSectionItem,
  EmptySection,
  SectionItem,
} from "~/app/[locale]/boards/_types";
import { BoardItemContent } from "../items/item-content";
import { CategoryMenu } from "./category/category-menu";
import classes from "./item.module.css";
import {
  getEstimatedGridWidth,
  getFallbackDimensions,
  getFullWidthSortedSections,
  getStaticGridElements,
  getStaticGridLayouts,
  getStaticGridRowCount,
  getStaticLayoutSelectionCss,
} from "./static-grid-layout";
import { useCategoryCollapse } from "./use-category-collapse";

interface StaticBoardGridProps {
  board: Board;
}

export const StaticBoardGrid = ({ board }: StaticBoardGridProps) => {
  const boardId = `board-${board.id}`;
  const layouts = getStaticGridLayouts(board.layouts);
  const layoutSelectionCss = getStaticLayoutSelectionCss(boardId, layouts);
  const fullWidthSortedSections = getFullWidthSortedSections(board);

  if (layouts.length === 0) return null;

  return (
    <>
      <style>{layoutSelectionCss}</style>
      <div data-static-board={boardId}>
        {layouts.map((layout, index) => (
          <div key={layout.id} className="static-board-layout" data-static-layout={layout.id}>
            <Stack h="100%">
              {fullWidthSortedSections.map((section) =>
                section.kind === "empty" ? (
                  <StaticEmptySection
                    key={section.id}
                    section={section}
                    board={board}
                    layoutId={layout.id}
                    columnCount={layout.columnCount}
                    estimatedGridWidth={getEstimatedGridWidth(layout, layouts.at(index + 1))}
                  />
                ) : (
                  <StaticCategorySection
                    key={section.id}
                    section={section}
                    board={board}
                    layoutId={layout.id}
                    columnCount={layout.columnCount}
                    estimatedGridWidth={getEstimatedGridWidth(layout, layouts.at(index + 1))}
                  />
                ),
              )}
            </Stack>
          </div>
        ))}
      </div>
    </>
  );
};

interface StaticSectionGridProps {
  sectionId: string;
  board: Board;
  layoutId: string;
  columnCount: number;
  estimatedGridWidth: number;
  isDynamic?: boolean;
  fixedRowCount?: number;
}

const StaticSectionGrid = ({
  sectionId,
  board,
  layoutId,
  columnCount,
  estimatedGridWidth,
  isDynamic,
  fixedRowCount,
}: StaticSectionGridProps) => {
  const allItems = getStaticGridElements(board, sectionId, layoutId);

  if (allItems.length === 0) return null;

  const rowCount = getStaticGridRowCount(allItems, fixedRowCount);

  return (
    <div className="static-grid-container" style={{ height: isDynamic ? "100%" : undefined }}>
      <div
        className="static-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          gridTemplateRows: isDynamic
            ? `repeat(${rowCount}, 1fr)`
            : `repeat(${rowCount}, calc(100cqi / ${columnCount}))`,
          height: isDynamic ? "100%" : undefined,
        }}
      >
        {allItems.map((item) => (
          <StaticGridItem
            key={item.id}
            item={item}
            board={board}
            layoutId={layoutId}
            estimatedGridWidth={estimatedGridWidth}
            columnCount={columnCount}
          />
        ))}
      </div>
    </div>
  );
};

interface StaticGridItemProps {
  item: SectionItem | DynamicSectionItem;
  board: Board;
  layoutId: string;
  estimatedGridWidth: number;
  columnCount: number;
}

const StaticGridItem = ({ item, board, layoutId, estimatedGridWidth, columnCount }: StaticGridItemProps) => {
  const fallbackDimensions = getFallbackDimensions(item, estimatedGridWidth, columnCount);

  return (
    <div
      style={{
        gridColumn: `${item.xOffset + 1} / span ${item.width}`,
        gridRow: `${item.yOffset + 1} / span ${item.height}`,
        position: "relative",
      }}
    >
      <div className="static-grid-item-content">
        {item.type === "item" ? (
          <BoardItemContent item={item} fallbackDimensions={fallbackDimensions} />
        ) : (
          <StaticDynamicSection
            section={item}
            board={board}
            layoutId={layoutId}
            estimatedGridWidth={fallbackDimensions.width}
          />
        )}
      </div>
    </div>
  );
};

interface StaticEmptySectionProps {
  section: EmptySection;
  board: Board;
  layoutId: string;
  columnCount: number;
  estimatedGridWidth: number;
}

const StaticEmptySection = ({ section, board, layoutId, columnCount, estimatedGridWidth }: StaticEmptySectionProps) => {
  const items = getStaticGridElements(board, section.id, layoutId);

  if (items.length === 0) return null;

  return (
    <StaticSectionGrid
      sectionId={section.id}
      board={board}
      layoutId={layoutId}
      columnCount={columnCount}
      estimatedGridWidth={estimatedGridWidth}
    />
  );
};

interface StaticCategorySectionProps {
  section: CategorySection;
  board: Board;
  layoutId: string;
  columnCount: number;
  estimatedGridWidth: number;
}

const StaticCategorySection = ({
  section,
  board,
  layoutId,
  columnCount,
  estimatedGridWidth,
}: StaticCategorySectionProps) => {
  const boardData = useRequiredBoard();
  const [opened, { toggle }] = useCategoryCollapse(section);

  return (
    <Card
      style={{ "--opacity": boardData.opacity / 100 }}
      radius={boardData.itemRadius}
      p={0}
      className={classes.itemCard}
    >
      <Stack>
        <Group wrap="nowrap" gap="sm">
          <UnstyledButton w="100%" p="sm" onClick={toggle}>
            <Group wrap="nowrap">
              {opened ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              <Title order={3}>{section.name}</Title>
            </Group>
          </UnstyledButton>
          <CategoryMenu category={section} />
        </Group>
        <Collapse expanded={opened} p="sm" pt={0}>
          <StaticSectionGrid
            sectionId={section.id}
            board={board}
            layoutId={layoutId}
            columnCount={columnCount}
            estimatedGridWidth={estimatedGridWidth}
          />
        </Collapse>
      </Stack>
    </Card>
  );
};

interface StaticDynamicSectionProps {
  section: DynamicSectionItem;
  board: Board;
  layoutId: string;
  estimatedGridWidth: number;
}

const StaticDynamicSection = ({ section, board, layoutId, estimatedGridWidth }: StaticDynamicSectionProps) => {
  const boardData = useRequiredBoard();
  const options = section.options;

  return (
    <Card
      className={classes.itemCard}
      w="100%"
      h="100%"
      styles={{
        root: {
          overflow: "visible",
          "--opacity": boardData.opacity / 100,
          "--border-color": options.borderColor || undefined,
        },
      }}
      radius={boardData.itemRadius}
      p={0}
    >
      {options.title && (
        <Badge
          pos="absolute"
          top={-15}
          left={10}
          size="md"
          radius={boardData.itemRadius}
          color="var(--background-color)"
          c="var(--mantine-color-text)"
          bd="1px solid var(--border-color)"
        >
          {options.title}
        </Badge>
      )}
      <StaticSectionGrid
        sectionId={section.id}
        board={board}
        layoutId={layoutId}
        columnCount={section.width}
        estimatedGridWidth={estimatedGridWidth}
        isDynamic
        fixedRowCount={section.height}
      />
    </Card>
  );
};
