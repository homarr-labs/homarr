"use client";

import type { CSSProperties } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

import "gridstack/dist/gridstack.min.css"; // oxlint-disable-line import/no-unassigned-import
import "./grid-editor.css"; // oxlint-disable-line import/no-unassigned-import

import type { AddRemoveFcn, GridItemHTMLElement, GridStackNode, GridStackWidget } from "gridstack";
import { GridStack } from "gridstack";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";

import { getLogicalTrackSize, LOGICAL_GRID_GAP, LOGICAL_GRID_PITCH } from "~/components/board/layout";
import { useSectionContext } from "../section-context";
import { useBoardGridPortalHost } from "./grid-portal-host";
import { decorateGridResizeHandles } from "./grid-resize-handles";
import type { SectionGridPlacement } from "./use-grid-layout-actions";
import { useGridLayoutActions } from "./use-grid-layout-actions";

const AUTO_EXPAND_ROW_BUFFER = 8;

interface GridEditorProps {
  sectionId: string;
  columnCount: number;
  rowCount: number;
  fixedRowCount: boolean;
  placements: readonly SectionGridPlacement[];
  className: string;
}

/**
 * The only board module that imports GridStack. The library owns every
 * positioned shell, while one board-level portal host owns React content.
 * Moving a shell between independent grids therefore never reparents a
 * React-owned element.
 */
