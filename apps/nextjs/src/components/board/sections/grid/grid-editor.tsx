"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import "./grid-editor.css"; // oxlint-disable-line import/no-unassigned-import

import type { Draggable as AbstractDraggable, Plugins } from "@dnd-kit/abstract";
import { CollisionPriority } from "@dnd-kit/abstract";
import { pointerIntersection } from "@dnd-kit/collision";
import type { DragDropManager, Draggable as DomDraggable } from "@dnd-kit/dom";
import { Accessibility, AutoScroller, Feedback, PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { getEventCoordinates, getFrameTransform, isPointerEvent } from "@dnd-kit/dom/utilities";
import type {
  BeforeDragStartEvent,
  CollisionEvent,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/react";
import { DragDropProvider, DragOverlay, useDragDropManager, useDraggable, useDroppable } from "@dnd-kit/react";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";

import {
  getLayoutRowCount,
  getLogicalItemStyle,
  getLogicalTrackSize,
  LOGICAL_GRID_PITCH,
} from "~/components/board/layout";
import type { GridPlacement } from "~/components/board/layout";
import { useSectionContext } from "../section-context";
import {
  beginGridTransaction,
  cancelGridTransaction,
  commitGridTransaction,
  getPreferredNestedExitTargetId,
  getPointerProjectedShape,
  getSnappedGridCoordinates,
  getSnappedGridDelta,
  previewGridMove,
  previewGridResize,
} from "./dnd";
import type { DragProjectionOrigin, GridResizeDirection, GridTransaction, TransactionalGridState } from "./dnd";
import { getGridDepth } from "./grid-depth";
import { GridResizePreviewProvider } from "./grid-editor-runtime";
import { useBoardGridPortalHost } from "./grid-portal-host";
import type { CommitSectionGridInput, SectionGridPlacement } from "./use-grid-layout-actions";
import { useGridLayoutActions } from "./use-grid-layout-actions";

const GRID_ENTRY_TYPE = "homarr-board-grid-entry";
const GRID_TARGET_TYPE = "homarr-board-grid-target";

interface GridEditorProps {
  sectionId: string;
  columnCount: number;
  rowCount: number;
  placements: readonly SectionGridPlacement[];
  className: string;
}

interface GridEntryData {
  kind: typeof GRID_ENTRY_TYPE;
  sectionId: string;
  placement: SectionGridPlacement;
  label: string;
}

interface GridTargetData {
  kind: typeof GRID_TARGET_TYPE;
  sectionId: string;
}

interface RegisteredGrid {
  id: string;
  columnCount: number;
  maxRowCount: number | null;
  parentGridId: string | null;
  ownerPlacementId: string | null;
  placements: readonly SectionGridPlacement[];
  depth: number;
  element: HTMLElement;
}

interface GridInteraction {
  activeId: string;
  sourceGridId: string;
  targetGridId: string | null;
  targetPlacement: SectionGridPlacement | null;
  state: TransactionalGridState<SectionGridPlacement>;
  mode: "drag" | "resize";
  valid: boolean;
  previewRevision: number;
}

interface ActiveTransaction {
  transaction: GridTransaction<SectionGridPlacement>;
  label: string;
  mode: "drag" | "resize";
  valid: boolean;
  targetGridId: string | null;
  dragProjection: DragProjectionOrigin | null;
  lastProcessedPointer: { x: number; y: number } | null;
  lastPreviewKey: string | null;
  previewRevision: number;
}

interface ResizeStartInput {
  activeId: string;
  sourceGridId: string;
  label: string;
}

interface ResizePreviewInput {
  direction: GridResizeDirection;
  deltaColumns: number;
  deltaRows: number;
  minWidth: number;
  minHeight: number;
}

interface BoardGridEditorContextValue {
  interaction: GridInteraction | null;
  registerGrid: (grid: RegisteredGrid) => () => void;
  getDepth: (gridId: string) => number;
  isDropTargetEligible: (source: AbstractDraggable, targetGridId: string) => boolean;
  canAcceptDrop: (source: AbstractDraggable, targetGridId: string) => boolean;
  beginResize: (input: ResizeStartInput) => boolean;
  previewResize: (input: ResizePreviewInput) => boolean;
  completeResize: () => void;
  cancelResize: () => void;
}

const BoardGridEditorContext = createContext<BoardGridEditorContextValue | null>(null);

const useBoardGridEditor = () => {
  const value = useContext(BoardGridEditorContext);
  if (!value) throw new Error("BoardGridEditorProvider is required");
  return value;
};

/** One provider coordinates every root and nested grid on the board. */
export const BoardGridEditorProvider = ({ children }: PropsWithChildren) => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const t = useI18n();
  const { announce } = useBoardGridPortalHost();
  const { commitSectionGrids } = useGridLayoutActions();
  const gridsRef = useRef<Map<string, RegisteredGrid>>(new Map());
  const activeRef = useRef<ActiveTransaction | null>(null);
  const renderedInteractionRef = useRef<GridInteraction | null>(null);
  const collisionFrameRef = useRef(0);
  const [interaction, setInteraction] = useState<GridInteraction | null>(null);
  const [overlayZoom, setOverlayZoom] = useState(1);
  const parentGridById = useMemo(
    () =>
      new Map<string, string | null>(
        board.sections.map((section): [string, string | null] => [
          section.id,
          section.kind === "container"
            ? (section.layouts.find((layout) => layout.layoutId === currentLayoutId)?.parentSectionId ?? null)
            : null,
        ]),
      ),
    [board.sections, currentLayoutId],
  );
  const getDepth = useCallback((gridId: string) => getGridDepth(gridId, parentGridById), [parentGridById]);

  const clearInteraction = useCallback(() => {
    window.cancelAnimationFrame(collisionFrameRef.current);
    collisionFrameRef.current = 0;
    activeRef.current = null;
    renderedInteractionRef.current = null;
    setInteraction(null);
    document.body.removeAttribute("data-board-grid-interacting");
  }, []);

  useLayoutEffect(() => {
    const active = activeRef.current;
    renderedInteractionRef.current =
      interaction &&
      active &&
      interaction.mode === active.mode &&
      interaction.activeId === active.transaction.activeId &&
      interaction.sourceGridId === active.transaction.sourceGridId
        ? interaction
        : null;
  }, [interaction]);

  useEffect(() => clearInteraction, [clearInteraction, currentLayoutId]);

  const registerGrid = useCallback((grid: RegisteredGrid) => {
    gridsRef.current.set(grid.id, grid);
    return () => {
      if (gridsRef.current.get(grid.id) === grid) gridsRef.current.delete(grid.id);
    };
  }, []);

  const getCurrentState = useCallback(
    (): TransactionalGridState<SectionGridPlacement> => ({
      grids: Array.from(gridsRef.current.values(), (grid) => ({
        id: grid.id,
        columnCount: grid.columnCount,
        maxRowCount: grid.maxRowCount,
        parentGridId: grid.parentGridId,
        ownerPlacementId: grid.ownerPlacementId,
        placements: grid.placements,
      })),
    }),
    [],
  );

  const isDropTargetEligible = useCallback((source: AbstractDraggable, targetGridId: string) => {
    const data = getGridEntryData(source);
    const target = gridsRef.current.get(targetGridId);
    if (!data || !target) return false;

    let current: RegisteredGrid | undefined = target;
    const visited = new Set<string>();
    while (current) {
      if (current.ownerPlacementId === data.placement.id) return false;
      if (!current.parentGridId || visited.has(current.id)) break;
      visited.add(current.id);
      current = gridsRef.current.get(current.parentGridId);
    }
    return true;
  }, []);

  const canAcceptDrop = useCallback(
    (source: AbstractDraggable, targetGridId: string) => {
      const data = getGridEntryData(source);
      const target = gridsRef.current.get(targetGridId);
      if (!data || !target || !isDropTargetEligible(source, targetGridId)) return false;
      if (data.placement.w > target.columnCount) return false;
      return target.maxRowCount === null || data.placement.h <= target.maxRowCount;
    },
    [isDropTargetEligible],
  );

  const beginTransaction = useCallback(
    (
      activeId: string,
      sourceGridId: string,
      mode: ActiveTransaction["mode"],
      label: string,
      dragProjection: DragProjectionOrigin | null = null,
    ) => {
      if (activeRef.current) return false;
      try {
        const transaction = beginGridTransaction(getCurrentState(), { activeId, sourceGridId });
        activeRef.current = {
          transaction,
          label,
          mode,
          valid: mode === "resize",
          targetGridId: mode === "resize" ? sourceGridId : null,
          dragProjection,
          lastProcessedPointer: null,
          lastPreviewKey: null,
          previewRevision: 0,
        };
        document.body.setAttribute("data-board-grid-interacting", mode);
        setInteraction({
          activeId,
          sourceGridId,
          targetGridId: mode === "resize" ? sourceGridId : null,
          targetPlacement: null,
          state: transaction.snapshot,
          mode,
          valid: mode === "resize",
          previewRevision: 0,
        });
        announce(`${label}: ${t("item.action.moveResize")}`);
        return true;
      } catch {
        clearInteraction();
        return false;
      }
    },
    [announce, clearInteraction, getCurrentState, t],
  );

  const updateDragPreview = useCallback(
    (
      operation: DragMoveEvent["operation"],
      projectedShape?: { left: number; top: number; width: number; height: number },
      targetOverride?: RegisteredGrid | null,
    ) => {
      const active = activeRef.current;
      const source = operation.source;
      if (!active || active.mode !== "drag") return;

      const publishPreview = (preview: Omit<GridInteraction, "previewRevision">) => {
        active.previewRevision += 1;
        setInteraction({ ...preview, previewRevision: active.previewRevision });
      };

      const showInvalidPreview = (targetGridId: string | null, previewKey: string) => {
        if (!active.valid && active.targetGridId === targetGridId && active.lastPreviewKey === previewKey) return;
        active.valid = false;
        active.targetGridId = targetGridId;
        active.lastPreviewKey = previewKey;
        publishPreview({
          activeId: active.transaction.activeId,
          sourceGridId: active.transaction.sourceGridId,
          targetGridId,
          targetPlacement: null,
          state: cancelGridTransaction(active.transaction),
          mode: "drag",
          valid: false,
        });
      };

      if (!source) {
        showInvalidPreview(null, "invalid:no-target");
        return;
      }

      const sourceData = getGridEntryData(source);
      const shape = projectedShape ?? operation.shape?.current.boundingRectangle;
      if (!sourceData || !shape) {
        showInvalidPreview(null, "invalid:shape");
        return;
      }

      const targetData = operation.target ? getGridTargetData(operation.target) : null;
      const pointerTargetGrid = targetData ? gridsRef.current.get(targetData.sectionId) : undefined;
      const targetGrid =
        targetOverride === undefined
          ? getPreferredRegisteredGridTarget(
              gridsRef.current.values(),
              sourceData.sectionId,
              pointerTargetGrid,
              shape,
              (targetGridId) => isDropTargetEligible(source, targetGridId),
            )
          : (targetOverride ?? undefined);
      if (!targetGrid) {
        showInvalidPreview(null, "invalid:no-target");
        return;
      }

      const coordinates = getSnappedGridCoordinates({
        dragShape: shape,
        target: targetGrid.element.getBoundingClientRect(),
        columnCount: targetGrid.columnCount,
      });
      if (!coordinates) {
        showInvalidPreview(targetGrid.id, `invalid:${targetGrid.id}:coordinates`);
        return;
      }
      const { x, y } = coordinates;
      const targetAcceptsSource = canAcceptDrop(source, targetGrid.id);
      const previewKey = `${targetGrid.id}:${x}:${y}:${targetAcceptsSource ? "candidate" : "invalid"}`;
      if (active.lastPreviewKey === previewKey) return;
      if (!targetAcceptsSource) {
        showInvalidPreview(targetGrid.id, previewKey);
        return;
      }

      const result = previewGridMove(active.transaction, { targetGridId: targetGrid.id, x, y });
      if (
        result.accepted &&
        doesPreviewDisplaceNestedGridOwner(
          active.transaction.snapshot,
          result.transaction.preview,
          targetGrid.id,
          active.transaction.activeId,
        )
      ) {
        showInvalidPreview(targetGrid.id, `${previewKey}:nested-owner`);
        return;
      }
      active.lastPreviewKey = previewKey;
      active.targetGridId = targetGrid.id;
      active.valid = result.accepted;
      if (!result.accepted) {
        publishPreview({
          activeId: active.transaction.activeId,
          sourceGridId: active.transaction.sourceGridId,
          targetGridId: targetGrid.id,
          targetPlacement: null,
          state: cancelGridTransaction(active.transaction),
          mode: "drag",
          valid: false,
        });
        return;
      }

      active.transaction = result.transaction;
      const targetPlacement = result.transaction.preview.grids
        .find((grid) => grid.id === targetGrid.id)
        ?.placements.find((placement) => placement.id === sourceData.placement.id);
      publishPreview({
        activeId: active.transaction.activeId,
        sourceGridId: active.transaction.sourceGridId,
        targetGridId: targetGrid.id,
        targetPlacement: targetPlacement ?? null,
        state: result.transaction.preview,
        mode: "drag",
        valid: true,
      });
    },
    [canAcceptDrop, isDropTargetEligible],
  );

  const commitActiveTransaction = useCallback(
    (renderedPreview?: TransactionalGridState<SectionGridPlacement>) => {
      const active = activeRef.current;
      if (!active?.valid) {
        if (active) announce(`${active.label}: ${t("common.action.cancel")}`);
        clearInteraction();
        return;
      }

      const state = commitGridTransaction(
        renderedPreview ? { ...active.transaction, preview: renderedPreview } : active.transaction,
      );
      const snapshots: CommitSectionGridInput[] = state.grids.map((grid) => ({
        layoutId: currentLayoutId,
        sectionId: grid.id,
        placements: grid.placements,
      }));
      commitSectionGrids(snapshots);

      const placement = state.grids
        .flatMap((grid) => grid.placements)
        .find((entry) => entry.id === active.transaction.activeId);
      if (placement) {
        announce(
          `${active.label}: ${t("item.moveResize.field.xOffset.label")} ${placement.x + 1}, ${t(
            "item.moveResize.field.yOffset.label",
          )} ${placement.y + 1}, ${t("item.moveResize.field.width.label")} ${placement.w}, ${t(
            "item.moveResize.field.height.label",
          )} ${placement.h}`,
        );
      }
      clearInteraction();
    },
    [announce, clearInteraction, commitSectionGrids, currentLayoutId, t],
  );

  const cancelActiveInteraction = useCallback(() => {
    const active = activeRef.current;
    if (active) announce(`${active.label}: ${t("common.action.cancel")}`);
    clearInteraction();
  }, [announce, clearInteraction, t]);

  const handleBeforeDragStart = useCallback(() => {
    const overlay = document.querySelector<HTMLElement>(".board-grid-drag-overlay[data-dnd-overlay]");
    const ancestorZoom = overlay ? getAncestorCssZoom(overlay) : 1;
    setOverlayZoom(1 / ancestorZoom);
  }, []);

  const handleDragStart = useCallback(
    ({ operation }: DragStartEvent, manager: DragDropManager) => {
      const data = operation.source ? getGridEntryData(operation.source) : null;
      if (!data) return;
      if (!beginTransaction(data.placement.id, data.sectionId, "drag", data.label)) {
        manager.actions.stop({ canceled: true });
        return;
      }
      const active = activeRef.current;
      if (active) active.dragProjection = getInitialDragProjection(operation);
    },
    [beginTransaction],
  );

  const handleDragMove = useCallback(
    ({ by, nativeEvent, operation, to }: DragMoveEvent) => {
      const active = activeRef.current;
      const pointer =
        to ??
        (by
          ? { x: operation.position.current.x + by.x, y: operation.position.current.y + by.y }
          : getPointerCoordinates(operation.source?.element, nativeEvent));
      updateDragPreview(operation, getProjectedDragShape(operation, active?.dragProjection ?? null, pointer));
      if (active?.mode === "drag" && pointer) active.lastProcessedPointer = pointer;
    },
    [updateDragPreview],
  );

  const handleDragOver = useCallback(
    ({ operation }: DragOverEvent) =>
      updateDragPreview(
        operation,
        getProjectedDragShape(operation, activeRef.current?.dragProjection ?? null, operation.position.current),
      ),
    [updateDragPreview],
  );

  const handleCollision = useCallback(
    (_event: CollisionEvent, manager: DragDropManager) => {
      window.cancelAnimationFrame(collisionFrameRef.current);
      collisionFrameRef.current = window.requestAnimationFrame(() => {
        collisionFrameRef.current = 0;
        updateDragPreview(
          manager.dragOperation,
          getProjectedDragShape(
            manager.dragOperation,
            activeRef.current?.dragProjection ?? null,
            manager.dragOperation.position.current,
          ),
        );
      });
    },
    [updateDragPreview],
  );

  const handleDragEnd = useCallback(
    ({ canceled, nativeEvent, operation }: DragEndEvent) => {
      window.cancelAnimationFrame(collisionFrameRef.current);
      collisionFrameRef.current = 0;
      if (!canceled) {
        const source = operation.source;
        const pointer = getPointerCoordinates(source?.element, nativeEvent);
        const active = activeRef.current;
        const finalShape = getProjectedDragShape(operation, active?.dragProjection ?? null, pointer);
        const finalTarget =
          source && pointer
            ? getPointerTargetGrid(gridsRef.current.values(), source, pointer, finalShape, isDropTargetEligible)
            : undefined;

        // The rendered placeholder is the drop contract. During auto-scroll,
        // dnd-kit's final geometry can advance between the last collision pass
        // and pointerup; recomputing inside the same grid would then make the
        // item jump past the placeholder. A final hit-test is still required
        // when the pointer changed grids, left every grid, or never produced a
        // valid preview (for example, an immediate release).
        const renderedInteraction = renderedInteractionRef.current;
        const canCommitRenderedPreview =
          active?.mode === "drag" &&
          active?.valid === true &&
          renderedInteraction?.mode === "drag" &&
          renderedInteraction.valid &&
          renderedInteraction.targetPlacement !== null &&
          renderedInteraction.activeId === active.transaction.activeId &&
          renderedInteraction.sourceGridId === active.transaction.sourceGridId &&
          renderedInteraction.targetGridId === active.targetGridId &&
          active.targetGridId === finalTarget?.id &&
          arePointerCoordinatesEqual(active.lastProcessedPointer, pointer);

        if (canCommitRenderedPreview) {
          commitActiveTransaction(renderedInteraction.state);
          return;
        }

        updateDragPreview(
          operation,
          getProjectedDragShape(operation, active?.dragProjection ?? null, pointer),
          finalTarget,
        );
      }

      const active = activeRef.current;
      if (canceled || !active?.valid || !active.targetGridId) {
        if (active) cancelActiveInteraction();
        else clearInteraction();
        return;
      }
      commitActiveTransaction();
    },
    [cancelActiveInteraction, clearInteraction, commitActiveTransaction, isDropTargetEligible, updateDragPreview],
  );

  const beginResize = useCallback(
    ({ activeId, sourceGridId, label }: ResizeStartInput) => beginTransaction(activeId, sourceGridId, "resize", label),
    [beginTransaction],
  );

  const applyResizePreview = useCallback((input: ResizePreviewInput) => {
    const active = activeRef.current;
    if (!active) return false;
    active.mode = "resize";
    active.targetGridId = active.transaction.sourceGridId;

    const key = `${input.direction}:${input.deltaColumns}:${input.deltaRows}:${input.minWidth}:${input.minHeight}`;
    if (active.lastPreviewKey === key) return active.valid;
    active.lastPreviewKey = key;
    const result = previewGridResize(active.transaction, input);
    active.valid = result.accepted;
    if (!result.accepted) {
      active.previewRevision += 1;
      setInteraction({
        activeId: active.transaction.activeId,
        sourceGridId: active.transaction.sourceGridId,
        targetGridId: active.transaction.sourceGridId,
        targetPlacement: null,
        state: cancelGridTransaction(active.transaction),
        mode: "resize",
        valid: false,
        previewRevision: active.previewRevision,
      });
      return false;
    }

    active.transaction = result.transaction;
    active.previewRevision += 1;
    setInteraction({
      activeId: active.transaction.activeId,
      sourceGridId: active.transaction.sourceGridId,
      targetGridId: active.transaction.sourceGridId,
      targetPlacement: null,
      state: result.transaction.preview,
      mode: "resize",
      valid: true,
      previewRevision: active.previewRevision,
    });
    return true;
  }, []);

  const previewResize = useCallback(
    (input: ResizePreviewInput) => {
      const active = activeRef.current;
      if (!active || active.mode !== "resize") return false;
      return applyResizePreview(input);
    },
    [applyResizePreview],
  );

  const value = useMemo<BoardGridEditorContextValue>(
    () => ({
      interaction,
      registerGrid,
      getDepth,
      isDropTargetEligible,
      canAcceptDrop,
      beginResize,
      previewResize,
      completeResize: commitActiveTransaction,
      cancelResize: cancelActiveInteraction,
    }),
    [
      beginResize,
      canAcceptDrop,
      cancelActiveInteraction,
      commitActiveTransaction,
      interaction,
      isDropTargetEligible,
      previewResize,
      getDepth,
      registerGrid,
    ],
  );
  const resizePreview = useMemo(() => {
    if (interaction?.mode !== "resize") return null;
    return (
      interaction.state.grids
        .flatMap((grid) => grid.placements)
        .find((placement) => placement.id === interaction.activeId) ?? null
    );
  }, [interaction]);

  useEffect(() => {
    if (interaction?.mode !== "resize") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cancelActiveInteraction();
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [cancelActiveInteraction, interaction?.mode]);

  return (
    <BoardGridEditorContext.Provider value={value}>
      <GridResizePreviewProvider value={resizePreview}>
        <DragDropProvider
          plugins={configureEditorPlugins}
          onCollision={handleCollision}
          onBeforeDragStart={handleBeforeDragStart}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {children}
          <DragOverlay
            className="board-grid-drag-overlay"
            dropAnimation={null}
            style={
              {
                zoom: overlayZoom,
                "--board-grid-overlay-content-zoom": 1 / overlayZoom,
              } as CSSProperties
            }
          >
            {(source) => {
              const data = getGridEntryData(source);
              return data ? <div className="board-grid-drag-overlay-card">{data.label}</div> : null;
            }}
          </DragOverlay>
          <GridCollisionSynchronizer interaction={interaction} />
        </DragDropProvider>
      </GridResizePreviewProvider>
    </BoardGridEditorContext.Provider>
  );
};

const GridCollisionSynchronizer = ({ interaction }: { interaction: GridInteraction | null }) => {
  const manager = useDragDropManager();
  const geometryKey = interaction ? getGridGeometryKey(interaction.state) : null;

  useLayoutEffect(() => {
    if (!geometryKey || !manager) return;
    for (const target of manager.registry.droppables.value) target.refreshShape();
    manager.collisionObserver.forceUpdate(true);
  }, [geometryKey, manager]);

  return null;
};

/** A section-local dnd-kit canvas registered with the board transaction. */
export default function GridEditor({ sectionId, columnCount, rowCount, placements, className }: GridEditorProps) {
  const t = useI18n();
  const { section, items, innerSections } = useSectionContext();
  const { interaction, registerGrid, getDepth, isDropTargetEligible } = useBoardGridEditor();
  const gridRef = useRef<HTMLDivElement>(null);
  const parentGridId = "parentSectionId" in section ? section.parentSectionId : null;
  const ownerPlacementId = "parentSectionId" in section ? section.id : null;
  const depth = getDepth(sectionId);
  const previewGrid = interaction?.state.grids.find((grid) => grid.id === sectionId);
  const controlledById = useMemo(() => new Map(placements.map((placement) => [placement.id, placement])), [placements]);
  const renderPlacements = useMemo(() => {
    if (!previewGrid || !interaction) return placements;

    const preview = previewGrid.placements.filter(
      (placement) => interaction.mode === "resize" || placement.id !== interaction.activeId,
    );
    if (interaction.mode === "drag" && interaction.sourceGridId === sectionId) {
      const original = controlledById.get(interaction.activeId);
      return original ? [...preview, original] : preview;
    }
    return preview;
  }, [controlledById, interaction, placements, previewGrid, sectionId]);
  const entryById = useMemo(
    () => new Map([...items, ...innerSections].map((entry) => [entry.id, entry])),
    [innerSections, items],
  );
  const targetPlacement =
    interaction?.mode === "drag" && interaction.valid && interaction.targetGridId === sectionId
      ? interaction.targetPlacement
      : null;
  const renderedRowCount =
    section.kind !== "container" && interaction?.mode === "resize"
      ? Math.max(rowCount, getLayoutRowCount(renderPlacements))
      : rowCount;

  const { ref: droppableRef, isDropTarget } = useDroppable<GridTargetData>({
    id: `board-grid:${sectionId}`,
    type: GRID_TARGET_TYPE,
    data: { kind: GRID_TARGET_TYPE, sectionId },
    collisionDetector: pointerIntersection,
    collisionPriority: CollisionPriority.Highest + depth,
    // `accept` only removes the active container's own subtree. Size limits
    // are validated after collision so an invalid nested target cannot fall
    // through to an accepting parent grid underneath the pointer.
    accept: (source) => isDropTargetEligible(source, sectionId),
  });
  const isIntentTarget = interaction?.mode === "drag" ? interaction.targetGridId === sectionId : isDropTarget;

  const setGridRef = useCallback(
    (element: HTMLDivElement | null) => {
      gridRef.current = element;
      droppableRef(element);
    },
    [droppableRef],
  );

  useLayoutEffect(() => {
    const element = gridRef.current;
    if (!element) return;
    return registerGrid({
      id: sectionId,
      columnCount,
      maxRowCount: section.kind === "container" ? rowCount : null,
      parentGridId,
      ownerPlacementId,
      placements,
      depth,
      element,
    });
  }, [columnCount, depth, ownerPlacementId, parentGridId, placements, registerGrid, rowCount, section.kind, sectionId]);

  useLayoutEffect(() => {
    const viewport = gridRef.current?.parentElement;
    if (!viewport?.hasAttribute("data-section-id")) return;
    viewport.style.setProperty("--board-grid-drag-height", `${getLogicalTrackSize(renderedRowCount)}px`);
    return () => {
      viewport.style.removeProperty("--board-grid-drag-height");
    };
  }, [renderedRowCount]);

  return (
    <div
      ref={setGridRef}
      className={className}
      data-grid-section-id={sectionId}
      data-grid-depth={depth}
      data-dnd-drop-target={isIntentTarget ? "true" : "false"}
      data-dnd-drop-valid={isIntentTarget ? String(targetPlacement !== null) : undefined}
      data-dnd-preview-revision={interaction?.targetGridId === sectionId ? interaction.previewRevision : undefined}
      style={
        {
          width: getLogicalTrackSize(columnCount),
          height: getLogicalTrackSize(renderedRowCount),
          "--board-grid-pitch": `${LOGICAL_GRID_PITCH}px`,
        } as CSSProperties
      }
    >
      {renderPlacements.map((placement) => {
        const entry = entryById.get(placement.id);
        const label = entry
          ? entry.type === "item"
            ? entry.advancedOptions.title?.trim() || t(`widget.${entry.kind}.name`)
            : entry.options.title.trim() || t("section.container.untitled")
          : placement.id;
        return <DndGridEntry key={placement.id} sectionId={sectionId} placement={placement} label={label} />;
      })}
      {targetPlacement && (
        <div
          className="board-grid-placeholder"
          style={getLogicalItemStyle(targetPlacement)}
          data-grid-placeholder-for={interaction?.activeId}
          data-grid-x={targetPlacement.x}
          data-grid-y={targetPlacement.y}
          data-grid-w={targetPlacement.w}
          data-grid-h={targetPlacement.h}
          aria-hidden="true"
        />
      )}
      <span
        data-grid-runtime="homarr-dnd-kit-v1"
        data-editor-section-id={sectionId}
        aria-hidden="true"
        style={{ position: "absolute", width: 1, height: 1, pointerEvents: "none" }}
      />
    </div>
  );
}

interface DndGridEntryProps {
  sectionId: string;
  placement: SectionGridPlacement;
  label: string;
}

const DndGridEntry = ({ sectionId, placement, label }: DndGridEntryProps) => {
  const { acquireContainer } = useBoardGridPortalHost();
  const { interaction, beginResize, previewResize, completeResize, cancelResize } = useBoardGridEditor();
  const [isSectionChromeActive, setIsSectionChromeActive] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const sourceData = useMemo<GridEntryData>(
    () => ({ kind: GRID_ENTRY_TYPE, sectionId, placement, label }),
    [label, placement, sectionId],
  );
  const sensors = useMemo(
    () => [
      PointerSensor.configure({
        activationConstraints: (event) =>
          event.pointerType === "touch"
            ? [new PointerActivationConstraints.Delay({ value: 200, tolerance: 8 })]
            : [new PointerActivationConstraints.Distance({ value: 4 })],
        preventActivation: preventGridDragActivation,
      }),
    ],
    [],
  );
  const {
    ref: draggableRef,
    handleRef,
    isDragging,
    isDropping,
  } = useDraggable<GridEntryData>({
    id: placement.id,
    type: GRID_ENTRY_TYPE,
    data: sourceData,
    sensors,
  });
  const setShellRef = useCallback(
    (element: HTMLDivElement | null) => {
      shellRef.current = element;
      draggableRef(element);
    },
    [draggableRef],
  );

  useLayoutEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const container = acquireContainer(placement.id);
    mount.appendChild(container);

    const handleSelector =
      placement.type === "section" ? "[data-grid-container-drag-handle]" : "[data-editor-grid-entry]";
    const bindHandle = () => handleRef(container.querySelector<HTMLElement>(handleSelector));
    bindHandle();
    const observer = new MutationObserver(bindHandle);
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      handleRef(null);
    };
  }, [acquireContainer, handleRef, placement.id, placement.type]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (placement.type !== "section" || !shell) return;

    const handlePointerDownCapture = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const grip = event.target.closest("[data-grid-container-drag-handle]");
      if (grip) {
        const owner = grip.closest('.board-grid-entry[data-grid-item-type="section"]');
        setIsSectionChromeActive(owner === shell);
        return;
      }

      const resizeHandle = event.target.closest(".board-grid-resize-handle");
      if (!resizeHandle || resizeHandle.parentElement !== shell) {
        setIsSectionChromeActive(false);
      }
    };

    shell.addEventListener("pointerdown", handlePointerDownCapture, { capture: true });
    return () => shell.removeEventListener("pointerdown", handlePointerDownCapture, { capture: true });
  }, [placement.type]);

  const isActive = interaction?.activeId === placement.id;
  const style = getLogicalItemStyle(placement) as CSSProperties;

  return (
    <div
      ref={setShellRef}
      className="board-grid-entry"
      style={style}
      data-grid-item-id={placement.id}
      data-grid-item-type={placement.type}
      data-grid-x={placement.x}
      data-grid-y={placement.y}
      data-grid-w={placement.w}
      data-grid-h={placement.h}
      data-grid-section-chrome-active={placement.type === "section" ? String(isSectionChromeActive) : undefined}
      data-dnd-active={isActive ? "true" : undefined}
      data-dnd-drag-source={isDragging ? "true" : undefined}
      data-dnd-dropping={isDropping ? "true" : undefined}
    >
      <div ref={mountRef} className="board-grid-content-mount" />
      <GridResizeHandles
        sectionId={sectionId}
        placement={placement}
        label={label}
        disabled={interaction !== null || (placement.type === "section" && !isSectionChromeActive)}
        beginResize={beginResize}
        previewResize={previewResize}
        completeResize={completeResize}
        cancelResize={cancelResize}
      />
    </div>
  );
};

