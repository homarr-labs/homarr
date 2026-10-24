"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent, RefObject } from "react";
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box } from "@mantine/core";
import combineClasses from "clsx";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";

import type { ContainerSectionItem, Section } from "~/app/[locale]/boards/_types";
import {
  getCollapsedDisplayLayout,
  CONTAINER_HEADER_HEIGHT,
  getEditableCanvasAttributes,
  getGridRowCountForVisualHeight,
  getLayoutRowCount,
  getLogicalGridSize,
  getReadonlyCanvasAttributes,
  LOGICAL_GRID_PITCH,
} from "~/components/board/layout";
import { calculateBoardUiScale, useBoardCanvasScale } from "~/components/board/layout/scaled-board-canvas";
import { useGridEditorRuntimeStatus } from "./grid-editor-runtime";
import { createGridEntryElementStore, useGridEditorRegistry } from "./grid-editor-registry";
import type { SectionGridPlacement } from "./use-grid-layout-actions";
import { SectionContent } from "../content";
import { useCollapsedSectionIds, useExpandSectionsForEditing } from "../section-collapse";
import { SectionProvider } from "../section-context";
import { useSectionItems } from "../use-section-items";
import { useBoardGridPortalHost } from "./grid-portal-host";
import classes from "./section-grid.module.css";

const GridContentScaleContext = createContext(1);
const CONTAINER_CARD_INSET = 5;

interface SectionGridProps {
  section: Exclude<Section, { kind: "container" }> | ContainerSectionItem;
  columnCount: number;
  requestedRowCount?: number;
  viewportRowCountOverride?: number;
  containerInlineInsetCount?: number;
  label: string;
  railPlacement?: "main" | "left" | "right";
  className?: string;
}

