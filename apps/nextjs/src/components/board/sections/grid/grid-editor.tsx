"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, PropsWithChildren } from "react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import "./grid-editor.css"; // oxlint-disable-line import/no-unassigned-import

import type { Draggable as AbstractDraggable, Plugins } from "@dnd-kit/abstract";
import { CollisionPriority } from "@dnd-kit/abstract";
import { pointerIntersection } from "@dnd-kit/collision";
import type { DragDropManager, Draggable as DomDraggable } from "@dnd-kit/dom";
import { Accessibility, AutoScroller, Feedback, PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { RestrictToElement } from "@dnd-kit/dom/modifiers";
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
import { IconGripHorizontal, IconGripVertical } from "@tabler/icons-react";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { getWidgetName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { AddInPlaceGridLayer } from "~/components/board/in-place-editor/grid-layer";
import { getLogicalGridSize, LOGICAL_GRID_PITCH } from "~/components/board/layout";
import {
  beginGridTransaction,
  cancelGridTransaction,
  commitGridTransaction,
  getGridTargetFallbackIds,
  getPreferredNestedExitTargetId,
  getPointerProjectedShape,
  getSnappedGridCoordinates,
  getSnappedGridDelta,
  previewGridMove,
  previewGridResize,
} from "./dnd";
import type { DragProjectionOrigin, GridResizeDirection, GridTransaction, TransactionalGridState } from "./dnd";
import type { DndGridEntryProps } from "./grid-entry-memo";
import { areDndGridEntryPropsEqual } from "./grid-entry-memo";
import { getGridDepth } from "./grid-depth";
import type { GridEditorRenderProps } from "./grid-editor-registry";
import { createGridInteractionStore } from "./grid-interaction-store";
import { useBoardGridPortalHost } from "./grid-portal-host";
import type { GridInteraction } from "./grid-preview-layer";
import { GridPreviewLayer } from "./grid-preview-layer";
import { createGridResizeOutlineController } from "./grid-resize-outline";
import { createGridRowProjection } from "./grid-row-projection";
import type { GridRowProjection } from "./grid-row-projection";
import type { CommitSectionGridInput, SectionGridPlacement } from "./use-grid-layout-actions";
import { commitSectionGridsCallback, useGridLayoutActions } from "./use-grid-layout-actions";
import { getContainerGridMinimumHeights } from "./container-grid-sizing";
import { useCollapsedSectionIds } from "../section-collapse";

const GRID_ENTRY_TYPE = "homarr-board-grid-entry";
const GRID_TARGET_TYPE = "homarr-board-grid-target";

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
  rowProjection: GridRowProjection;
  canvasScale: number;
  minimumDisplayHeights?: ReadonlyMap<string, number>;
  depth: number;
  element: HTMLElement;
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

interface BoardGridEditorActionsContextValue {
  getDisplayedPlacement: (sectionId: string, placement: SectionGridPlacement) => SectionGridPlacement;
  getLogicalPointerPosition: (sectionId: string, position: { x: number; y: number }) => { x: number; y: number };
  registerGrid: (grid: RegisteredGrid) => () => void;
  getDepth: (gridId: string) => number;
  isDropTargetEligible: (source: AbstractDraggable, targetGridId: string) => boolean;
  canAcceptDrop: (source: AbstractDraggable, targetGridId: string) => boolean;
  beginResize: (input: ResizeStartInput) => boolean;
  previewResize: (input: ResizePreviewInput) => SectionGridPlacement | null;
  completeResize: () => void;
  cancelResize: () => void;
}

const BoardGridEditorActionsContext = createContext<BoardGridEditorActionsContextValue | null>(null);
const BoardGridEditorInteractionContext = createContext<ReturnType<
  typeof createGridInteractionStore<GridInteraction>
> | null>(null);

const useBoardGridEditorActions = () => {
  const value = useContext(BoardGridEditorActionsContext);
  if (!value) throw new Error("BoardGridEditorProvider is required");
  return value;
};

const useBoardGridEditorInteractionStore = () => {
  const store = useContext(BoardGridEditorInteractionContext);
  if (!store) throw new Error("BoardGridEditorProvider is required");
  return store;
};

const useBoardGridEditorInteraction = () => {
  const store = useBoardGridEditorInteractionStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
};

/** One provider coordinates every root and nested grid on the board. */
export const BoardGridEditorProvider = ({ children }: PropsWithChildren) => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const collapsedSectionIds = useCollapsedSectionIds();
  const t = useI18n();
  const { announce } = useBoardGridPortalHost();
  const { commitSectionGrids } = useGridLayoutActions();
  const gridsRef = useRef<Map<string, RegisteredGrid>>(new Map());
  const activeRef = useRef<ActiveTransaction | null>(null);
  const renderedInteractionRef = useRef<GridInteraction | null>(null);
  const collisionFrameRef = useRef(0);
  const [interactionStore] = useState(() => createGridInteractionStore<GridInteraction>());
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

  const publishInteraction = useCallback(
    (interaction: GridInteraction | null) => {
      if (!interaction) {
        interactionStore.publish(null);
        return;
      }
      const snapshots = interaction.state.grids.map((grid) => ({
        layoutId: currentLayoutId,
        sectionId: grid.id,
        placements: grid.placements,
      }));
      const previewBoard = commitSectionGridsCallback(snapshots)(board);
      const canvasScale = gridsRef.current.get(interaction.sourceGridId)?.canvasScale ?? 1;
      const minimumDisplayHeights = getContainerGridMinimumHeights(
        previewBoard,
        currentLayoutId,
        canvasScale,
        collapsedSectionIds,
      );
      const affectedGridIds = new Set<string>();
      for (const grid of gridsRef.current.values()) {
        const hasChangedDisplayHeight = grid.placements.some(
          (placement) =>
            placement.type === "section" &&
            grid.minimumDisplayHeights?.has(placement.id) &&
            minimumDisplayHeights.get(placement.id) !== grid.minimumDisplayHeights?.get(placement.id),
        );
        if (hasChangedDisplayHeight) affectedGridIds.add(grid.id);
      }
      interactionStore.publish({ ...interaction, minimumDisplayHeights, affectedGridIds });
    },
    [board, currentLayoutId, collapsedSectionIds, interactionStore],
  );

  const clearInteraction = useCallback(() => {
    window.cancelAnimationFrame(collisionFrameRef.current);
    collisionFrameRef.current = 0;
    activeRef.current = null;
    renderedInteractionRef.current = null;
    publishInteraction(null);
    document.body.removeAttribute("data-board-grid-interacting");
  }, [publishInteraction]);

  useLayoutEffect(() => {
    clearInteraction();
    return clearInteraction;
  }, [board.items, board.sections, clearInteraction, currentLayoutId]);

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
        publishInteraction({
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
    [announce, clearInteraction, getCurrentState, publishInteraction, t],
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
        publishInteraction({ ...preview, previewRevision: active.previewRevision });
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

      const fallbackIds = getGridTargetFallbackIds({
        grids: Array.from(gridsRef.current.values()),
        targetGridId: targetGrid.id,
        isEligible: (targetGridId) => isDropTargetEligible(source, targetGridId),
      });
      let invalidPreviewKey = `invalid:${targetGrid.id}:no-candidate`;

      for (const candidateId of fallbackIds) {
        const candidate = gridsRef.current.get(candidateId);
        if (!candidate) continue;
        const rectangle = candidate.element.getBoundingClientRect();
        const visualScale = rectangle.width / getLogicalGridSize(candidate.columnCount);
        const rowScale =
          Number.parseFloat(getComputedStyle(candidate.element).getPropertyValue("--board-grid-row-scale")) || 1;
        const rowPitch = LOGICAL_GRID_PITCH * visualScale * rowScale;
        const interaction = interactionStore.getGridSnapshot(candidate.id);
        let rowProjection = candidate.rowProjection;
        if (interaction) {
          const previewGrid = interaction.state.grids.find((grid) => grid.id === candidate.id);
          rowProjection = createGridRowProjection(
            previewGrid?.placements ?? candidate.placements,
            interaction.minimumDisplayHeights ?? candidate.minimumDisplayHeights,
          );
        }
        const logicalY = rowProjection.getLogicalRow((shape.top - rectangle.top) / rowPitch);
        const coordinates = getSnappedGridCoordinates({
          dragShape: { ...shape, top: rectangle.top + logicalY * rowPitch },
          target: rectangle,
          columnCount: candidate.columnCount,
          verticalVisualScale: visualScale * rowScale,
        });
        if (!coordinates) {
          invalidPreviewKey = `invalid:${candidate.id}:coordinates`;
          continue;
        }

        const { x, y } = coordinates;
        const targetAcceptsSource = canAcceptDrop(source, candidate.id);
        const previewKey = `${candidate.id}:${x}:${y}:${targetAcceptsSource ? "candidate" : "invalid"}`;
        invalidPreviewKey = previewKey;
        if (!targetAcceptsSource) continue;

        const result = previewGridMove(active.transaction, { targetGridId: candidate.id, x, y });
        if (!result.accepted) continue;
        if (active.lastPreviewKey === previewKey) return;

        active.lastPreviewKey = previewKey;
        active.targetGridId = candidate.id;
        active.valid = true;
        active.transaction = result.transaction;
        const targetPlacement = result.transaction.preview.grids
          .find((grid) => grid.id === candidate.id)
          ?.placements.find((placement) => placement.id === sourceData.placement.id);
        publishPreview({
          activeId: active.transaction.activeId,
          sourceGridId: active.transaction.sourceGridId,
          targetGridId: candidate.id,
          targetPlacement: targetPlacement ?? null,
          state: result.transaction.preview,
          mode: "drag",
          valid: true,
        });
        return;
      }

      showInvalidPreview(targetGrid.id, invalidPreviewKey);
    },
    [canAcceptDrop, publishInteraction, isDropTargetEligible, interactionStore],
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
      const hasChanges = commitSectionGrids(snapshots);
      if (!hasChanges) {
        clearInteraction();
        return;
      }

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
      // Cache subscribers receive the committed board asynchronously. Keep the preview until
      // the board-change layout effect clears it, so displaced items never flash at their old positions.
      activeRef.current = null;
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

  const applyResizePreview = useCallback(
    (input: ResizePreviewInput) => {
      const active = activeRef.current;
      if (!active) return null;
      active.mode = "resize";
      active.targetGridId = active.transaction.sourceGridId;

      const key = `${input.direction}:${input.deltaColumns}:${input.deltaRows}:${input.minWidth}:${input.minHeight}`;
      const getAcceptedPlacement = () => {
        if (!active.valid) return null;
        return (
          active.transaction.preview.grids
            .find((grid) => grid.id === active.transaction.sourceGridId)
            ?.placements.find((placement) => placement.id === active.transaction.activeId) ?? null
        );
      };
      if (active.lastPreviewKey === key) return getAcceptedPlacement();
      active.lastPreviewKey = key;
      const result = previewGridResize(active.transaction, input);
      active.valid = result.accepted;
      if (!result.accepted) {
        active.previewRevision += 1;
        publishInteraction({
          activeId: active.transaction.activeId,
          sourceGridId: active.transaction.sourceGridId,
          targetGridId: active.transaction.sourceGridId,
          targetPlacement: null,
          state: cancelGridTransaction(active.transaction),
          mode: "resize",
          valid: false,
          previewRevision: active.previewRevision,
        });
        return null;
      }

      active.transaction = result.transaction;
      active.previewRevision += 1;
      publishInteraction({
        activeId: active.transaction.activeId,
        sourceGridId: active.transaction.sourceGridId,
        targetGridId: active.transaction.sourceGridId,
        targetPlacement:
          result.transaction.preview.grids
            .find((grid) => grid.id === active.transaction.sourceGridId)
            ?.placements.find((placement) => placement.id === active.transaction.activeId) ?? null,
        state: result.transaction.preview,
        mode: "resize",
        valid: true,
        previewRevision: active.previewRevision,
      });
      return getAcceptedPlacement();
    },
    [publishInteraction],
  );

  const previewResize = useCallback(
    (input: ResizePreviewInput) => {
      const active = activeRef.current;
      if (!active || active.mode !== "resize") return null;
      return applyResizePreview(input);
    },
    [applyResizePreview],
  );

  const getDisplayedPlacement = useCallback(
    (sectionId: string, placement: SectionGridPlacement) => {
      const grid = gridsRef.current.get(sectionId);
      if (!grid) return placement;
      const preview = activeRef.current?.transaction.preview.grids.find((candidate) => candidate.id === sectionId);
      const entries = (preview?.placements ?? grid.placements).map((entry) =>
        entry.id === placement.id ? placement : entry,
      );
      return (
        createGridRowProjection(
          entries,
          interactionStore.getSnapshot()?.minimumDisplayHeights ?? grid.minimumDisplayHeights,
        ).placements.find((entry) => entry.id === placement.id) ?? placement
      );
    },
    [interactionStore],
  );

  const getLogicalPointerPosition = useCallback((sectionId: string, position: { x: number; y: number }) => {
    const grid = gridsRef.current.get(sectionId);
    if (!grid) return position;
    const rectangle = grid.element.getBoundingClientRect();
    const rowScale = Number.parseFloat(getComputedStyle(grid.element).getPropertyValue("--board-grid-row-scale")) || 1;
    const pitch = (rectangle.width / grid.columnCount) * rowScale;
    const row = grid.rowProjection.getLogicalRow((position.y - rectangle.top) / pitch);
    return { x: position.x, y: rectangle.top + row * pitch };
  }, []);

  const actions = useMemo<BoardGridEditorActionsContextValue>(
    () => ({
      registerGrid,
      getDisplayedPlacement,
      getLogicalPointerPosition,
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
      isDropTargetEligible,
      previewResize,
      getDepth,
      registerGrid,
      getDisplayedPlacement,
      getLogicalPointerPosition,
    ],
  );

  const syncRenderedInteraction = useCallback((interaction: GridInteraction | null) => {
    const active = activeRef.current;
    renderedInteractionRef.current =
      interaction &&
      active &&
      interaction.mode === active.mode &&
      interaction.activeId === active.transaction.activeId &&
      interaction.sourceGridId === active.transaction.sourceGridId
        ? interaction
        : null;
  }, []);

  return (
    <BoardGridEditorActionsContext.Provider value={actions}>
      <BoardGridEditorInteractionContext.Provider value={interactionStore}>
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
                "--board-grid-overlay-inset": `${((board.itemGap ?? 0) * overlayZoom) / 2}px`,
              } as CSSProperties
            }
          >
            {(source) => {
              const data = getGridEntryData(source);
              return data ? <div className="board-grid-drag-overlay-card">{data.label}</div> : null;
            }}
          </DragOverlay>
          <GridInteractionEffects syncRenderedInteraction={syncRenderedInteraction} />
        </DragDropProvider>
      </BoardGridEditorInteractionContext.Provider>
    </BoardGridEditorActionsContext.Provider>
  );
};

const GridInteractionEffects = ({
  syncRenderedInteraction,
}: {
  syncRenderedInteraction: (interaction: GridInteraction | null) => void;
}) => {
  const interaction = useBoardGridEditorInteraction();

  useLayoutEffect(() => syncRenderedInteraction(interaction), [interaction, syncRenderedInteraction]);

  return <GridCollisionSynchronizer previewRevision={interaction?.previewRevision ?? null} />;
};

const GridCollisionSynchronizer = ({ previewRevision }: { previewRevision: number | null }) => {
  const manager = useDragDropManager();

  useLayoutEffect(() => {
    if (previewRevision === null || !manager) return;
    for (const target of manager.registry.droppables.value) target.refreshShape();
    manager.collisionObserver.forceUpdate(true);
  }, [manager, previewRevision]);

  return null;
};

/** A section-local dnd-kit canvas registered with the board transaction. */
export default function GridEditor({
  sectionId,
  columnCount,
  rowCount,
  maxRowCount,
  placements,
  transactionPlacements,
  minimumDisplayHeights,
  canvasScale = 1,
  className,
  section,
  items,
  innerSections,
  entryElementStore,
}: GridEditorRenderProps) {
  const t = useI18n();
  const { registerGrid, getDepth, isDropTargetEligible } = useBoardGridEditorActions();
  const interactionStore = useBoardGridEditorInteractionStore();
  const gridRef = useRef<HTMLDivElement>(null);
  const [addInPlaceRowCount, setAddInPlaceRowCount] = useState(0);
  const renderedRowCount = Math.max(rowCount, addInPlaceRowCount);
  const rowProjection = useMemo(
    () => createGridRowProjection(placements, minimumDisplayHeights),
    [placements, minimumDisplayHeights],
  );
  const entryElements = useSyncExternalStore(
    entryElementStore.subscribe,
    entryElementStore.getSnapshot,
    entryElementStore.getSnapshot,
  ).elements;
  const parentGridId = "parentSectionId" in section ? section.parentSectionId : null;
  const ownerPlacementId = "parentSectionId" in section ? section.id : null;
  const depth = getDepth(sectionId);
  const labelById = useMemo(
    () =>
      new Map(
        [...items, ...innerSections].map((entry) => [
          entry.id,
          entry.type === "item"
            ? entry.advancedOptions.title?.trim() || getWidgetName(entry.kind, t)
            : entry.options.title.trim() || t("section.container.untitled"),
        ]),
      ),
    [innerSections, items, t],
  );
  const { ref: droppableRef } = useDroppable<GridTargetData>({
    id: `board-grid:${sectionId}`,
    type: GRID_TARGET_TYPE,
    data: { kind: GRID_TARGET_TYPE, sectionId },
    collisionDetector: pointerIntersection,
    collisionPriority: CollisionPriority.Highest + depth,
    // `accept` removes only the active container's own subtree. Size limits
    // are evaluated during preview targeting, which can fall back from an
    // invalid nested grid to an eligible parent.
    accept: (source) => isDropTargetEligible(source, sectionId),
  });

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
      maxRowCount,
      parentGridId,
      ownerPlacementId,
      placements: transactionPlacements,
      rowProjection,
      minimumDisplayHeights,
      canvasScale,
      depth,
      element,
    });
  }, [
    columnCount,
    depth,
    maxRowCount,
    ownerPlacementId,
    parentGridId,
    registerGrid,
    sectionId,
    transactionPlacements,
    rowProjection,
    minimumDisplayHeights,
    canvasScale,
  ]);

  useLayoutEffect(() => {
    const viewport = gridRef.current?.parentElement;
    if (!viewport || maxRowCount !== null || renderedRowCount <= rowCount) return;
    viewport.style.setProperty(
      "--board-grid-drag-height",
      `calc(${getLogicalGridSize(rowProjection.getDisplayRow(renderedRowCount))}px * var(--board-grid-row-scale, 1))`,
    );
    return () => {
      viewport.style.removeProperty("--board-grid-drag-height");
    };
  }, [maxRowCount, renderedRowCount, rowCount, rowProjection]);

  return (
    <div
      ref={setGridRef}
      className={className}
      data-grid-section-id={sectionId}
      data-grid-depth={depth}
      data-grid-row-count={renderedRowCount}
      style={
        {
          width: getLogicalGridSize(columnCount),
          height: `calc(${getLogicalGridSize(rowProjection.getDisplayRow(renderedRowCount))}px * var(--board-grid-row-scale, 1))`,
          "--board-grid-pitch": `${LOGICAL_GRID_PITCH}px`,
        } as CSSProperties
      }
    >
      {transactionPlacements.map((placement) => {
        return (
          <DndGridEntry
            key={placement.id}
            sectionId={sectionId}
            placement={placement}
            label={labelById.get(placement.id) ?? placement.id}
            columnCount={columnCount}
            maxRowCount={maxRowCount}
            element={entryElements.get(placement.id) ?? null}
          />
        );
      })}
      <GridPreviewLayer
        sectionId={sectionId}
        rowCount={rowCount}
        maxRowCount={maxRowCount}
        placements={placements}
        logicalPlacements={transactionPlacements}
        minimumDisplayHeights={minimumDisplayHeights}
        gridRef={gridRef}
        entryElements={entryElements}
        interactionStore={interactionStore}
      />
      <AddInPlaceGridLayer
        sectionId={sectionId}
        columnCount={columnCount}
        rowCount={rowCount}
        maxRowCount={maxRowCount}
        placements={placements}
        rowProjection={rowProjection}
        entryElements={entryElements}
        onRowCountChange={setAddInPlaceRowCount}
      />
      <span
        data-grid-runtime="homarr-dnd-kit-v1"
        data-editor-section-id={sectionId}
        aria-hidden="true"
        style={{ position: "absolute", width: 1, height: 1, pointerEvents: "none" }}
      />
    </div>
  );
}

