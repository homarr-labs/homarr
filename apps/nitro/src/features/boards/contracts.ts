import type { InferClientInputs, InferClientOutputs } from "@orpc/client";
import type { RouterClient } from "@orpc/server";
import type { ReactNode } from "react";

import type { createBoardProcedures } from "../../../../../packages/api/src/nitro/routers/board";
import type { createBoardMutationProcedures } from "../../../../../packages/api/src/nitro/routers/board-mutations";
import type { createAppProcedures } from "../../../../../packages/api/src/nitro/routers/app";
import type { BoardMutationResources } from "../../../../../packages/api/src/nitro/routers/-board-mutations/resources";
import type { projectBoardLayout } from "../../../../../packages/boards/src/layout-preview";
import type { getSafeAppHref } from "../../../../../packages/common/src/url";
import type { containerSectionOptionsSchema } from "../../../../../packages/validation/src/shared";

export type BoardClient = {
  board: RouterClient<ReturnType<typeof createBoardProcedures> & ReturnType<typeof createBoardMutationProcedures>>;
};
export type BoardAppsClient = { app: Pick<RouterClient<ReturnType<typeof createAppProcedures>>, "byIds"> };
export type BoardInputs = InferClientInputs<BoardClient>["board"];
export type BoardOutputs = InferClientOutputs<BoardClient>["board"];
export type Board = BoardOutputs["getBoardByName"];
export type BoardItem = Board["items"][number];
export type BoardSection = Board["sections"][number];
export type BoardContainer = Extract<BoardSection, { kind: "container" }>;
export type BoardRoot = Extract<BoardSection, { kind: "empty" }>;
export type BoardLayout = Board["layouts"][number];
export type BoardSettings = BoardOutputs["getBoardSettings"];
export type BoardPermission = BoardInputs["saveUserBoardPermissions"]["permissions"][number];
export type BoardLane = "left" | "main" | "right";
export type BoardTarget = { kind: "home" } | { kind: "named"; name: string };

export interface BoardIdentity {
  userId: string | null;
  permissions: readonly string[];
  resourceKey: string;
}

export interface BoardDomainResources {
  common: Pick<BoardMutationResources["common"], "createId" | "getLayoutResizeSource" | "serializeLayoutResizeSource">;
  definitions: Pick<
    BoardMutationResources["definitions"],
    "getBoardLaneColumnCount" | "getRootSectionLane" | "rootSectionOffsets"
  >;
  schemas: Pick<
    BoardMutationResources["schemas"],
    | "boardSaveSchema"
    | "boardSaveLayoutsSchema"
    | "boardSavePartialSettingsSchema"
    | "boardSavePermissionsSchema"
    | "boardCreateSchema"
  > & { containerSectionOptionsSchema: typeof containerSectionOptionsSchema };
  projectBoardLayout: typeof projectBoardLayout;
  resolvePinnedGridCollisions: <TPlacement extends GridPlacement>(
    placements: readonly TPlacement[],
    pinned: TPlacement,
    columnCount: number,
  ) => TPlacement[];
  getCollapsedDisplayLayout: <TPlacement extends GridPlacement>(
    placements: readonly TPlacement[],
    options: { columnCount: number; collapsedItemIds: ReadonlySet<string>; collapsedRowCount?: number },
  ) => TPlacement[];
  getSafeAppHref: typeof getSafeAppHref;
}

export interface GridPlacement {
  id: string;
  type: "item" | "section";
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface GridSnapshot {
  layoutId: string;
  sectionId: string;
  placements: readonly GridPlacement[];
}

export interface BoardItemRenderContext {
  board: Board;
  layoutId: string;
  editing: boolean;
  canModify: boolean;
}

export type BoardItemRenderer = (item: BoardItem, context: BoardItemRenderContext) => ReactNode;

export interface CapturedBoardWidgetEditorOwner {
  isCurrent(): boolean;
}

export interface BoardWidgetEditorChangeOwner {
  isCurrentOwner(): boolean;
  captureChangeOwner(): CapturedBoardWidgetEditorOwner;
}

export interface BoardWidgetEditorUpstreamCapture {
  readonly request: CapturedBoardWidgetEditorOwner;
  readonly query: CapturedBoardWidgetEditorOwner;
  readonly authority: CapturedBoardWidgetEditorOwner;
  readonly presentation: CapturedBoardWidgetEditorOwner;
}

export interface BoardWidgetEditorUpstreamOwner {
  isCurrentOwner(): boolean;
  captureChangeOwner(): BoardWidgetEditorUpstreamCapture;
}

export interface BoardWidgetEditorComposition {
  readonly upstreamOwner: BoardWidgetEditorUpstreamOwner;
  renderWidgetEditor(input: BoardWidgetEditorInput): ReactNode;
}

export interface BoardWidgetEditorInput extends BoardWidgetEditorChangeOwner {
  board: Board;
  item: BoardItem | null;
  itemId: string;
  readonly upstreamOwner: BoardWidgetEditorUpstreamCapture;
  canConfigureCustomWidgets: boolean;
  error: Error | null;
  onApply: (item: BoardItem) => void;
  onCancel: () => void;
}

export const boardWidgetCompositionHold = {
  kind: "hold",
  reason: "Genuine board request/query/authority/presentation ownership and widget editor composition are pending",
} as const;

export const boardDraftPersistenceHold = {
  kind: "hold",
  reason: "Board current-authority and whole-draft atomic commit are not ready",
} as const;

export function getBoardAccess(
  board: {
    creator: { id: string } | null;
    isPublic: boolean;
    userPermissions: readonly { permission: BoardPermission["permission"] }[];
    groupPermissions: readonly { permission: BoardPermission["permission"] }[];
  },
  identity: BoardIdentity,
) {
  const authenticated = identity.userId !== null;
  const creator = authenticated && board.creator?.id === identity.userId;
  const permissions = authenticated ? [...board.userPermissions, ...board.groupPermissions] : [];
  const full =
    creator ||
    permissions.some(({ permission }) => permission === "full") ||
    identity.permissions.includes("board-full-all");
  const modify =
    full ||
    permissions.some(({ permission }) => permission === "modify") ||
    identity.permissions.includes("board-modify-all");
  const view = board.isPublic || creator || permissions.length > 0 || identity.permissions.includes("board-view-all");
  return { full: authenticated && full, modify: authenticated && modify, view };
}

export function boardHref(name: string, layoutId?: string) {
  const pathname = `/boards/${encodeURIComponent(name)}`;
  return layoutId ? `${pathname}?layout=${encodeURIComponent(layoutId)}` : pathname;
}
