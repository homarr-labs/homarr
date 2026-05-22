"use client";

import { Badge, Card, Collapse, Group, Stack, Title, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";

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

interface StaticBoardGridProps {
  board: Board;
}

export const StaticBoardGrid = ({ board }: StaticBoardGridProps) => {
  const currentLayoutId = useCurrentLayout();
  const currentLayout = board.layouts.find((layout) => layout.id === currentLayoutId);
  const columnCount = currentLayout?.columnCount ?? 12;

  const fullWidthSortedSections = board.sections
    .filter(
      (section): section is CategorySection | EmptySection => section.kind === "empty" || section.kind === "category",
    )
    .sort((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset);

  return (
    <Stack h="100%">
      {fullWidthSortedSections.map((section) =>
        section.kind === "empty" ? (
          <StaticEmptySection
            key={section.id}
            section={section}
            board={board}
            layoutId={currentLayoutId}
            columnCount={columnCount}
          />
        ) : (
          <StaticCategorySection
            key={section.id}
            section={section}
            board={board}
            layoutId={currentLayoutId}
            columnCount={columnCount}
          />
        ),
      )}
    </Stack>
  );
};

interface StaticSectionGridProps {
  sectionId: string;
  board: Board;
  layoutId: string;
  columnCount: number;
  isDynamic?: boolean;
  fixedRowCount?: number;
}

const StaticSectionGrid = ({
  sectionId,
  board,
  layoutId,
  columnCount,
  isDynamic,
  fixedRowCount,
}: StaticSectionGridProps) => {
  const items = getSectionItems(board, sectionId, layoutId);
  const innerSections = getDynamicSections(board, sectionId, layoutId);
  const allItems = [...items, ...innerSections].sort((itemA, itemB) => {
    if (itemA.yOffset === itemB.yOffset) return itemA.xOffset - itemB.xOffset;
    return itemA.yOffset - itemB.yOffset;
  });

  if (allItems.length === 0) return null;

  const rowCount = fixedRowCount ?? Math.max(...allItems.map((item) => item.yOffset + item.height));

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
          <StaticGridItem key={item.id} item={item} board={board} layoutId={layoutId} />
        ))}
      </div>
    </div>
  );
};

interface StaticGridItemProps {
  item: SectionItem | DynamicSectionItem;
  board: Board;
  layoutId: string;
}

const StaticGridItem = ({ item, board, layoutId }: StaticGridItemProps) => (
  <div
    style={{
      gridColumn: `${item.xOffset + 1} / span ${item.width}`,
      gridRow: `${item.yOffset + 1} / span ${item.height}`,
      position: "relative",
    }}
  >
    <div className="static-grid-item-content">
      {item.type === "item" ? (
        <BoardItemContent item={item} />
      ) : (
        <StaticDynamicSection section={item} board={board} layoutId={layoutId} />
      )}
    </div>
  </div>
);

interface StaticEmptySectionProps {
  section: EmptySection;
  board: Board;
  layoutId: string;
  columnCount: number;
}

const StaticEmptySection = ({ section, board, layoutId, columnCount }: StaticEmptySectionProps) => {
  const items = getSectionItems(board, section.id, layoutId);
  const innerSections = getDynamicSections(board, section.id, layoutId);

  if (items.length === 0 && innerSections.length === 0) return null;

  return <StaticSectionGrid sectionId={section.id} board={board} layoutId={layoutId} columnCount={columnCount} />;
};

interface StaticCategorySectionProps {
  section: CategorySection;
  board: Board;
  layoutId: string;
  columnCount: number;
}

const StaticCategorySection = ({ section, board, layoutId, columnCount }: StaticCategorySectionProps) => {
  const { mutate } = clientApi.section.changeCollapsed.useMutation();
  const boardData = useRequiredBoard();
  const [opened, { toggle }] = useDisclosure(section.collapsed);

  const handleToggle = () => {
    toggle();
    mutate({ sectionId: section.id, collapsed: !opened });
  };

  return (
    <Card
      style={{ "--opacity": boardData.opacity / 100 }}
      radius={boardData.itemRadius}
      withBorder
      p={0}
      className={classes.itemCard}
    >
      <Stack>
        <Group wrap="nowrap" gap="sm">
          <UnstyledButton w="100%" p="sm" onClick={handleToggle}>
            <Group wrap="nowrap">
              {opened ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              <Title order={3}>{section.name}</Title>
            </Group>
          </UnstyledButton>
          <CategoryMenu category={section} />
        </Group>
        <Collapse in={opened} p="sm" pt={0}>
          <StaticSectionGrid sectionId={section.id} board={board} layoutId={layoutId} columnCount={columnCount} />
        </Collapse>
      </Stack>
    </Card>
  );
};

interface StaticDynamicSectionProps {
  section: DynamicSectionItem;
  board: Board;
  layoutId: string;
}

const StaticDynamicSection = ({ section, board, layoutId }: StaticDynamicSectionProps) => {
  const boardData = useRequiredBoard();
  const options = section.options;

  return (
    <Card
      className={classes.itemCard}
      w="100%"
      h="100%"
      withBorder
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
        isDynamic
        fixedRowCount={section.height}
      />
    </Card>
  );
};

function getSectionItems(board: Board, sectionId: string, layoutId: string): SectionItem[] {
  return board.items
    .map(({ layouts, ...item }) => {
      const layout = layouts.find((candidate) => candidate.layoutId === layoutId);
      if (!layout) return null;
      return { ...layout, ...item, type: "item" as const };
    })
    .filter((item): item is SectionItem => item !== null && item.sectionId === sectionId);
}

function getDynamicSections(board: Board, sectionId: string, layoutId: string): DynamicSectionItem[] {
  return board.sections
    .filter((section) => section.kind === "dynamic")
    .map(({ layouts, ...section }) => {
      const layout = layouts.find((candidate) => candidate.layoutId === layoutId);
      if (!layout) return null;
      return { ...layout, ...section, type: "section" as const };
    })
    .filter((entry): entry is DynamicSectionItem => entry !== null && entry.parentSectionId === sectionId);
}
