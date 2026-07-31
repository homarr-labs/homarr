"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Box, LoadingOverlay } from "@mantine/core";
import combineClasses from "clsx";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useI18n } from "@homarr/translation/client";

import type { DynamicSectionItem, Section } from "~/app/[locale]/boards/_types";
import {
  getCollapsedDisplayLayout,
  getEditableCanvasAttributes,
  getLayoutRowCount,
  getLogicalItemStyle,
  getLogicalTrackSize,
  getReadonlyCanvasAttributes,
  normalizeGridPlacement,
} from "~/components/board/layout";
import { loadGridEditorAsync } from "./grid-editor-loader";
import type { SectionGridPlacement } from "./use-grid-layout-actions";
import { SectionContent } from "../content";
import { useCollapsedSectionIds } from "../section-collapse";
import { SectionProvider, useSectionContext } from "../section-context";
import { useSectionItems } from "../use-section-items";
import { useBoardGridPortalHost } from "./grid-portal-host";
import classes from "./section-grid.module.css";

const GridEditor = dynamic(loadGridEditorAsync, {
  loading: GridEditorLoading,
  ssr: false,
});

function GridEditorLoading() {
  const t = useI18n();
  const { items, innerSections } = useSectionContext();

  return (
    <Box
      component="output"
      className={classes.editorLoading}
      data-testid="board-grid-editor-loading"
      aria-label={t("common.action.loading")}
    >
      {[...items, ...innerSections].map((item) => (
        <Box
          key={item.id}
          className={classes.editorLoadingItem}
          style={getLogicalItemStyle({
            x: item.xOffset,
            y: item.yOffset,
            w: item.width,
            h: item.height,
          })}
          aria-hidden="true"
        />
      ))}
      <LoadingOverlay visible />
    </Box>
  );
}

interface SectionGridProps {
  section: Exclude<Section, { kind: "dynamic" }> | DynamicSectionItem;
  columnCount: number;
  requestedRowCount?: number;
  label: string;
  railPlacement?: "main" | "left" | "right";
  className?: string;
}

export const SectionGrid = ({
  section,
  columnCount,
  requestedRowCount = 0,
  label,
  railPlacement = "main",
  className,
}: SectionGridProps) => {
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const { items, innerSections } = useSectionItems(section.id);
  const { announce, integrations } = useBoardGridPortalHost();
  const collapsedSectionIds = useCollapsedSectionIds();
  const minimumBySectionId = useMemo(
    () =>
      new Map(
        innerSections.map((innerSection) => [
          innerSection.id,
          getDynamicSectionMinimumSize(board, currentLayoutId, innerSection.id),
        ]),
      ),
    [board, currentLayoutId, innerSections],
  );

  const placements = useMemo(
    () =>
      [...items, ...innerSections].map((item): SectionGridPlacement => {
        const minimum = item.type === "section" ? minimumBySectionId.get(item.id) : undefined;
        return normalizeGridPlacement(
          {
            id: item.id,
            type: item.type,
            x: item.xOffset,
            y: item.yOffset,
            w: item.width,
            h: item.height,
            minW: minimum?.width,
            minH: minimum?.height,
          },
          columnCount,
        );
      }),
    [columnCount, innerSections, items, minimumBySectionId],
  );

  const displayPlacements = useMemo(() => {
    const directCollapsedIds = new Set(
      placements
        .filter(
          (placement) =>
            placement.type === "section" &&
            collapsedSectionIds.has(placement.id) &&
            innerSections.find((innerSection) => innerSection.id === placement.id)?.options.collapsible,
        )
        .map((placement) => placement.id),
    );
    if (directCollapsedIds.size === 0) return placements;

    return getCollapsedDisplayLayout(placements, {
      columnCount,
      collapsedItemIds: directCollapsedIds,
    });
  }, [collapsedSectionIds, columnCount, innerSections, placements]);

  const placementById = useMemo(
    () => new Map(displayPlacements.map((placement) => [placement.id, placement])),
    [displayPlacements],
  );
  const displayedItems = items.map((item) => withPlacement(item, placementById.get(item.id)));
  const displayedInnerSections = innerSections.map((item) => withPlacement(item, placementById.get(item.id)));
  const contentRowCount = Math.max(1, getLayoutRowCount(displayPlacements));
  const rowCount = Math.max(contentRowCount, requestedRowCount);
  const fixedRowCount = section.kind === "dynamic";
  const logicalWidth = getLogicalTrackSize(columnCount);
  const logicalHeight = getLogicalTrackSize(rowCount);
  const canvasAttributes = isEditMode
    ? getEditableCanvasAttributes({ label, columnCount, rowCount })
    : getReadonlyCanvasAttributes({ label });

  return (
    <SectionProvider
      value={{
        section,
        items: displayedItems,
        innerSections: displayedInnerSections,
        integrations,
        columnCount,
        maxRowCount: fixedRowCount ? rowCount : null,
        announce,
      }}
    >
      <Box
        {...canvasAttributes}
        className={combineClasses(classes.viewport, className)}
        w={logicalWidth}
        h={`var(--board-grid-drag-height, ${logicalHeight}px)`}
        data-section-id={section.id}
        data-section-kind={section.kind}
        data-rail-placement={railPlacement}
      >
        {isEditMode ? (
          <GridEditor
            sectionId={section.id}
            columnCount={columnCount}
            rowCount={rowCount}
            fixedRowCount={fixedRowCount}
            placements={displayPlacements}
            className={combineClasses("grid-stack", classes.editorGrid)}
          />
        ) : (
          <Box
            className={classes.staticGrid}
            style={{ width: logicalWidth, height: logicalHeight }}
            data-grid-section-id={section.id}
            data-kind={section.kind}
          >
            <SectionContent />
          </Box>
        )}
      </Box>
    </SectionProvider>
  );
};

const getDynamicSectionMinimumSize = (
  board: ReturnType<typeof useRequiredBoard>,
  layoutId: string,
  sectionId: string,
) => {
  const directItems = board.items.flatMap((item) => {
    const layout = item.layouts.find((candidate) => candidate.layoutId === layoutId);
    return layout?.sectionId === sectionId ? [layout] : [];
  });
  const directSections = board.sections.flatMap((candidate) => {
    if (candidate.kind !== "dynamic") return [];
    const layout = candidate.layouts.find((candidateLayout) => candidateLayout.layoutId === layoutId);
    return layout?.parentSectionId === sectionId ? [layout] : [];
  });
  const children = [...directItems, ...directSections];

  return {
    width: Math.max(1, ...children.map((child) => child.xOffset + child.width)),
    height: Math.max(1, ...children.map((child) => child.yOffset + child.height)),
  };
};

const withPlacement = <
  TItem extends {
    id: string;
    xOffset: number;
    yOffset: number;
    width: number;
    height: number;
  },
>(
  item: TItem,
  placement: SectionGridPlacement | undefined,
): TItem => {
  if (!placement) return item;
  return {
    ...item,
    xOffset: placement.x,
    yOffset: placement.y,
    width: placement.w,
    height: placement.h,
  };
};