interface GridResizeHandlesProps {
  sectionId: string;
  placement: SectionGridPlacement;
  label: string;
  disabled: boolean;
  beginResize: BoardGridEditorContextValue["beginResize"];
  previewResize: BoardGridEditorContextValue["previewResize"];
  completeResize: BoardGridEditorContextValue["completeResize"];
  cancelResize: BoardGridEditorContextValue["cancelResize"];
}

const RESIZE_DIRECTIONS: readonly GridResizeDirection[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

const GridResizeHandles = ({
  sectionId,
  placement,
  label,
  disabled,
  beginResize,
  previewResize,
  completeResize,
  cancelResize,
}: GridResizeHandlesProps) => {
  const pointerStartRef = useRef<{
    id: number;
    x: number;
    y: number;
    direction: GridResizeDirection;
    visualScale: { x: number; y: number };
  } | null>(null);

  const start = (direction: GridResizeDirection) =>
    beginResize({ activeId: placement.id, sourceGridId: sectionId, label }) && direction;

  const update = (direction: GridResizeDirection, deltaColumns: number, deltaRows: number) =>
    previewResize({
      direction,
      deltaColumns,
      deltaRows,
      minWidth: placement.minW ?? 1,
      minHeight: placement.minH ?? 1,
    });

  const handlePointerDown = (event: ReactPointerEvent<HTMLSpanElement>, direction: GridResizeDirection) => {
    const visualScale = getEntryVisualScale(event.currentTarget.parentElement, placement);
    if (
      disabled ||
      !event.isPrimary ||
      event.button !== 0 ||
      pointerStartRef.current ||
      !visualScale ||
      !start(direction)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      cancelResize();
      return;
    }
    pointerStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, direction, visualScale };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const started = pointerStartRef.current;
    if (!started || started.id !== event.pointerId) return;
    event.preventDefault();
    const delta = getSnappedGridDelta({
      initial: { x: started.x, y: started.y },
      current: { x: event.clientX, y: event.clientY },
      visualScale: started.visualScale,
    });
    if (delta) update(started.direction, delta.x, delta.y);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLSpanElement>, canceled: boolean) => {
    const started = pointerStartRef.current;
    if (!started || started.id !== event.pointerId) return;
    pointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (canceled) cancelResize();
    else {
      const delta = getSnappedGridDelta({
        initial: { x: started.x, y: started.y },
        current: { x: event.clientX, y: event.clientY },
        visualScale: started.visualScale,
      });
      if (delta) update(started.direction, delta.x, delta.y);
      completeResize();
    }
  };

  return RESIZE_DIRECTIONS.map((direction) => (
    <span
      key={direction}
      className="board-grid-resize-handle"
      data-grid-resize-handle={direction}
      data-grid-resize-disabled={disabled ? "true" : undefined}
      aria-hidden="true"
      onPointerDown={(event) => handlePointerDown(event, direction)}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => handlePointerEnd(event, false)}
      onPointerCancel={(event) => handlePointerEnd(event, true)}
      onLostPointerCapture={(event) => {
        if (pointerStartRef.current?.id !== event.pointerId) return;
        pointerStartRef.current = null;
        cancelResize();
      }}
    />
  ));
};