export const SectionGrid = ({
  section,
  columnCount,
  requestedRowCount = 0,
  viewportRowCountOverride,
  containerInlineInsetCount = 2,
  label,
  railPlacement = "main",
  className,
}: SectionGridProps) => {
  const [isEditMode] = useEditMode();
  const canvasScale = useBoardCanvasScale();
  const parentContentScale = useContext(GridContentScaleContext);
  const [collapsedRowsPerPixel, setCollapsedRowsPerPixel] = useState<number>();
  const editorRuntimeStatus = useGridEditorRuntimeStatus();
  const editorRegistry = useGridEditorRegistry();
  const editorHostRef = useRef<HTMLDivElement>(null);
  const [entryElementStore] = useState(createGridEntryElementStore);
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const { items, innerSections } = useSectionItems(section.id);
  const hasLabeledCollapsibleChildren = innerSections.some(
    (child) => child.options.collapsible && child.options.showLabel,
  );
  const { announce, integrations } = useBoardGridPortalHost();
  const collapsedSectionIds = useCollapsedSectionIds();
  const expandSectionsForEditing = useExpandSectionsForEditing();
  const minimumBySectionId = useMemo(
    () => getContainerMinimumSizes(board, currentLayoutId, canvasScale),
    [board, canvasScale, currentLayoutId],
  );

  // Resolve expanded footprints before rendering or editing so header growth cannot overlap neighbours.
  const placements = useMemo(
    () =>
      getCollapsedDisplayLayout(
        [...items, ...innerSections].map((item): SectionGridPlacement => {
          const minimum = item.type === "section" ? minimumBySectionId.get(item.id) : undefined;
          const isNonScrollableContainer = item.type === "section" && !item.options.scrollable;
          const height = isNonScrollableContainer && minimum ? Math.max(item.height, minimum.height) : item.height;
          return {
            id: item.id,
            type: item.type,
            x: item.xOffset,
            y: item.yOffset,
            w: item.width,
            h: height,
            minW: minimum?.width,
            minH: minimum?.height,
          };
        }),
        { columnCount, collapsedItemIds: new Set() },
      ),
    [columnCount, innerSections, items, minimumBySectionId],
  );
  const collapsibleSectionIds = useMemo(
    () =>
      new Set(
        innerSections.filter((innerSection) => innerSection.options.collapsible).map((innerSection) => innerSection.id),
      ),
    [innerSections],
  );

  const directCollapsedIds = useMemo(
    () =>
      new Set(
        placements
          .filter(
            (placement) =>
              placement.type === "section" &&
              collapsedSectionIds.has(placement.id) &&
              collapsibleSectionIds.has(placement.id),
          )
          .map((placement) => placement.id),
      ),
    [collapsedSectionIds, collapsibleSectionIds, placements],
  );
  const displayPlacements = useMemo(() => {
    if (directCollapsedIds.size === 0) return placements;

    let collapsedRowCountById: ReadonlyMap<string, number> | undefined;
    if (collapsedRowsPerPixel !== undefined) {
      const headerHeight = CONTAINER_HEADER_HEIGHT * calculateBoardUiScale(canvasScale) * canvasScale;
      collapsedRowCountById = new Map(
        innerSections
          .filter((child) => child.options.collapsible && child.options.showLabel)
          .map((child) => {
            let topInset = CONTAINER_CARD_INSET;
            if (railPlacement !== "main" && child.yOffset === 0) topInset = 0;
            return [child.id, (headerHeight + topInset + 10) * collapsedRowsPerPixel];
          }),
      );
    }
    return getCollapsedDisplayLayout(placements, {
      columnCount,
      collapsedItemIds: directCollapsedIds,
      collapsedRowCountById,
    });
  }, [canvasScale, columnCount, directCollapsedIds, innerSections, placements, collapsedRowsPerPixel, railPlacement]);

  const placementById = useMemo(
    () => new Map(displayPlacements.map((placement) => [placement.id, placement])),
    [displayPlacements],
  );
  const displayedItems = useMemo(
    () => items.map((item) => withPlacement(item, placementById.get(item.id))),
    [items, placementById],
  );
  const displayedInnerSections = useMemo(
    () => innerSections.map((item) => withPlacement(item, placementById.get(item.id))),
    [innerSections, placementById],
  );
  const viewportRef = useRef<HTMLDivElement>(null);
  const isRail = railPlacement !== "main";
  const railLogicalHeight = useRailLogicalHeight(viewportRef, isRail, canvasScale);
  const minimumViewportRowCount = useMinimumViewportRowCount(section.kind === "empty" && isEditMode, canvasScale);
  const contentRowCount = Math.max(1, getLayoutRowCount(displayPlacements));
  const railViewportRowCount = getGridRowCountForVisualHeight(railLogicalHeight, 1);
  let rowCount = Math.max(contentRowCount, requestedRowCount, minimumViewportRowCount);
  if (isRail) {
    rowCount = Math.max(railViewportRowCount, contentRowCount);
  }
  const isScrollableContainer = section.kind === "container" && section.options.scrollable;
  const parentScale = canvasScale * parentContentScale;
  const effectiveCanvasScale = Number.isFinite(parentScale) && parentScale > 0 ? parentScale : 1;
  let outerCardInset = 0;
  let outerCardInlineInset = 0;
  if (section.kind === "container") {
    outerCardInset = (2 * CONTAINER_CARD_INSET) / effectiveCanvasScale;
    outerCardInlineInset = (containerInlineInsetCount * CONTAINER_CARD_INSET) / effectiveCanvasScale;
  }
  const fullGridWidth = getLogicalGridSize(columnCount);
  const logicalWidth = Math.max(1, fullGridWidth - outerCardInlineInset);
  const hasContainerHeader = section.kind === "container" && section.options.collapsible && section.options.showLabel;
  let headerInset = 0;
  if (hasContainerHeader && !collapsedSectionIds.has(section.id)) {
    headerInset = (CONTAINER_HEADER_HEIGHT * calculateBoardUiScale(canvasScale)) / parentContentScale;
  }
  let nestedHeaderInset = 0;
  if (
    section.kind === "container" &&
    (section.options.collapsible || (section.options.showLabel && section.options.title)) &&
    innerSections.some(
      (child) =>
        child.yOffset === 0 &&
        (child.options.collapsible || (child.options.showLabel && child.options.title)) &&
        (!hasContainerHeader || !child.options.collapsible || !child.options.showLabel),
    )
  ) {
    // Keep the extra gap whenever either adjacent header still floats over its border.
    nestedHeaderInset = (20 * calculateBoardUiScale(canvasScale)) / effectiveCanvasScale;
  }
  let viewportHeight = getLogicalGridSize(rowCount);
  let containerContentScale = 1;
  let rowScale = 1;
  if (section.kind === "container") {
    containerContentScale = Math.max(0.01, Math.min(logicalWidth / fullGridWidth, 1));
    const allocatedHeight = getLogicalGridSize(viewportRowCountOverride ?? Math.max(requestedRowCount, 1));
    nestedHeaderInset = Math.min(nestedHeaderInset, Math.max(0, allocatedHeight - outerCardInset - 1));
    viewportHeight = Math.max(1, allocatedHeight - outerCardInset - nestedHeaderInset - headerInset);
    // The saved height is the outer footprint. Only complete square rows fit inside
    // its header and insets; content-derived minimum sizes grow the parent if needed.
    const availableRows = Math.floor(viewportHeight / (LOGICAL_GRID_PITCH * containerContentScale));
    rowCount = Math.max(contentRowCount, availableRows, 1);
  } else if (isRail && railLogicalHeight > 0) {
    viewportHeight = railLogicalHeight;
    // Container minimum heights reserve space for square content before rail sizing.
    // Compressing their parent rows would remove that space again; let the rail scroll.
    if (rowCount <= railViewportRowCount && innerSections.length === 0) {
      rowScale = viewportHeight / getLogicalGridSize(rowCount);
    }
  }
  const fullGridHeight = getLogicalGridSize(rowCount);
  const maxRowCount = section.kind === "container" ? rowCount : null;
  const placementMaxRowCount = maxRowCount;
  const contentScale = parentContentScale * containerContentScale;
  const effectiveContentScale = effectiveCanvasScale * containerContentScale;
  // Compute the combined value in JS rather than a CSS calc() referencing the existing
  // --board-canvas-ui-scale: custom properties declared on the *same* element don't have a
  // sequential/temporal order the way normal variables do, so any calc() on this element that
  // both reads and writes --board-canvas-ui-scale (even indirectly, through another property)
  // is a circular reference - CSS invalidates the whole group rather than using "the old value",
  // silently breaking every icon/text/custom-CSS size that compensates off it for descendants.
  const combinedUiScale = calculateBoardUiScale(canvasScale) / contentScale;
  useLayoutEffect(() => {
    if (!hasLabeledCollapsibleChildren) return;
    // Convert the fixed header and visual insets into this grid's row units.
    setCollapsedRowsPerPixel(1 / (effectiveContentScale * LOGICAL_GRID_PITCH * rowScale));
  }, [effectiveContentScale, hasLabeledCollapsibleChildren, rowScale]);
  // A collapsed container's compact coordinates are display-only. Its own
  // nested grid stays inactive until an explicit edit interaction expands it.
  const isInteractionDisabled = section.kind === "container" && collapsedSectionIds.has(section.id);
  const canvasAttributes =
    isEditMode && !isInteractionDisabled
      ? getEditableCanvasAttributes({ label, columnCount, rowCount })
      : getReadonlyCanvasAttributes({ label });
  const editorClassName = combineClasses("board-grid-editor", classes.editorGrid);
  const expandCollapsedSectionsForPointerEdit = (event: PointerEvent<HTMLDivElement>) => {
    if (!isEditMode || directCollapsedIds.size === 0 || event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const entry = target.closest('[data-editor-grid-entry="true"]');
    if (!entry || !event.currentTarget.contains(entry)) return;
    if (!target.closest(".board-grid-resize-handle") && target.closest(INTERACTIVE_GRID_SELECTOR)) return;
    expandSectionsForEditing(directCollapsedIds);
  };
  const expandCollapsedSectionsForKeyboardEdit = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isEditMode || directCollapsedIds.size === 0 || !EDIT_ACTIVATION_KEYS.has(event.key)) return;
    const target = event.target;
    if (!(target instanceof Element) || !target.matches('[data-editor-grid-entry="true"]')) return;
    expandSectionsForEditing(directCollapsedIds);
  };

  useLayoutEffect(() => {
    const host = editorHostRef.current;
    if (!host) return;

    return editorRegistry.register({
      host,
      disabled: isInteractionDisabled,
      sectionId: section.id,
      section,
      items: displayedItems,
      innerSections: displayedInnerSections,
      columnCount,
      rowCount,
      maxRowCount,
      placementMaxRowCount,
      placements: displayPlacements,
      transactionPlacements: placements,
      className: editorClassName,
      entryElementStore,
    });
  }, [
    columnCount,
    displayPlacements,
    displayedInnerSections,
    displayedItems,
    editorClassName,
    editorRegistry,
    entryElementStore,
    isInteractionDisabled,
    maxRowCount,
    placementMaxRowCount,
    placements,
    rowCount,
    section,
  ]);

  const previousItemIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const currentIds = new Set([...items, ...innerSections].map((item) => item.id));
    const previousIds = previousItemIdsRef.current;
    const hasNewItem = previousIds !== null && [...currentIds].some((id) => !previousIds.has(id));
    previousItemIdsRef.current = currentIds;
    if (hasNewItem && isScrollableContainer) {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [innerSections, isScrollableContainer, items]);

  return (
    <SectionProvider
      value={{
        section,
        items: displayedItems,
        innerSections: displayedInnerSections,
        integrations,
        columnCount,
        maxRowCount,
        placements: displayPlacements,
        interactionDisabled: isInteractionDisabled,
        announce,
        entryElementStore,
      }}
    >
      <Box
        ref={viewportRef}
        {...canvasAttributes}
        className={combineClasses(classes.viewport, isScrollableContainer && classes.scrollableViewport, className)}
        style={
          {
            width: logicalWidth,
            marginTop: nestedHeaderInset,
            height: `var(--board-grid-drag-height, ${viewportHeight}px)`,
            "--board-item-radius": `var(--mantine-radius-${board.itemRadius})`,
            "--board-grid-content-scale": containerContentScale,
            "--board-grid-row-scale": rowScale,
            "--board-container-inset": `${CONTAINER_CARD_INSET / effectiveContentScale}px`,
          } as CSSProperties
        }
        data-section-id={section.id}
        suppressHydrationWarning
        data-section-kind={section.kind}
        data-rail-placement={railPlacement}
        data-scrollable={isScrollableContainer ? "true" : undefined}
        data-grid-interaction-disabled={isEditMode && isInteractionDisabled ? "true" : undefined}
        onPointerDownCapture={expandCollapsedSectionsForPointerEdit}
        onKeyDownCapture={expandCollapsedSectionsForKeyboardEdit}
      >
        <Box
          className={classes.staticGrid}
          style={
            {
              width: fullGridWidth,
              height: `calc(${fullGridHeight}px * var(--board-grid-row-scale, 1))`,
              zoom: containerContentScale,
              "--board-canvas-inverse-scale": 1 / effectiveContentScale,
              "--board-canvas-ui-scale": combinedUiScale,
            } as CSSProperties
          }
          data-grid-section-id={section.id}
          suppressHydrationWarning
          data-kind={section.kind}
          data-grid-editor-error={isEditMode && editorRuntimeStatus === "error" ? "true" : undefined}
        >
          <GridContentScaleContext.Provider value={contentScale}>
            <SectionContent />
          </GridContentScaleContext.Provider>
        </Box>
        <div ref={editorHostRef} className={classes.editorPortalHost} />
      </Box>
    </SectionProvider>
  );
};

