"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  const minimumViewportRowCount = useMinimumViewportRowCount(section.kind === "empty", canvasScale);
  const contentRowCount = Math.max(1, getLayoutRowCount(displayPlacements));
  const rowCount = Math.max(contentRowCount, requestedRowCount, minimumViewportRowCount);
  const maxRowCount = section.kind === "container" || railPlacement !== "main" ? rowCount : null;
  let placementMaxRowCount = maxRowCount;
  if (railPlacement !== "main") {
    placementMaxRowCount = minimumViewportRowCount;
  }
  // A scrollable container isn't forced to grow with its content - it scrolls internally instead
  // of expanding to fit every widget, so its viewport height is capped independently of rowCount.
  const isScrollableContainer = section.kind === "container" && section.options.scrollable;
  const viewportRowCount = isScrollableContainer ? Math.max(requestedRowCount, 1) : rowCount;
  // A container's own visible card is inset from its allocated board cell by the board's
  // standard per-item gap (see the base, non-container `.staticItem[data-type="item"] >
  // .contentMount` rule in section-grid.module.css - a container is placed as an "item" like
  // any widget, so it gets that same gap). A widget's content just fills whatever size its
  // card ends up being, but this SectionGrid instead computes its own fixed pixel size from
  // the same column/row counts used to allocate the *outer*, uninset cell - so without
  // subtracting that gap back out here, a container's inner grid renders larger than its own
  // card and visually spills past its right/bottom edges. 10 must match that CSS rule's inset.
  const effectiveCanvasScale = Number.isFinite(canvasScale) && canvasScale > 0 ? canvasScale : 1;
  const outerCardInset = section.kind === "container" ? (2 * 10) / effectiveCanvasScale : 0;
  // A collapsible container's toggle bar (see the `containerToggle` Button in
  // container-section.tsx) is an absolutely positioned overlay sitting on top of this grid.
  // Its height comes from a Mantine size prop, which - like spacing/font-size - is compensated
  // by --mantine-scale to render at a constant physical size regardless of board zoom (see
  // scaled-board-canvas.module.css). That makes it behave like the outerCardInset gap above,
  // not like the grid's own un-compensated logical-pixel math, so it needs the same
  // effectiveCanvasScale conversion - a plain, unconverted subtraction would under-reserve on
  // a zoomed-out board and leave the header overlapping the content. Without reserving it at
  // all, the header bar covers the first row of the container's content instead of sitting
  // above it. Only the vertical axis is affected - the toggle spans the full width already.
  const collapsibleHeaderInset =
    section.kind === "container" && section.options.collapsible
      ? CONTAINER_HEADER_HEIGHT / effectiveCanvasScale
      : 0;
  const logicalWidth = getLogicalGridSize(columnCount) - outerCardInset;
  const viewportHeight = Math.max(
    1,
    getLogicalGridSize(viewportRowCount) - outerCardInset - collapsibleHeaderInset,
  );
  // Items are positioned in a coordinate space sized to the *un-inset* column/row count
  // (fullGridWidth/Height below - see getLogicalItemStyle), but logicalWidth/Height above are
  // deliberately smaller by outerCardInset to match the container's actual visible card size.
  // Left alone, that mismatch means the items - not just the grid's own box - spill past the
  // card's right/bottom edge by exactly that inset. Scale the grid's content down by the same
  // ratio the board's own canvas uses for its whole-board zoom (see ScaledBoardCanvas), just one
  // level deeper, so it fits the actual card instead of clipping. --board-canvas-ui-scale is
  // corrected to compensate so icon/text sizing inside the container isn't affected.
  const fullGridWidth = getLogicalGridSize(columnCount);
  const fullGridHeight = getLogicalGridSize(rowCount);
  // For a scrollable container, rowCount covers *all* content rows, not just the visible card -
  // fullGridHeight grows right along with it, so a ratio built from it drifts toward 1 as content
  // grows regardless of the (fixed) inset, under-scaling relative to what the actually-visible
  // viewport needs and clipping the bottom of the visible rows. viewportHeight/viewportRowCount
  // describe the real visible card size in both cases (they equal the non-scrollable values when
  // rowCount and viewportRowCount are the same), so use those instead.
  const fullViewportHeight = getLogicalGridSize(viewportRowCount);
  // A uniform zoom is required (not a non-uniform transform scale(x, y)) - --board-canvas-ui-scale
  // is a single scalar that every icon/text/custom-CSS size compensation in the app multiplies
  // by, so a non-uniform stretch can never be captured by it correctly. That means one axis can
  // be left with a small amount of unfilled slack when width/height need different ratios to
  // exactly fit - centered below so it's even on both sides rather than left-aligned.
  // logicalWidth/viewportHeight can go non-positive for a narrow (e.g. single-column) container
  // on a heavily zoomed-out board, where outerCardInset (which grows as canvasScale shrinks) can
  // exceed the container's own un-inset size. Floor the scale well above 0 so it can never reach
  // zero or negative - combinedUiScale divides by this value, and this value is also used as
  // zoom directly, both of which break (Infinity/NaN, or invalid/collapsed content) otherwise.
  const containerContentScale =
    section.kind === "container" && fullGridWidth > 0 && fullViewportHeight > 0
      ? Math.max(0.01, Math.min(logicalWidth / fullGridWidth, viewportHeight / fullViewportHeight, 1))
      : 1;
  // Compute the combined value in JS rather than a CSS calc() referencing the existing
  // --board-canvas-ui-scale: custom properties declared on the *same* element don't have a
  // sequential/temporal order the way normal variables do, so any calc() on this element that
  // both reads and writes --board-canvas-ui-scale (even indirectly, through another property)
  // is a circular reference - CSS invalidates the whole group rather than using "the old value",
  // silently breaking every icon/text/custom-CSS size that compensates off it for descendants.
  const combinedUiScale = calculateBoardUiScale(canvasScale) / containerContentScale;
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

  const viewportRef = useRef<HTMLDivElement>(null);
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
            marginTop: collapsibleHeaderInset || undefined,
            "--board-item-radius": `var(--mantine-radius-${board.itemRadius})`,
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
              height: fullGridHeight,
              zoom: containerContentScale,
              margin: containerContentScale < 1 ? "0 auto" : undefined,
              ...(containerContentScale < 1 ? { "--board-canvas-ui-scale": combinedUiScale } : {}),
            } as CSSProperties
          }
          data-grid-section-id={section.id}
          data-kind={section.kind}
          data-grid-editor-error={isEditMode && editorRuntimeStatus === "error" ? "true" : undefined}
        >
          <SectionContent />
        </Box>
        <div ref={editorHostRef} className={classes.editorPortalHost} />
      </Box>
    </SectionProvider>
  );
};

// Matches the collapsible container toggle's h={24} in container-section.tsx.
const CONTAINER_HEADER_HEIGHT = 24;

const INTERACTIVE_GRID_SELECTOR =
  'a,button,input,textarea,select,option,[contenteditable="true"],[role="button"],[data-grid-no-drag]';
const EDIT_ACTIVATION_KEYS = new Set(["Enter", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

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
