import type { GridPlacement } from "~/components/board/layout";

/** A positioned grid with optional ownership metadata for nested containers. */
export interface TransactionalGrid<TPlacement extends GridPlacement = GridPlacement> {
  id: string;
  columnCount: number;
  maxRowCount?: number | null;
  /** The grid containing the placement that owns this nested grid. */
  parentGridId?: string | null;
  /** The container placement whose content is rendered by this grid. */
  ownerPlacementId?: string | null;
  placements: readonly TPlacement[];
}

/** The complete layout that must change atomically for cross-grid operations. */
export interface TransactionalGridState<TPlacement extends GridPlacement = GridPlacement> {
  grids: readonly TransactionalGrid<TPlacement>[];
}

/**
 * A drag or resize transaction. Every preview is recomputed from `snapshot`,
 * never from the previous preview, so noisy drag-over events cannot accumulate
 * coordinate drift.
 */
export interface GridTransaction<TPlacement extends GridPlacement = GridPlacement> {
  activeId: string;
  sourceGridId: string;
  snapshot: TransactionalGridState<TPlacement>;
  preview: TransactionalGridState<TPlacement>;
}

export interface BeginGridTransactionInput {
  activeId: string;
  /** Optional disambiguation and stale-event protection. */
  sourceGridId?: string;
}

export interface GridMoveInput {
  targetGridId: string;
  x: number;
  y: number;
}

export type GridResizeDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export interface GridResizeInput {
  direction: GridResizeDirection;
  /** Signed displacement of the resize handle in grid columns. */
  deltaColumns: number;
  /** Signed displacement of the resize handle in grid rows. */
  deltaRows: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface GridOperationRejection {
  code:
    | "descendant-target"
    | "guard-rejected"
    | "invalid-coordinate"
    | "item-too-large"
    | "resize-constraints"
    | "row-limit"
    | "unknown-target-grid"
    | (string & {});
  message?: string;
}

export interface GridMoveGuardContext<TPlacement extends GridPlacement = GridPlacement> {
  active: TPlacement;
  sourceGrid: TransactionalGrid<TPlacement>;
  targetGrid: TransactionalGrid<TPlacement>;
  snapshot: TransactionalGridState<TPlacement>;
  /** True when the target is owned by the active container or one of its descendants. */
  targetIsDescendant: boolean;
}

export type GridMoveGuardResult = boolean | GridOperationRejection;
export type GridMoveGuard<TPlacement extends GridPlacement = GridPlacement> = (
  context: GridMoveGuardContext<TPlacement>,
) => GridMoveGuardResult;

export interface GridMoveOptions<TPlacement extends GridPlacement = GridPlacement> {
  guards?: readonly GridMoveGuard<TPlacement>[];
}

export type GridPreviewResult<TPlacement extends GridPlacement = GridPlacement> =
  | {
      accepted: true;
      transaction: GridTransaction<TPlacement>;
    }
  | {
      accepted: false;
      transaction: GridTransaction<TPlacement>;
      rejection: GridOperationRejection;
    };