const getProjectedDragShape = (
  operation: DragMoveEvent["operation"],
  origin: DragProjectionOrigin | null,
  pointer: { x: number; y: number } | null | undefined,
) => {
  if (origin && pointer) return getPointerProjectedShape(origin, pointer);
  const shape = operation.shape?.current.boundingRectangle;
  return shape ? { left: shape.left, top: shape.top, width: shape.width, height: shape.height } : undefined;
};

const getInitialDragProjection = (
  operation: Pick<BeforeDragStartEvent["operation"], "position" | "source">,
): DragProjectionOrigin | null => {
  const sourceElement = operation.source?.element;
  if (!sourceElement) return null;
  const rectangle = sourceElement.getBoundingClientRect();
  const frame = getFrameTransform(sourceElement);
  return {
    initialPointer: { ...operation.position.initial },
    initialShape: {
      left: rectangle.left * frame.scaleX + frame.x,
      top: rectangle.top * frame.scaleY + frame.y,
      width: rectangle.width * frame.scaleX,
      height: rectangle.height * frame.scaleY,
    },
  };
};

const getPointerCoordinates = (sourceElement: Element | undefined, event: Event | undefined) => {
  if (!sourceElement || !isPointerEvent(event)) return null;

  const pointer = getEventCoordinates(event);
  const frame = getFrameTransform(sourceElement);
  return {
    x: pointer.x * frame.scaleX + frame.x,
    y: pointer.y * frame.scaleY + frame.y,
  };
};