const DndGridEntryComponent = ({ sectionId, placement, label, element }: DndGridEntryProps) => {
  const { beginResize, previewResize, completeResize, cancelResize, getDisplayedPlacement, getLogicalPointerPosition } =
    useBoardGridEditorActions();
  const placementRef = useRef(placement);
  placementRef.current = placement;
  const resizeOutlineController = useMemo(
    () =>
      createGridResizeOutlineController(
        () => element,
        () => placementRef.current,
        (previewPlacement) =>
          getDisplayedPlacement(sectionId, { ...previewPlacement, type: placementRef.current.type }),
      ),
    [element, getDisplayedPlacement, sectionId],
  );
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
  const modifiers = useMemo(
    () => [
      RestrictToElement.configure({
        element: () => element?.closest('[data-testid="board-canvas"]') ?? null,
      }),
    ],
    [element],
  );
  const { isDragSource, isDropping } = useDraggable<GridEntryData>({
    id: placement.id,
    type: GRID_ENTRY_TYPE,
    data: sourceData,
    element,
    handle: element,
    disabled: element === null,
    sensors,
    modifiers,
  });
  useEffect(() => () => resizeOutlineController.destroy(), [resizeOutlineController]);

  useLayoutEffect(() => {
    if (!element) return;
    if (isDragSource) element.dataset.dndDragSource = "true";
    else delete element.dataset.dndDragSource;
    if (isDropping) element.dataset.dndDropping = "true";
    else delete element.dataset.dndDropping;
    return () => {
      delete element.dataset.dndDragSource;
      delete element.dataset.dndDropping;
    };
  }, [element, isDragSource, isDropping]);

  if (!element) return null;

  return createPortal(
    <>
      <GridResizeHandles
        sectionId={sectionId}
        placement={placement}
        label={label}
        beginResize={beginResize}
        previewResize={previewResize}
        completeResize={completeResize}
        cancelResize={cancelResize}
        scheduleResizeOutline={resizeOutlineController.schedule}
        getLogicalPointerPosition={getLogicalPointerPosition}
      />
    </>,
    element,
    `board-grid-resize-handles:${placement.id}`,
  );
};

