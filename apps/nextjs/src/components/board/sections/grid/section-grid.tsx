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
import { getContainerMinimumSizes } from "@homarr/boards/layout-data";

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
import { CONTAINER_CARD_INSET, getContainerGridMetrics, getContainerGridMinimumHeights } from "./container-grid-sizing";
import { createGridRowProjection } from "./grid-row-projection";
import classes from "./section-grid.module.css";

const GridContentScaleContext = createContext(1);

interface SectionGridProps {
  section: Exclude<Section, { kind: "container" }> | ContainerSectionItem;
  columnCount: number;
  requestedRowCount?: number;
  viewportRowCountOverride?: number;
  containerInlineInsetCount?: number;
  containerBlockInsetCount?: number;
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
  containerBlockInsetCount = 2,
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
  const minimumBySectionId = useMemo(() => getContainerMinimumSizes(board, currentLayoutId), [board, currentLayoutId]);
  const minimumDisplayHeights = useMemo(
    () => getContainerGridMinimumHeights(board, currentLayoutId, canvasScale, collapsedSectionIds),
    [board, currentLayoutId, canvasScale, collapsedSectionIds],
  );

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
  const collapsedPlacements = useMemo(() => {
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

  const displayHeights = useMemo(
    () =>
      new Map(
        innerSections
          .filter((child) => !directCollapsedIds.has(child.id))
          .map((child) => [child.id, minimumDisplayHeights.get(child.id) ?? child.height]),
      ),
    [innerSections, minimumDisplayHeights, directCollapsedIds],
  );
  const rowProjection = useMemo(
    () => createGridRowProjection(collapsedPlacements, displayHeights),
    [collapsedPlacements, displayHeights],
  );
  const displayPlacements = rowProjection.placements;
  const displayPlacementById = useMemo(
    () => new Map(displayPlacements.map((placement) => [placement.id, placement])),
    [displayPlacements],
  );

  const placementById = useMemo(() => new Map(placements.map((placement) => [placement.id, placement])), [placements]);
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
  const contentRowCount = Math.max(1, getLayoutRowCount(collapsedPlacements));
  const railViewportRowCount = getGridRowCountForVisualHeight(railLogicalHeight, 1);
  let rowCount = Math.max(contentRowCount, requestedRowCount, minimumViewportRowCount);
  if (isRail) {
    rowCount = Math.max(railViewportRowCount, contentRowCount);
  }
  if (isEditMode && section.kind !== "container") {
    rowCount = Math.max(rowCount, contentRowCount + 1);
  }
  // A scrollable container isn't forced to grow with its content - it scrolls internally instead
  // of expanding to fit every widget, so its viewport height is capped independently of rowCount.
  const isScrollableContainer = section.kind === "container" && section.options.scrollable;
  const parentScale = canvasScale * parentContentScale;
  const effectiveCanvasScale = Number.isFinite(parentScale) && parentScale > 0 ? parentScale : 1;
  const fullGridWidth = getLogicalGridSize(columnCount);
  let logicalWidth = fullGridWidth;
  let nestedHeaderInset = 0;
  let containerContentScale = 1;
  let rowScale = 1;
  let viewportHeight = getLogicalGridSize(rowProjection.getDisplayRow(rowCount));
  if (section.kind === "container") {
    const metrics = getContainerGridMetrics({
      section,
      innerSections,
      canvasScale,
      parentContentScale,
      inlineInsetCount: containerInlineInsetCount,
      blockInsetCount: containerBlockInsetCount,
      collapsed: collapsedSectionIds.has(section.id),
    });
    logicalWidth = metrics.logicalWidth;
    containerContentScale = metrics.contentScale;
    nestedHeaderInset = metrics.nestedHeaderInset;
    const allocatedHeight = getLogicalGridSize(viewportRowCountOverride ?? Math.max(requestedRowCount, 1));
    viewportHeight = Math.max(1, allocatedHeight - metrics.overhead);
    if (!isScrollableContainer) {
      viewportHeight = Math.max(
        viewportHeight,
        getLogicalGridSize(rowProjection.getDisplayRow(rowCount)) * containerContentScale,
      );
    }
  } else if (isRail && railLogicalHeight > 0) {
    viewportHeight = railLogicalHeight;
    if (rowCount <= railViewportRowCount && innerSections.length === 0) {
      rowScale = viewportHeight / getLogicalGridSize(rowCount);
    }
  }
  const fullGridHeight = getLogicalGridSize(rowProjection.getDisplayRow(rowCount));
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
      placements: collapsedPlacements,
      minimumDisplayHeights: displayHeights,
      canvasScale,
      transactionPlacements: placements,
      className: editorClassName,
      entryElementStore,
    });
  }, [
    canvasScale,
    columnCount,
    displayPlacements,
    displayHeights,
    collapsedPlacements,
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
        placements,
        displayPlacementById,
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
            "--board-item-radius": `var(--mantine-radius-${board.itemRadius ?? "default"})`,
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
  if (
    item.xOffset === placement.x &&
    item.yOffset === placement.y &&
    item.width === placement.w &&
    item.height === placement.h
  ) {
    return item;
  }
  return {
    ...item,
    xOffset: placement.x,
    yOffset: placement.y,
    width: placement.w,
    height: placement.h,
  };
};
