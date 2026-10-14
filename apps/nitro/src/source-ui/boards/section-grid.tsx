import type { CSSProperties, KeyboardEvent, PointerEvent, RefObject } from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mantine/core";
import combineClasses from "clsx";
import type { BoardRoot } from "../../features/boards/contracts";
import { getBoardAccess } from "../../features/boards/contracts";
import { getContainerMinimum } from "../../features/boards/draft";
import {
  getCollapsedDisplayLayout,
  getEditableCanvasAttributes,
  getGridRowCountForVisualHeight,
  getLayoutRowCount,
  getLogicalGridSize,
  getReadonlyCanvasAttributes,
  normalizeGridPlacement,
} from "./layout";
import { calculateBoardUiScale, useBoardCanvasScale } from "./scaled-board-canvas";
import { createGridEntryElementStore, useGridEditorRegistry } from "./grid-editor-registry";
import type { ContainerSectionItem, SectionGridPlacement } from "./runtime";
import { getSectionItems, SectionProvider, useBoardRuntime } from "./runtime";
import { FixedGridItem } from "./fixed-grid-item";
import { BoardContainerSection } from "./container-section";
import classes from "./section-grid.module.css";

const GridContentScaleContext = createContext(1);
const GridRowScaleContext = createContext(1);
const CONTAINER_CARD_INSET = 5;
interface SectionGridProps {
  section: BoardRoot | ContainerSectionItem;
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
  const runtime = useBoardRuntime();
  const {
    board,
    layout,
    announce,
    collapsedIds: collapsedSectionIds,
    expandSections: expandSectionsForEditing,
  } = runtime;
  const isEditMode = runtime.editing === true;
  const canvasScale = useBoardCanvasScale();
  const parentContentScale = useContext(GridContentScaleContext);
  const parentRowScale = useContext(GridRowScaleContext);
  const editorRegistry = useGridEditorRegistry();
  const editorHostRef = useRef<HTMLDivElement>(null);
  const [entryElementStore] = useState(createGridEntryElementStore);
  const { items, innerSections } = useMemo(
    () => getSectionItems(board, layout.id, section.id),
    [board, layout.id, section.id],
  );
  const minimumBySectionId = useMemo(
    () =>
      new Map(
        innerSections.map((innerSection) => [innerSection.id, getContainerMinimum(board, innerSection.id, layout.id)]),
      ),
    [board, layout.id, innerSections],
  );
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
  const displayPlacements = useMemo(
    () =>
      directCollapsedIds.size === 0
        ? placements
        : getCollapsedDisplayLayout(placements, { columnCount, collapsedItemIds: directCollapsedIds }),
    [columnCount, directCollapsedIds, placements],
  );
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
  const railViewportRowCount = getGridRowCountForVisualHeight(railLogicalHeight, 1);
  let rowCount = Math.max(contentRowCount, requestedRowCount, minimumViewportRowCount);
  if (isRail) rowCount = Math.max(railViewportRowCount, contentRowCount);
  const maxRowCount = section.kind === "container" ? rowCount : null;
  const placementMaxRowCount = maxRowCount;
  const isScrollableContainer = section.kind === "container" && section.options.scrollable;
  const viewportRowCount =
    viewportRowCountOverride ?? (isScrollableContainer ? Math.max(requestedRowCount, 1) : rowCount);
  const parentScale = canvasScale * parentContentScale;
  const effectiveCanvasScale = Number.isFinite(parentScale) && parentScale > 0 ? parentScale : 1;
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
  if (isRail && railLogicalHeight > 0) allocatedViewportHeight = railLogicalHeight;
  else if (section.kind === "container") allocatedViewportHeight *= parentRowScale;
  const logicalWidth = Math.max(1, fullGridWidth - outerCardInlineInset);
  let nestedHeaderInset = 0;
  if (
    section.kind === "container" &&
    (section.options.collapsible || (section.options.showLabel && section.options.title)) &&
    innerSections.some(
      (child) => child.yOffset === 0 && (child.options.collapsible || (child.options.showLabel && child.options.title)),
    )
  )
    nestedHeaderInset = (20 * calculateBoardUiScale(canvasScale)) / effectiveCanvasScale;
  nestedHeaderInset = Math.min(nestedHeaderInset, Math.max(0, allocatedViewportHeight - outerCardInset - 1));
  const viewportHeight = Math.max(1, allocatedViewportHeight - outerCardInset - nestedHeaderInset);
  let containerContentScale = 1;
  let rowScale = 1;
  if (section.kind === "container" && fullGridWidth > 0 && fullViewportHeight > 0) {
    containerContentScale = Math.max(0.01, Math.min(logicalWidth / fullGridWidth, 1));
    rowScale = Math.max(0.01, viewportHeight / (fullViewportHeight * containerContentScale));
  } else if (isRail && railLogicalHeight > 0 && rowCount <= railViewportRowCount)
    rowScale = viewportHeight / fullViewportHeight;
  const contentScale = parentContentScale * containerContentScale;
  const effectiveContentScale = effectiveCanvasScale * containerContentScale;
  const combinedUiScale = calculateBoardUiScale(canvasScale) / contentScale;
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
    if (hasNewItem && isScrollableContainer)
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" });
  }, [innerSections, isScrollableContainer, items]);
  const sortedItems = useMemo(
    () =>
      [...displayedItems, ...displayedInnerSections].toSorted(
        (first, second) => first.yOffset - second.yOffset || first.xOffset - second.xOffset,
      ),
    [displayedItems, displayedInnerSections],
  );
  return (
    <SectionProvider
      value={{
        section,
        items: displayedItems,
        innerSections: displayedInnerSections,
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
        >
          <GridContentScaleContext.Provider value={contentScale}>
            <GridRowScaleContext.Provider value={rowScale}>
              {sortedItems.map((item) => (
                <FixedGridItem
                  key={item.id}
                  item={item}
                  minWidth={minimumBySectionId.get(item.id)?.width}
                  minHeight={minimumBySectionId.get(item.id)?.height}
                >
                  {item.type === "section" ? (
                    <BoardContainerSection section={item} />
                  ) : (
                    runtime.renderItem(board.items.find((candidate) => candidate.id === item.id) ?? item, {
                      board,
                      layoutId: layout.id,
                      editing: isEditMode,
                      canModify: getBoardAccess(board, runtime.identity).modify,
                    })
                  )}
                </FixedGridItem>
              ))}
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
const withPlacement = <TItem extends { id: string; xOffset: number; yOffset: number; width: number; height: number }>(
  item: TItem,
  placement: SectionGridPlacement | undefined,
): TItem => {
  if (!placement) return item;
  return { ...item, xOffset: placement.x, yOffset: placement.y, width: placement.w, height: placement.h };
};