const DndGridEntry = memo(DndGridEntryComponent, areDndGridEntryPropsEqual);

interface GridResizeHandlesProps {
  sectionId: string;
  placement: SectionGridPlacement;
  label: string;
  beginResize: BoardGridEditorActionsContextValue["beginResize"];
  previewResize: BoardGridEditorActionsContextValue["previewResize"];
  completeResize: BoardGridEditorActionsContextValue["completeResize"];
  cancelResize: BoardGridEditorActionsContextValue["cancelResize"];
  scheduleResizeOutline: (preview: { placement: SectionGridPlacement; valid: boolean } | null) => void;
  getLogicalPointerPosition: BoardGridEditorActionsContextValue["getLogicalPointerPosition"];
}

const RESIZE_DIRECTIONS: readonly GridResizeDirection[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

const GridResizeHandles = ({
  sectionId,
  placement,
  label,
  beginResize,
  previewResize,
  completeResize,
  cancelResize,
  scheduleResizeOutline,
  getLogicalPointerPosition,
}: GridResizeHandlesProps) => {
  const pointerStartRef = useRef<{
    id: number;
    handle: HTMLSpanElement;
    x: number;
    y: number;
    direction: GridResizeDirection;
    visualScale: { x: number; y: number };
    placement: SectionGridPlacement;
  } | null>(null);
  const escapeListenerRef = useRef<((event: KeyboardEvent) => void) | null>(null);

  useEffect(
    () => () => {
      const listener = escapeListenerRef.current;
      if (listener) window.removeEventListener("keydown", listener, { capture: true });
    },
    [],
  );

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

  const removeEscapeListener = () => {
    const listener = escapeListenerRef.current;
    if (!listener) return;
    window.removeEventListener("keydown", listener, { capture: true });
    escapeListenerRef.current = null;
  };

  const finishResize = (pointerId: number, current: { x: number; y: number } | null, canceled: boolean) => {
    const started = pointerStartRef.current;
    if (!started || started.id !== pointerId) return;

    pointerStartRef.current = null;
    scheduleResizeOutline(null);
    removeEscapeListener();
    if (started.handle.hasPointerCapture(pointerId)) started.handle.releasePointerCapture(pointerId);

    if (canceled || !current) {
      cancelResize();
      return;
    }

    const delta = getSnappedGridDelta({
      initial: { x: started.x, y: started.y },
      current: getLogicalPointerPosition(sectionId, current),
      visualScale: started.visualScale,
    });
    if (delta) update(started.direction, delta.x, delta.y);
    completeResize();
  };

  const handleEscape = (event: KeyboardEvent) => {
    const started = pointerStartRef.current;
    if (event.key !== "Escape" || !started) return;
    event.preventDefault();
    event.stopPropagation();
    finishResize(started.id, null, true);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLSpanElement>, direction: GridResizeDirection) => {
    const visualScale = getEntryVisualScale(event.currentTarget.parentElement, placement);
    if (!event.isPrimary || event.button !== 0 || pointerStartRef.current || !visualScale || !start(direction)) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      cancelResize();
      return;
    }
    pointerStartRef.current = {
      id: event.pointerId,
      handle: event.currentTarget,
      ...getLogicalPointerPosition(sectionId, { x: event.clientX, y: event.clientY }),
      direction,
      visualScale,
      placement: { ...placement },
    };
    escapeListenerRef.current = handleEscape;
    window.addEventListener("keydown", handleEscape, { capture: true });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const started = pointerStartRef.current;
    if (!started || started.id !== event.pointerId) return;
    event.preventDefault();
    const input = {
      initial: { x: started.x, y: started.y },
      current: getLogicalPointerPosition(sectionId, { x: event.clientX, y: event.clientY }),
      visualScale: started.visualScale,
    };
    const snappedDelta = getSnappedGridDelta(input);
    if (!snappedDelta) return;
    const acceptedPlacement = update(started.direction, snappedDelta.x, snappedDelta.y);
    scheduleResizeOutline({
      placement: acceptedPlacement ?? started.placement,
      valid: acceptedPlacement !== null,
    });
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLSpanElement>, canceled: boolean) => {
    finishResize(event.pointerId, { x: event.clientX, y: event.clientY }, canceled);
  };

  return RESIZE_DIRECTIONS.map((direction) => {
    const isHorizontalSide = direction === "n" || direction === "s";
    const isVerticalSide = direction === "e" || direction === "w";
    const GripIcon = isHorizontalSide ? IconGripHorizontal : IconGripVertical;

    return (
      <span
        key={direction}
        className="board-grid-resize-handle"
        data-grid-resize-handle={direction}
        aria-hidden="true"
        onPointerDown={(event) => handlePointerDown(event, direction)}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => handlePointerEnd(event, false)}
        onPointerCancel={(event) => handlePointerEnd(event, true)}
        onLostPointerCapture={(event) => finishResize(event.pointerId, null, true)}
      >
        <GripIcon size={isHorizontalSide || isVerticalSide ? 13 : 15} stroke={2.25} />
      </span>
    );
  });
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

