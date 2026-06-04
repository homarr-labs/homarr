import type { Database } from "@homarr/db";

import { loadBoardGraphAsync } from "./load-board-graph";
import { serializeBoardToBundleAsync } from "./serialize-board";
import { bundleFilenameForBoard, bundleToJson } from "./to-json";

export const exportBoardBundleAsync = async (db: Database, boardId: string, homarrVersion: string) => {
  const board = await loadBoardGraphAsync(db, boardId);
  if (!board) {
    return null;
  }

  const bundle = await serializeBoardToBundleAsync(db, board, homarrVersion);
  return {
    bundle,
    filename: bundleFilenameForBoard(board.name),
    content: bundleToJson(bundle),
  };
};

export { loadBoardGraphAsync } from "./load-board-graph";
export { serializeBoardToBundleAsync } from "./serialize-board";
export { bundleToJson, bundleFilenameForBoard } from "./to-json";
