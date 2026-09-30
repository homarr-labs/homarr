"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent, RefObject } from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mantine/core";
import combineClasses from "clsx";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";

import type { ContainerSectionItem, Section } from "~/app/[locale]/boards/_types";
import {
  getCollapsedDisplayLayout,
  getEditableCanvasAttributes,
  getGridRowCountForVisualHeight,
  getLayoutRowCount,
  getLogicalGridSize,
  getReadonlyCanvasAttributes,
  normalizeGridPlacement,
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
const GridRowScaleContext = createContext(1);
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
  const parentRowScale = useContext(GridRowScaleContext);
  const editorRuntimeStatus = useGridEditorRuntimeStatus();
  const editorRegistry = useGridEditorRegistry();
  const editorHostRef = useRef<HTMLDivElement>(null);
  const [entryElementStore] = useState(createGridEntryElementStore);
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const { items, innerSections } = useSectionItems(section.id);
  const { announce, integrations } = useBoardGridPortalHost();
  const collapsedSectionIds = useCollapsedSectionIds();
  const expandSectionsForEditing = useExpandSectionsForEditing();
  const minimumBySectionId = useMemo(() => {
    const minimumSizes = getContainerMinimumSizes(board, currentLayoutId);
    return new Map(innerSections.map((innerSection) => [innerSection.id, minimumSizes.get(innerSection.id)]));
  }, [board, currentLayoutId, innerSections]);

  const placements = useMemo(
    () =>
      [...items, ...innerSections].map((item): SectionGridPlacement => {
        const minimum = item.type === "section" ? minimumBySectionId.get(item.id) : undefined;
        const isNonScrollableContainer = item.type === "section" && !item.options.scrollable;
        const height = isNonScrollableContainer && minimum ? Math.max(item.height, minimum.height) : item.height;
        return normalizeGridPlacement(
          {
            id: item.id,
            type: item.type,
            x: item.xOffset,
            y: item.yOffset,
            w: item.width,
            h: height,
            minW: minimum?.width,
            minH: minimum?.height,
          },
          columnCount,
        );
      }),
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

    return getCollapsedDisplayLayout(placements, {
      columnCount,
      collapsedItemIds: directCollapsedIds,
    });
  }, [columnCount, directCollapsedIds, placements]);

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
  const minimumViewportRowCount = useMinimumViewportRowCount(section.kind === "empty", canvasScale);
  const contentRowCount = Math.max(1, getLayoutRowCount(displayPlacements));
  const railBaselineRef = useRef({ key: "", rowCount: 1 });
  const railBaselineKey = `${section.id}:${currentLayoutId}`;
  if (railBaselineRef.current.key !== railBaselineKey) {
    railBaselineRef.current = { key: railBaselineKey, rowCount: Math.max(1, getLayoutRowCount(placements)) };
  }
  const railViewportRowCount = getGridRowCountForVisualHeight(railLogicalHeight, 1);
  let rowCount = Math.max(contentRowCount, requestedRowCount, minimumViewportRowCount);
  if (isRail) {
    // Existing taller rails remain scrollable, but collision pushes cannot grow this cap.
    rowCount = Math.max(railViewportRowCount, railBaselineRef.current.rowCount);
  }
  const maxRowCount = section.kind === "container" || isRail ? rowCount : null;
  const placementMaxRowCount = maxRowCount;
  // A scrollable container isn't forced to grow with its content - it scrolls internally instead
  // of expanding to fit every widget, so its viewport height is capped independently of rowCount.
  const isScrollableContainer = section.kind === "container" && section.options.scrollable;
  const viewportRowCount =
    viewportRowCountOverride ?? (isScrollableContainer ? Math.max(requestedRowCount, 1) : rowCount);
  const parentScale = canvasScale * parentContentScale;
  const effectiveCanvasScale = Number.isFinite(parentScale) && parentScale > 0 ? parentScale : 1;
  // Match the card's inset without changing its persisted grid footprint. Include ancestor
  // container zoom so equally sized nested containers keep distinct borders at every depth.
  let outerCardInset = 0;
  let outerCardInlineInset = 0;
  if (section.kind === "container") {
    outerCardInset = (2 * CONTAINER_CARD_INSET) / effectiveCanvasScale;
    outerCardInlineInset = (containerInlineInsetCount * CONTAINER_CARD_INSET) / effectiveCanvasScale;
  }
  const fullGridWidth = getLogicalGridSize(columnCount);
  const fullGridHeight = getLogicalGridSize(rowCount);
  const fullViewportHeight = getLogicalGridSize(viewportRowCount);
  let allocatedViewportHeight = fullViewportHeight;
  if (isRail && railLogicalHeight > 0) {
    allocatedViewportHeight = railLogicalHeight;
  } else if (section.kind === "container") {
    allocatedViewportHeight *= parentRowScale;
  }
  const logicalWidth = Math.max(1, fullGridWidth - outerCardInlineInset);
  const viewportHeight = Math.max(1, allocatedViewportHeight - outerCardInset);
  // Fit columns to the card width. Rows fit the available height independently
  // without creating horizontal gutters or distorting text and icons.
  let containerContentScale = 1;
  let rowScale = 1;
  if (section.kind === "container" && fullGridWidth > 0 && fullViewportHeight > 0) {
    containerContentScale = Math.max(0.01, Math.min(logicalWidth / fullGridWidth, 1));
    rowScale = Math.max(0.01, viewportHeight / (fullViewportHeight * containerContentScale));
  } else if (isRail && railLogicalHeight > 0 && rowCount <= railViewportRowCount) {
    rowScale = viewportHeight / fullViewportHeight;
  }
  const contentScale = parentContentScale * containerContentScale;
  const effectiveContentScale = effectiveCanvasScale * containerContentScale;
  // Compute the combined value in JS rather than a CSS calc() referencing the existing
  // --board-canvas-ui-scale: custom properties declared on the *same* element don't have a
  // sequential/temporal order the way normal variables do, so any calc() on this element that
  // both reads and writes --board-canvas-ui-scale (even indirectly, through another property)
  // is a circular reference - CSS invalidates the whole group rather than using "the old value",
  // silently breaking every icon/text/custom-CSS size that compensates off it for descendants.
  const combinedUiScale = calculateBoardUiScale(canvasScale) / contentScale;
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
            height: `var(--board-grid-drag-height, ${viewportHeight}px)`,
            "--board-item-radius": `var(--mantine-radius-${board.itemRadius})`,
            "--board-grid-content-scale": containerContentScale,
            "--board-grid-row-scale": rowScale,
            "--board-container-inset": `${CONTAINER_CARD_INSET / effectiveContentScale}px`,
          } as CSSProperties
        }
        data-section-id={section.id}
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
          data-kind={section.kind}
          data-grid-editor-error={isEditMode && editorRuntimeStatus === "error" ? "true" : undefined}
        >
          <GridContentScaleContext.Provider value={contentScale}>
            <GridRowScaleContext.Provider value={rowScale}>
              <SectionContent />
            </GridRowScaleContext.Provider>
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