const getAncestorCssZoom = (element: Element): number => {
  const effectiveParentZoom = element.parentElement?.currentCSSZoom;
  if (typeof effectiveParentZoom === "number" && Number.isFinite(effectiveParentZoom) && effectiveParentZoom > 0) {
    return effectiveParentZoom;
  }

  let zoom = 1;
  let ancestor = element.parentElement;
  while (ancestor) {
    const value = Number.parseFloat(getComputedStyle(ancestor).zoom);
    if (Number.isFinite(value) && value > 0) zoom *= value;
    ancestor = ancestor.parentElement;
  }
  return zoom;
};

const arePointerCoordinatesEqual = (first: { x: number; y: number } | null, second: { x: number; y: number } | null) =>
  first !== null && second !== null && Math.abs(first.x - second.x) <= 0.5 && Math.abs(first.y - second.y) <= 0.5;

const getPointerTargetGrid = (
  grids: Iterable<RegisteredGrid>,
  source: AbstractDraggable,
  pointer: { x: number; y: number },
  projectedShape: { left: number; top: number; width: number; height: number } | undefined,
  isTargetEligible: (source: AbstractDraggable, targetGridId: string) => boolean,
) => {
  const registeredGrids = Array.from(grids);
  const pointerTarget = registeredGrids
    .filter((grid) => {
      const rectangle = grid.element.getBoundingClientRect();
      return (
        rectangle.width > 0 &&
        rectangle.height > 0 &&
        pointer.x >= rectangle.left &&
        pointer.x <= rectangle.right &&
        pointer.y >= rectangle.top &&
        pointer.y <= rectangle.bottom &&
        isTargetEligible(source, grid.id)
      );
    })
    .toSorted((first, second) => {
      if (first.depth !== second.depth) return second.depth - first.depth;
      const firstRectangle = first.element.getBoundingClientRect();
      const secondRectangle = second.element.getBoundingClientRect();
      return firstRectangle.width * firstRectangle.height - secondRectangle.width * secondRectangle.height;
    })[0];
  const sourceData = getGridEntryData(source);
  if (!pointerTarget || !projectedShape || !sourceData) return pointerTarget ?? null;

  return getPreferredRegisteredGridTarget(
    registeredGrids,
    sourceData.sectionId,
    pointerTarget,
    projectedShape,
    (targetGridId) => isTargetEligible(source, targetGridId),
  );
};