export default function GridEditor({
  sectionId,
  columnCount,
  rowCount,
  fixedRowCount,
  placements,
  className,
}: GridEditorProps) {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const t = useI18n();
  const { announce, innerSections, items } = useSectionContext();
  const { acquireContainer, releaseContainer } = useBoardGridPortalHost();
  const { commitSectionGrid, commitSectionGrids } = useGridLayoutActions();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<GridStack | null>(null);
  const applyingControlledLayoutRef = useRef(false);
  const placementsRef = useRef(placements);
  const entriesRef = useRef([...items, ...innerSections]);
  const acceptWidgetRef = useRef<(element: Element) => boolean>(() => false);
  const dimensionsRef = useRef({ columnCount, fixedRowCount, rowCount });

  placementsRef.current = placements;
  entriesRef.current = [...items, ...innerSections];
  dimensionsRef.current = { columnCount, fixedRowCount, rowCount };

  const forbiddenDynamicSectionIds = useMemo(
    () => getTargetAncestorSectionIds(board.sections, currentLayoutId, sectionId),
    [board.sections, currentLayoutId, sectionId],
  );
  acceptWidgetRef.current = (element) => {
    const node = (element as GridItemHTMLElement).gridstackNode;
    const id = element.getAttribute("data-grid-item-id") ?? node?.id;
    if (!id) return false;
    if ((node?.minW ?? 1) > columnCount) return false;
    if (fixedRowCount && (node?.minH ?? 1) > rowCount) return false;

    return element.getAttribute("data-grid-item-type") !== "section" || !forbiddenDynamicSectionIds.has(String(id));
  };

  const shellCallback = useCallback<AddRemoveFcn>(
    (_parent, widget, add, isGrid) => {
      if (isGrid) return undefined;
      const id = widget.id ? String(widget.id) : null;
      if (!id) return undefined;

      if (!add) {
        const element = (widget as GridStackNode).el;
        const container = element?.querySelector<HTMLElement>(":scope > .grid-stack-item-content");
        if (container) releaseContainer(id, container);
        element?.remove();
        return undefined;
      }

      const element = document.createElement("div") as GridItemHTMLElement;
      element.className = "grid-stack-item";
      element.appendChild(acquireContainer(id));
      return element;
    },
    [acquireContainer, releaseContainer],
  );

  const snapshotGrid = useCallback(
    (grid: GridStack | undefined) => {
      if (!grid?.el) return null;
      const snapshotSectionId = grid.el.getAttribute("data-grid-section-id");
      if (!snapshotSectionId) return null;

      return {
        layoutId: currentLayoutId,
        sectionId: snapshotSectionId,
        placements: getGridPlacements(grid),
      };
    },
    [currentLayoutId],
  );

  const commitGrid = useCallback(
    (grid: GridStack | undefined) => {
      if (applyingControlledLayoutRef.current) return;
      const snapshot = snapshotGrid(grid);
      if (snapshot) commitSectionGrid(snapshot);
    },
    [commitSectionGrid, snapshotGrid],
  );

  const announceNode = useCallback(
    (node: GridStackNode | undefined) => {
      if (!node?.id) return;
      const entry = entriesRef.current.find((candidate) => candidate.id === String(node.id));
      const displayName =
        entry?.type === "item"
          ? entry.advancedOptions.title?.trim() || t(`widget.${entry.kind}.name`)
          : entry?.type === "section"
            ? entry.options.title.trim() || t("section.dynamic.untitled")
            : t("item.action.moveResize");
      const label = t("item.moveResize.entryLabel", {
        name: displayName,
        column: String((node.x ?? 0) + 1),
        row: String((node.y ?? 0) + 1),
      });
      announce(
        `${label}: ${t("item.moveResize.field.width.label")} ${node.w ?? 1}, ${t(
          "item.moveResize.field.height.label",
        )} ${node.h ?? 1}`,
      );
    },
    [announce, t],
  );
  const eventHandlersRef = useRef({
    announceNode,
    commitGrid,
    commitSectionGrids,
    snapshotGrid,
  });
  eventHandlersRef.current = {
    announceNode,
    commitGrid,
    commitSectionGrids,
    snapshotGrid,
  };

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const dimensions = dimensionsRef.current;

    const grid = GridStack.init(
      {
        acceptWidgets: (element) => acceptWidgetRef.current(element),
        alwaysShowResizeHandle: true,
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        cellHeight: LOGICAL_GRID_PITCH,
        column: dimensions.columnCount,
        draggable: {
          cancel:
            'a,button,input,textarea,select,option,[contenteditable="true"],[role="button"],[data-grid-no-drag],.ui-resizable-handle',
          handle: "[data-editor-grid-entry]",
          scroll: true,
        },
        float: true,
        margin: `0 ${LOGICAL_GRID_GAP}px ${LOGICAL_GRID_GAP}px 0`,
        maxRow: dimensions.fixedRowCount ? dimensions.rowCount : 0,
        minRow: dimensions.fixedRowCount ? dimensions.rowCount : 1,
        resizable: {
          autoHide: false,
          handles: "e, se, s, sw, w",
        },
      },
      wrapper,
    );
    if (!grid) return;

    // GridStack infers a native sub-grid from DOM nesting. Homarr owns nested
    // grids independently so content can move between them without remounting;
    // keeping the inferred link makes parent/child teardown order unsafe.
    const inferredParentNode = grid.parentGridNode;
    if (inferredParentNode) {
      if (inferredParentNode.subGrid === grid) delete inferredParentNode.subGrid;
      delete grid.parentGridNode;
      wrapper.classList.remove("grid-stack-nested");
      inferredParentNode.el?.classList.remove("grid-stack-sub-grid");
    }

    gridRef.current = grid;
    wrapper.setAttribute("data-grid-section-id", sectionId);
    wrapper.classList.add("grid-stack-editing");

    const handleStop = (_event: Event, element: GridItemHTMLElement) => {
      eventHandlersRef.current.commitGrid(element.gridstackNode?.grid ?? grid);
      eventHandlersRef.current.announceNode(element.gridstackNode);
      decorateGrid(element.gridstackNode?.grid ?? grid, placementsRef.current);
      restoreContentHeight(grid);
    };
    const handleDragStart = () => {
      const currentDimensions = dimensionsRef.current;
      if (currentDimensions.fixedRowCount) return;

      grid.updateOptions({
        minRow: currentDimensions.rowCount + AUTO_EXPAND_ROW_BUFFER,
      });
      setViewportRowCount(grid, currentDimensions.rowCount + AUTO_EXPAND_ROW_BUFFER);
    };
    const handleDropped = (
      _event: Event,
      previousNode: GridStackNode | undefined,
      newNode: GridStackNode | undefined,
    ) => {
      queueMicrotask(() => {
        if (applyingControlledLayoutRef.current) return;
        const snapshots = uniqueGrids([previousNode?.grid, newNode?.grid ?? grid])
          .map((changedGrid) => eventHandlersRef.current.snapshotGrid(changedGrid))
          .filter((snapshot) => snapshot !== null);
        if (snapshots.length > 0) eventHandlersRef.current.commitSectionGrids(snapshots);
        eventHandlersRef.current.announceNode(newNode);
        for (const changedGrid of uniqueGrids([previousNode?.grid, newNode?.grid])) {
          decorateGrid(changedGrid, placementsRef.current);
          restoreContentHeight(changedGrid);
        }
      });
    };

    grid.on("dragstart", handleDragStart);
    grid.on("dragstop", handleStop);
    grid.on("resizestop", handleStop);
    grid.on("dropped", handleDropped);

    return () => {
      grid.offAll();
      const elements = grid.getGridItems();
      for (const element of elements) {
        const id = element.getAttribute("data-grid-item-id") ?? element.gridstackNode?.id;
        const container = element.querySelector<HTMLElement>(":scope > .grid-stack-item-content");
        if (id && container) releaseContainer(String(id), container);
      }
      grid.destroy(false);
      for (const element of elements) element.remove();
      if (gridRef.current === grid) gridRef.current = null;
    };
  }, [releaseContainer, sectionId, shellCallback]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.updateOptions({
      column: columnCount,
      maxRow: fixedRowCount ? rowCount : 0,
      minRow: fixedRowCount ? rowCount : 1,
    });
  }, [columnCount, fixedRowCount, rowCount]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    applyingControlledLayoutRef.current = true;
    grid.load(placements.map(toGridStackWidget), shellCallback);
    applyingControlledLayoutRef.current = false;
    decorateGrid(grid, placements);
    restoreContentHeight(grid);

    const actual = getGridPlacements(grid);
    if (!arePlacementsEqual(actual, placements)) {
      commitSectionGrid({ layoutId: currentLayoutId, sectionId, placements: actual });
    }
  }, [commitSectionGrid, currentLayoutId, placements, sectionId, shellCallback]);

  return (
    <>
      <div
        ref={wrapperRef}
        className={className}
        data-grid-section-id={sectionId}
        style={
          {
            width: columnCount * LOGICAL_GRID_PITCH,
            minHeight: rowCount * LOGICAL_GRID_PITCH,
          } as CSSProperties
        }
      />
      <span
        data-grid-runtime="homarr-edit-grid-v1"
        data-editor-section-id={sectionId}
        aria-hidden="true"
        style={{ position: "absolute", width: 1, height: 1, pointerEvents: "none" }}
      />
    </>
  );
}