const INTERACTIVE_GRID_SELECTOR =
  'a,button,input,textarea,select,option,[contenteditable="true"],[role="button"],[data-grid-no-drag]';
const EDIT_ACTIVATION_KEYS = new Set(["Enter", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

const useRailLogicalHeight = (viewportRef: RefObject<HTMLDivElement | null>, enabled: boolean, canvasScale: number) => {
  const [visualHeight, setVisualHeight] = useState(0);

  useLayoutEffect(() => {
    if (!enabled) return;
    const rail = viewportRef.current?.closest<HTMLElement>("[data-board-gutter]");
    if (!rail) return;

    const update = () => setVisualHeight(rail.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [enabled, viewportRef, canvasScale]);

  if (!enabled || canvasScale <= 0) return 0;
  return visualHeight / canvasScale;
};

const useMinimumViewportRowCount = (enabled: boolean, canvasScale: number) => {
  const [visualHeight, setVisualHeight] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      startTransition(() => {
        setVisualHeight(window.visualViewport?.height ?? window.innerHeight);
      });
    };
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

const containerMinimumSizeCache = new WeakMap<
  ReturnType<typeof useRequiredBoard>,
  Map<string, { canvasScale: number; sizes: ReadonlyMap<string, { width: number; height: number }> }>
>();

const getContainerMinimumSizes = (
  board: ReturnType<typeof useRequiredBoard>,
  layoutId: string,
  canvasScale: number,
) => {
  const cachedByLayout = containerMinimumSizeCache.get(board);
  const cached = cachedByLayout?.get(layoutId);
  if (cached?.canvasScale === canvasScale) return cached.sizes;

  const boardLayout = board.layouts.find((layout) => layout.id === layoutId);
  const directItemsBySectionId = new Map<string, PlacementBounds[]>();
  for (const item of board.items) {
    const layout = item.layouts.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) continue;
    const entries = directItemsBySectionId.get(layout.sectionId) ?? [];
    entries.push({ ...layout, id: item.id });
    directItemsBySectionId.set(layout.sectionId, entries);
  }

  const directSectionsBySectionId = new Map<string, ContainerSectionItem[]>();
  for (const section of board.sections) {
    if (section.kind !== "container") continue;
    const layout = section.layouts.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) continue;
    const entries = directSectionsBySectionId.get(layout.parentSectionId) ?? [];
    entries.push({ ...section, ...layout, type: "section" });
    directSectionsBySectionId.set(layout.parentSectionId, entries);
  }

  const minimumBySectionId = new Map<string, { width: number; height: number }>();
  const visiting = new Set<string>();
  const resolve = (
    section: ContainerSectionItem,
    parentContentScale = 1,
    inlineInsetCount = 2,
  ): { width: number; height: number } => {
    const existing = minimumBySectionId.get(section.id);
    if (existing) return existing;
    if (visiting.has(section.id)) return { width: 1, height: 1 };
    visiting.add(section.id);

    const effectiveScale = canvasScale * parentContentScale;
    const gridWidth = getLogicalGridSize(section.width);
    const inset = (inlineInsetCount * CONTAINER_CARD_INSET) / effectiveScale;
    const contentScale = Math.max(0.01, Math.min((gridWidth - inset) / gridWidth, 1));
    const innerSections = directSectionsBySectionId.get(section.id) ?? [];
    // A scrollable container isn't forced to grow with its content - it scrolls internally instead,
    // so it shouldn't have a content-derived height floor imposed by its parent's grid.
    const isScrollable = section.options.scrollable;

    const itemBounds = directItemsBySectionId.get(section.id) ?? [];
    const sectionBounds = innerSections.map((child) => {
      const minimum = resolve(child, parentContentScale * contentScale);
      return {
        ...child,
        width: Math.max(child.width, minimum.width),
        height: Math.max(child.height, minimum.height),
      };
    });
    const children = [...itemBounds, ...sectionBounds];
    const width = Math.max(1, ...children.map((child) => child.xOffset + child.width));
    const contentPlacements = getCollapsedDisplayLayout(
      children.map((child) => ({ id: child.id, x: child.xOffset, y: child.yOffset, w: child.width, h: child.height })),
      { columnCount: Math.max(width, section.width), collapsedItemIds: new Set() },
    );
    const contentRows = Math.max(1, getLayoutRowCount(contentPlacements));
    const hasHeader = section.options.collapsible && section.options.showLabel;
    let overhead = (2 * CONTAINER_CARD_INSET) / effectiveScale;
    if (hasHeader) overhead += (CONTAINER_HEADER_HEIGHT * calculateBoardUiScale(canvasScale)) / parentContentScale;
    if (
      (section.options.collapsible || (section.options.showLabel && section.options.title)) &&
      innerSections.some(
        (child) =>
          child.yOffset === 0 &&
          (child.options.collapsible || (child.options.showLabel && child.options.title)) &&
          (!hasHeader || !child.options.collapsible || !child.options.showLabel),
      )
    ) {
      overhead += (20 * calculateBoardUiScale(canvasScale)) / effectiveScale;
    }
    const minimum = {
      width,
      height: 1,
    };
    if (!isScrollable) {
      minimum.height = Math.ceil((getLogicalGridSize(contentRows) * contentScale + overhead) / LOGICAL_GRID_PITCH);
    }
    visiting.delete(section.id);
    minimumBySectionId.set(section.id, minimum);
    return minimum;
  };

  // Carry scale down the same traversal that resolves child sizes.
  for (const root of board.sections) {
    if (root.kind !== "empty") continue;
    for (const section of directSectionsBySectionId.get(root.id) ?? []) {
      let inlineInsetCount = 2;
      const lane = getRootSectionLane(root.xOffset);
      if (lane !== "main" && boardLayout) {
        if (section.xOffset === 0) inlineInsetCount -= 1;
        if (section.xOffset + section.width === getBoardLaneColumnCount(boardLayout, lane)) inlineInsetCount -= 1;
      }
      resolve(section, 1, inlineInsetCount);
    }
  }

  const nextByLayout = cachedByLayout ?? new Map();
  nextByLayout.set(layoutId, { canvasScale, sizes: minimumBySectionId });
  containerMinimumSizeCache.set(board, nextByLayout);
  return minimumBySectionId;
};

interface PlacementBounds {
  id: string;
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