const getPreferredRegisteredGridTarget = (
  grids: Iterable<RegisteredGrid>,
  sourceGridId: string,
  pointerTarget: RegisteredGrid | undefined,
  dragShape: { left: number; top: number; width: number; height: number },
  isEligible: (gridId: string) => boolean,
) => {
  if (!pointerTarget) return undefined;
  const registeredGrids = Array.from(grids);
  const preferredId = getPreferredNestedExitTargetId({
    grids: registeredGrids.map((grid) => ({
      id: grid.id,
      parentGridId: grid.parentGridId,
      rectangle: grid.element.getBoundingClientRect(),
    })),
    pointerTargetId: pointerTarget.id,
    sourceGridId,
    dragShape,
    isEligible,
  });
  return registeredGrids.find((grid) => grid.id === preferredId) ?? pointerTarget;
};

const doesPreviewDisplaceNestedGridOwner = (
  snapshot: TransactionalGridState<SectionGridPlacement>,
  preview: TransactionalGridState<SectionGridPlacement>,
  targetGridId: string,
  activeId: string,
) => {
  const ownerIds = new Set(
    snapshot.grids
      .filter((grid) => grid.parentGridId === targetGridId && grid.ownerPlacementId !== activeId)
      .flatMap((grid) => (grid.ownerPlacementId ? [grid.ownerPlacementId] : [])),
  );
  if (ownerIds.size === 0) return false;

  const original = snapshot.grids.find((grid) => grid.id === targetGridId);
  const candidate = preview.grids.find((grid) => grid.id === targetGridId);
  if (!original || !candidate) return false;
  const originalById = new Map(original.placements.map((placement) => [placement.id, placement]));
  return candidate.placements.some((placement) => {
    const previous = originalById.get(placement.id);
    return Boolean(previous && ownerIds.has(placement.id) && !areGridPlacementCoordinatesEqual(previous, placement));
  });
};

