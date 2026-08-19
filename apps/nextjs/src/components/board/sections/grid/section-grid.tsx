"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Box, LoadingOverlay } from "@mantine/core";
import combineClasses from "clsx";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useI18n } from "@homarr/translation/client";

import type { ContainerSectionItem, Section } from "~/app/[locale]/boards/_types";
import {
  getCollapsedDisplayLayout,
  getEditableCanvasAttributes,
  getGridRowCountForVisualHeight,
  getLayoutRowCount,
  getLogicalItemStyle,
  getLogicalTrackSize,
  getReadonlyCanvasAttributes,
  normalizeGridPlacement,
} from "~/components/board/layout";
import { useBoardCanvasScale } from "~/components/board/layout/scaled-board-canvas";
import { loadGridEditorAsync } from "./grid-editor-loader";
import { useGridEditorRuntimeStatus } from "./grid-editor-runtime";
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
  section: Exclude<Section, { kind: "container" }> | ContainerSectionItem;
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
  const canvasScale = useBoardCanvasScale();
  const editorRuntimeStatus = useGridEditorRuntimeStatus();
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
          getContainerMinimumSize(board, currentLayoutId, innerSection.id),
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
  const minimumViewportRowCount = useMinimumViewportRowCount(section.kind === "empty", canvasScale);
  const contentRowCount = Math.max(1, getLayoutRowCount(displayPlacements));
  const rowCount = Math.max(contentRowCount, requestedRowCount, minimumViewportRowCount);
  const maxRowCount = section.kind === "container" || railPlacement !== "main" ? rowCount : null;
  const isScrollableContainer = section.kind === "container" && section.options.scrollable && !isEditMode;
  const viewportRowCount = isScrollableContainer ? Math.max(requestedRowCount, 1) : rowCount;
  const logicalWidth = getLogicalTrackSize(columnCount);
  const logicalHeight = getLogicalTrackSize(rowCount);
  const viewportHeight = getLogicalTrackSize(viewportRowCount);
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
        maxRowCount,
        announce,
      }}
    >
      <Box
        {...canvasAttributes}
        className={combineClasses(classes.viewport, isScrollableContainer && classes.scrollableViewport, className)}
        style={{
          width: logicalWidth,
          height: `var(--board-grid-drag-height, ${viewportHeight}px)`,
        }}
        data-section-id={section.id}
        data-section-kind={section.kind}
        data-rail-placement={railPlacement}
        data-scrollable={isScrollableContainer ? "true" : undefined}
      >
        {isEditMode && editorRuntimeStatus === "ready" ? (
          <GridEditor
            sectionId={section.id}
            columnCount={columnCount}
            rowCount={rowCount}
            maxRowCount={maxRowCount}
            placements={displayPlacements}
            className={combineClasses("board-grid-editor", classes.editorGrid)}
          />
        ) : isEditMode && editorRuntimeStatus === "loading" ? (
          <GridEditorLoading />
        ) : (
          <Box
            className={classes.staticGrid}
            style={{ width: logicalWidth, height: logicalHeight }}
            data-grid-section-id={section.id}
            data-kind={section.kind}
            data-grid-editor-error={isEditMode && editorRuntimeStatus === "error" ? "true" : undefined}
          >
            <SectionContent />
          </Box>
        )}
      </Box>
    </SectionProvider>
  );
};

const useMinimumViewportRowCount = (enabled: boolean, canvasScale: number) => {
  const [visualHeight, setVisualHeight] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const update = () => setVisualHeight(window.visualViewport?.height ?? window.innerHeight);
    update();
    window.addEventListener("resize", update, { passive: true });
    window.visualViewport?.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [enabled]);

  return enabled ? getGridRowCountForVisualHeight(visualHeight, canvasScale) : 0;
};

const getContainerMinimumSize = (
  board: ReturnType<typeof useRequiredBoard>,
  layoutId: string,
  sectionId: string,
  visited = new Set<string>(),
): { width: number; height: number } => {
  if (visited.has(sectionId)) return { width: 1, height: 1 };
  const nextVisited = new Set(visited).add(sectionId);
  const section = board.sections.find((candidate) => candidate.id === sectionId);
  // A scrollable container isn't forced to grow with its content - it scrolls internally instead,
  // so it shouldn't have a content-derived height floor imposed by its parent's grid.
  const isScrollable = section?.kind === "container" && section.options.scrollable;
  const directItems: PlacementBounds[] = board.items.flatMap((item) => {
    const layout = item.layouts.find((candidate) => candidate.layoutId === layoutId);
    return layout?.sectionId === sectionId ? [layout] : [];
  });
  const directSections: PlacementBounds[] = board.sections.flatMap((candidate) => {
    if (candidate.kind !== "container") return [];
    const layout = candidate.layouts.find((candidateLayout) => candidateLayout.layoutId === layoutId);
    if (!layout || layout.parentSectionId !== sectionId) return [];
    const minimum = getContainerMinimumSize(board, layoutId, candidate.id, nextVisited);
    return [
      {
        ...layout,
        width: Math.max(layout.width, minimum.width),
        height: Math.max(layout.height, minimum.height),
      },
    ];
  });
  const children = [...directItems, ...directSections];

  return {
    width: Math.max(1, ...children.map((child) => child.xOffset + child.width)),
    height: isScrollable ? 1 : Math.max(1, ...children.map((child) => child.yOffset + child.height)),
  };
};

interface PlacementBounds {
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

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