const toGridStackWidget = (placement: SectionGridPlacement): GridStackWidget => ({
  id: placement.id,
  x: placement.x,
  y: placement.y,
  w: placement.w,
  h: placement.h,
  minW: placement.minW ?? 1,
  minH: placement.minH ?? 1,
});

const getGridPlacements = (grid: GridStack): SectionGridPlacement[] =>
  grid.getGridItems().flatMap((element) => {
    const node = element.gridstackNode;
    const id = element.getAttribute("data-grid-item-id") ?? node?.id;
    const type = element.getAttribute("data-grid-item-type");
    if (!node || !id || (type !== "item" && type !== "section")) return [];

    return [
      {
        id: String(id),
        type,
        x: node.x ?? 0,
        y: node.y ?? 0,
        w: node.w ?? 1,
        h: node.h ?? 1,
        minW: node.minW,
        minH: node.minH,
      },
    ];
  });

const decorateGrid = (grid: GridStack | undefined, placements: readonly SectionGridPlacement[]) => {
  if (!grid?.el) return;
  const placementById = new Map(placements.map((placement) => [placement.id, placement]));
  grid.el.classList.add("grid-stack-editing");
  for (const item of grid.getGridItems()) {
    const id = item.getAttribute("data-grid-item-id") ?? item.gridstackNode?.id;
    const placement = id ? placementById.get(String(id)) : undefined;
    decorateItem(item, placement?.type ?? getElementItemType(item));
  }
};

const decorateItem = (element: GridItemHTMLElement, type: SectionGridPlacement["type"] | undefined) => {
  const node = element.gridstackNode;
  if (!node?.id) return;

  element.setAttribute("data-grid-item-id", String(node.id));
  if (type) element.setAttribute("data-grid-item-type", type);
  element.setAttribute("data-grid-x", String(node.x ?? 0));
  element.setAttribute("data-grid-y", String(node.y ?? 0));
  element.setAttribute("data-grid-w", String(node.w ?? 1));
  element.setAttribute("data-grid-h", String(node.h ?? 1));
  decorateGridResizeHandles(element);
};

const getElementItemType = (element: Element): SectionGridPlacement["type"] | undefined => {
  const type = element.getAttribute("data-grid-item-type");
  return type === "item" || type === "section" ? type : undefined;
};

const arePlacementsEqual = (first: readonly SectionGridPlacement[], second: readonly SectionGridPlacement[]) => {
  if (first.length !== second.length) return false;
  const secondById = new Map(second.map((placement) => [placement.id, placement]));
  return first.every((placement) => {
    const other = secondById.get(placement.id);
    return (
      other !== undefined &&
      placement.type === other.type &&
      placement.x === other.x &&
      placement.y === other.y &&
      placement.w === other.w &&
      placement.h === other.h
    );
  });
};

const uniqueGrids = (grids: Array<GridStack | undefined>) =>
  Array.from(new Set(grids.filter((grid): grid is GridStack => grid !== undefined)));

const restoreContentHeight = (grid: GridStack | undefined) => {
  if (!grid || (grid.opts.maxRow ?? 0) > 0) return;
  const contentRowCount = Math.max(1, ...getGridPlacements(grid).map((placement) => placement.y + placement.h));
  grid.updateOptions({ minRow: contentRowCount });
  setViewportRowCount(grid, contentRowCount);
};

const setViewportRowCount = (grid: GridStack, rowCount: number) => {
  const viewport = grid.el.parentElement;
  if (!viewport?.hasAttribute("data-section-id")) return;
  viewport.style.setProperty("--board-grid-drag-height", `${getLogicalTrackSize(rowCount)}px`);
};

const getTargetAncestorSectionIds = (
  sections: ReturnType<typeof useRequiredBoard>["sections"],
  layoutId: string,
  targetSectionId: string,
) => {
  const parentById = new Map(
    sections
      .filter((section) => section.kind === "dynamic")
      .flatMap((section) => {
        const layout = section.layouts.find((candidate) => candidate.layoutId === layoutId);
        return layout ? ([[section.id, layout.parentSectionId]] as const) : [];
      }),
  );
  const ancestors = new Set<string>();
  let current: string | undefined = targetSectionId;
  while (current && !ancestors.has(current)) {
    ancestors.add(current);
    current = parentById.get(current);
  }
  return ancestors;
};