const areGridPlacementCoordinatesEqual = (first: GridPlacement, second: GridPlacement) =>
  first.x === second.x && first.y === second.y && first.w === second.w && first.h === second.h;

const preventGridDragActivation = (event: PointerEvent, source: DomDraggable) => {
  if (document.body.hasAttribute("data-board-grid-interacting")) return true;
  const target = event.target;
  if (!(target instanceof Element) || target === source.handle) return false;
  const interactive = target.closest(
    'a,button,input,textarea,select,option,[contenteditable="true"],[role="button"],[data-grid-no-drag],.board-grid-resize-handle',
  );
  return Boolean(interactive && source.handle?.contains(interactive));
};

const getEntryVisualScale = (element: HTMLElement | null, placement: SectionGridPlacement) => {
  if (!element) return null;
  const rectangle = element.getBoundingClientRect();
  const scale = {
    x: rectangle.width / getLogicalTrackSize(placement.w),
    y: rectangle.height / getLogicalTrackSize(placement.h),
  };
  return Number.isFinite(scale.x) && scale.x > 0 && Number.isFinite(scale.y) && scale.y > 0 ? scale : null;
};

const configureEditorPlugins = (defaults: Plugins<DragDropManager>) =>
  defaults
    .filter((plugin) => plugin !== Accessibility)
    .map((plugin) => {
      if (plugin === Feedback)
        return Feedback.configure({
          feedback: "move",
          dropAnimation: null,
          keyboardTransition: { duration: 100 },
        });
      if (plugin === AutoScroller) return AutoScroller.configure({ acceleration: 24, threshold: { x: 0.16, y: 0.16 } });
      return plugin;
    });

const getGridEntryData = (source: AbstractDraggable): GridEntryData | null => {
  const data = source.data as Partial<GridEntryData>;
  return data.kind === GRID_ENTRY_TYPE && data.placement && data.sectionId && data.label
    ? (data as GridEntryData)
    : null;
};

const getGridTargetData = (target: { data: Record<string, unknown> }): GridTargetData | null => {
  const data = target.data as Partial<GridTargetData>;
  return data.kind === GRID_TARGET_TYPE && data.sectionId ? (data as GridTargetData) : null;
};

const getGridGeometryKey = (state: TransactionalGridState<SectionGridPlacement>) =>
  JSON.stringify(
    state.grids
      .map((grid) => ({
        id: grid.id,
        columnCount: grid.columnCount,
        maxRowCount: grid.maxRowCount,
        parentGridId: grid.parentGridId,
        placements: grid.placements
          .map(({ id, x, y, w, h }) => ({ id, x, y, w, h }))
          .toSorted((first, second) => first.id.localeCompare(second.id)),
      }))
      .toSorted((first, second) => first.id.localeCompare(second.id)),
  );
