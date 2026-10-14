import type { GridPlacement } from "../layout";

export interface TransactionalGrid<TPlacement extends GridPlacement = GridPlacement> {
  id: string;
  columnCount: number;
  maxRowCount?: number | null;
  parentGridId?: string | null;
  ownerPlacementId?: string | null;
  placements: readonly TPlacement[];
}
export interface TransactionalGridState<TPlacement extends GridPlacement = GridPlacement> {
  grids: readonly TransactionalGrid<TPlacement>[];
}
export interface GridTransaction<TPlacement extends GridPlacement = GridPlacement> {
  activeId: string;
  sourceGridId: string;
  snapshot: TransactionalGridState<TPlacement>;
  preview: TransactionalGridState<TPlacement>;
}
export interface BeginGridTransactionInput {
  activeId: string;
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
  deltaColumns: number;
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
  | { accepted: true; transaction: GridTransaction<TPlacement> }
  | { accepted: false; transaction: GridTransaction<TPlacement>; rejection: GridOperationRejection };
