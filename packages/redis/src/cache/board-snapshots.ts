import { Buffer } from "node:buffer";

import type { SerializedStringCache } from "./contracts";

export const boardSnapshotVersion = "board-widget-queries-v1";
export const boardSnapshotMaxAgeMs = 259_200_000;
export const boardSnapshotMaxBytes = 512 * 1024;

export interface BoardSnapshotIdentity {
  boardId: string;
  boardContentFingerprint: string;
}

export interface SerializedBoardSnapshotStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const createSerializedBoardSnapshotStorage = (
  cache: SerializedStringCache,
  identity: BoardSnapshotIdentity,
): SerializedBoardSnapshotStorage => {
  const logicalKey = `${boardSnapshotVersion}:${identity.boardId}:${identity.boardContentFingerprint}`;

  return {
    getItem: async (_key) => await cache.getAsync(logicalKey),
    setItem: async (_key, value) => {
      if (Buffer.byteLength(value) > boardSnapshotMaxBytes) return;
      await cache.setAsync(logicalKey, value, { ttlMs: boardSnapshotMaxAgeMs });
    },
    removeItem: async (_key) => await cache.removeAsync(logicalKey),
  };
};