const preventGridDragActivation = (event: PointerEvent, source: DomDraggable) => {
  if (document.body.hasAttribute("data-board-grid-interacting")) return true;
  if (event.metaKey || event.ctrlKey) return true;
  const target = event.target;
  const activationElement = source.handle ?? source.element;
  if (!(target instanceof Element) || target === activationElement) return false;
  const targetShell = target.closest(".board-grid-entry");
  if (targetShell && targetShell !== activationElement) return true;
  const interactive = target.closest(
    'a,button,input,textarea,select,option,[contenteditable="true"],[role="button"],[data-grid-no-drag],.board-grid-resize-handle',
  );
  return Boolean(interactive && activationElement?.contains(interactive));
};

const getEntryVisualScale = (element: HTMLElement | null, placement: SectionGridPlacement) => {
  if (!element) return null;
  const rectangle = element.getBoundingClientRect();
  const horizontalScale = rectangle.width / getLogicalGridSize(placement.w);
  const rowScale = Number.parseFloat(getComputedStyle(element).getPropertyValue("--board-grid-row-scale")) || 1;
  const scale = { x: horizontalScale, y: horizontalScale * rowScale };
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
      if (plugin === AutoScroller) return AutoScroller.configure({ acceleration: 24, threshold: { x: 0, y: 0.16 } });
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