const containerMinimumSizeCache = new WeakMap<
  ReturnType<typeof useRequiredBoard>,
  Map<string, ReadonlyMap<string, { width: number; height: number }>>
>();

const getContainerMinimumSizes = (board: ReturnType<typeof useRequiredBoard>, layoutId: string) => {
  const cachedByLayout = containerMinimumSizeCache.get(board);
  const cached = cachedByLayout?.get(layoutId);
  if (cached) return cached;

  const directItemsBySectionId = new Map<string, PlacementBounds[]>();
  for (const item of board.items) {
    const layout = item.layouts.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) continue;
    const entries = directItemsBySectionId.get(layout.sectionId) ?? [];
    entries.push(layout);
    directItemsBySectionId.set(layout.sectionId, entries);
  }

  const directSectionsBySectionId = new Map<string, { id: string; placement: PlacementBounds }[]>();
  for (const section of board.sections) {
    if (section.kind !== "container") continue;
    const layout = section.layouts.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) continue;
    const entries = directSectionsBySectionId.get(layout.parentSectionId) ?? [];
    entries.push({ id: section.id, placement: layout });
    directSectionsBySectionId.set(layout.parentSectionId, entries);
  }

  const minimumBySectionId = new Map<string, { width: number; height: number }>();
  const visiting = new Set<string>();
  const resolve = (sectionId: string): { width: number; height: number } => {
    const existing = minimumBySectionId.get(sectionId);
    if (existing) return existing;
    if (visiting.has(sectionId)) return { width: 1, height: 1 };
    visiting.add(sectionId);

    const section = board.sections.find((candidate) => candidate.id === sectionId);
    // A scrollable container isn't forced to grow with its content - it scrolls internally instead,
    // so it shouldn't have a content-derived height floor imposed by its parent's grid.
    const isScrollable = section?.kind === "container" && section.options.scrollable;

    const itemBounds = directItemsBySectionId.get(sectionId) ?? [];
    const sectionBounds = (directSectionsBySectionId.get(sectionId) ?? []).map(({ id, placement }) => {
      const minimum = resolve(id);
      return {
        ...placement,
        width: Math.max(placement.width, minimum.width),
        height: Math.max(placement.height, minimum.height),
      };
    });
    const children = [...itemBounds, ...sectionBounds];
    const minimum = {
      width: Math.max(1, ...children.map((child) => child.xOffset + child.width)),
      height: isScrollable ? 1 : Math.max(1, ...children.map((child) => child.yOffset + child.height)),
    };
    visiting.delete(sectionId);
    minimumBySectionId.set(sectionId, minimum);
    return minimum;
  };

  for (const section of board.sections) {
    if (section.kind === "container") resolve(section.id);
  }

  const nextByLayout = cachedByLayout ?? new Map();
  nextByLayout.set(layoutId, minimumBySectionId);
  containerMinimumSizeCache.set(board, nextByLayout);
  return minimumBySectionId;
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
