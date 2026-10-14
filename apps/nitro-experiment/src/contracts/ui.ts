import type { QueryClient } from "@tanstack/react-query";

import type { FixtureClient } from "../server/api/client";
import type { BoardProjection, BoardSnapshot, Bootstrap, WidgetSnapshot } from "./schemas";

export type { RenderAssets } from "./schemas";

export interface BoardDataAdapter {
  readSnapshot(boardId: BoardProjection["id"]): Promise<BoardSnapshot>;
}

export interface WidgetSlotProps {
  board: BoardProjection;
  snapshot: WidgetSnapshot;
  client: FixtureClient;
  queryClient: QueryClient;
}

export interface EditorSlotProps {
  board: BoardProjection;
  client: FixtureClient;
  queryClient: QueryClient;
  onCommitted(board: BoardProjection): Promise<void>;
}

export interface SessionSlotProps {
  client: FixtureClient;
  queryClient: QueryClient;
  onSessionChanged(): Promise<void>;
}

export interface BoardViewerProps {
  snapshot: BoardSnapshot;
  client: FixtureClient;
  queryClient: QueryClient;
  onCommitted(board: BoardProjection): Promise<void>;
  onSessionChanged(): Promise<void>;
}

export interface BootstrapScriptProps {
  bootstrap?: Bootstrap;
}
