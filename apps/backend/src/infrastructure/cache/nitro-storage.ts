import { Buffer } from "node:buffer";

import { useStorage } from "nitro/storage";
import { z } from "zod";

import { boardSnapshotMaxBytes, createSerializedBoardSnapshotStorage } from "./board-snapshots";
import type { BoardSnapshotIdentity, SerializedBoardSnapshotStorage } from "./board-snapshots";
import { SerializedCacheTimeoutError } from "./contracts";
import type { SerializedCacheOperation, SerializedCacheWriteOptions, SerializedStringCacheOwner } from "./contracts";

export const boardSnapshotPrivateMount = "homarr-board-query-snapshots";

export interface NitroBoardSnapshotCacheOptions {
  expectedDriver: "fs" | "memory";
  operationTimeoutMs?: number;
}

export interface NitroBoardSnapshotStorageOwner {
  createStorage(identity: BoardSnapshotIdentity): SerializedBoardSnapshotStorage;
  stopAsync(): Promise<void>;
}

interface SerializedCacheEnvelope {
  type: "homarr-serialized-cache";
  version: 1;
  logicalKey: string;
  value: string;
  expiresAtMs: number | null;
}

let activeOwner: symbol | undefined;

const encodeLogicalKey = (key: string) => {
  if (key.length > 512) throw new Error("Serialized cache logical key exceeds its code-unit limit");
  const segments: string[] = [];
  for (let offset = 0; offset < key.length; offset += 16) {
    let segment = "";
    for (let index = offset; index < Math.min(offset + 16, key.length); index++) {
      segment += key.charCodeAt(index).toString(16).padStart(4, "0");
    }
    segments.push(segment);
  }
  return `entry-v1:${segments.length === 0 ? "empty" : segments.join(":")}:value`;
};

const getTtlMs = (options: SerializedCacheWriteOptions | undefined) => {
  const ttlMs =
    options?.ttlMs !== undefined ? options.ttlMs : options?.ttlSeconds === undefined ? null : options.ttlSeconds * 1000;
  if (ttlMs !== null && !Number.isFinite(ttlMs)) throw new Error("Serialized cache TTL must be finite");
  return ttlMs;
};

export const createNitroBoardSnapshotCacheOwner = (
  options: NitroBoardSnapshotCacheOptions,
): SerializedStringCacheOwner => {
  if (activeOwner !== undefined) throw new Error("The board snapshot private mount already has a cache owner");

  const operationTimeoutMs = options.operationTimeoutMs ?? 750;
  if (!Number.isInteger(operationTimeoutMs) || operationTimeoutMs < 1 || operationTimeoutMs > 60_000) {
    throw new Error("Serialized cache caller deadline must be between 1 and 60000 milliseconds");
  }

  const expectedDriver = options.expectedDriver;
  if (expectedDriver !== "fs" && expectedDriver !== "memory") {
    throw new Error("The board snapshot cache requires an explicitly selected supported driver");
  }
  const storage = useStorage<SerializedCacheEnvelope>(boardSnapshotPrivateMount);
  const mountedDriver = storage.getMount(boardSnapshotPrivateMount);
  const expectedMountBase = `${boardSnapshotPrivateMount}:`;
  if (mountedDriver.base !== expectedMountBase || mountedDriver.driver.name !== expectedDriver) {
    throw new Error("The configured board snapshot private mount and driver are required");
  }
  if (typeof mountedDriver.driver.setItem !== "function" || typeof mountedDriver.driver.removeItem !== "function") {
    throw new Error("The board snapshot private mount must support writes and removals");
  }
  if (expectedDriver === "fs") {
    const driverOptions: unknown = mountedDriver.driver.options;
    if (
      typeof driverOptions !== "object" ||
      driverOptions === null ||
      !("atomic" in driverOptions) ||
      driverOptions.atomic !== true ||
      ("readOnly" in driverOptions && driverOptions.readOnly !== undefined && driverOptions.readOnly !== false)
    ) {
      throw new Error("The filesystem snapshot mount must explicitly allow atomic writes");
    }
  }

  const envelopeSchema = z.strictObject({
    type: z.literal("homarr-serialized-cache"),
    version: z.literal(1),
    logicalKey: z.string(),
    value: z.string().max(boardSnapshotMaxBytes),
    expiresAtMs: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  });
  const lanes = new Map<string, Promise<void>>();
  const pending = new Set<Promise<void>>();
  const ownershipToken = Symbol();
  let accepting = true;
  let stopPromise: Promise<void> | undefined;
  activeOwner = ownershipToken;

  const assertBinding = (physicalKey: string) => {
    const currentMount = storage.getMount(`${boardSnapshotPrivateMount}:${physicalKey}`);
    if (currentMount.base !== expectedMountBase || currentMount.driver !== mountedDriver.driver) {
      throw new Error("The board snapshot private mount binding changed");
    }
  };

  const runAsync = async <T>(
    key: string,
    operation: SerializedCacheOperation,
    executeAsync: (physicalKey: string) => Promise<T>,
  ): Promise<T> => {
    if (!accepting) throw new Error("The board snapshot cache owner is stopping or stopped");
    if (pending.size >= 100) throw new Error("The board snapshot cache pending operation limit was reached");

    const physicalKey = encodeLogicalKey(key);
    const previous = lanes.get(physicalKey) ?? Promise.resolve();
    let timedOut = false;
    let nativeWorkStarted = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const actualOperation = previous.then(async () => {
      if (timedOut) throw new SerializedCacheTimeoutError(operation, false);
      assertBinding(physicalKey);
      nativeWorkStarted = true;
      return await executeAsync(physicalKey);
    });
    const settlement = actualOperation.then(
      () => undefined,
      () => undefined,
    );
    lanes.set(physicalKey, settlement);
    pending.add(settlement);
    void settlement.then(() => {
      clearTimeout(timeout);
      pending.delete(settlement);
      if (lanes.get(physicalKey) === settlement) lanes.delete(physicalKey);
    });

    try {
      return await Promise.race([
        actualOperation,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => {
            timedOut = true;
            reject(new SerializedCacheTimeoutError(operation, nativeWorkStarted));
          }, operationTimeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    getAsync: async (key) =>
      await runAsync(key, "get", async (physicalKey) => {
        const stored: unknown = await storage.getItem<unknown>(physicalKey);
        if (stored === null) return null;
        if (stored instanceof Error) throw stored;
        const parsed = envelopeSchema.safeParse(stored);
        if (
          !parsed.success ||
          parsed.data.logicalKey !== key ||
          Buffer.byteLength(parsed.data.value) > boardSnapshotMaxBytes ||
          (parsed.data.expiresAtMs !== null && parsed.data.expiresAtMs <= Date.now())
        ) {
          assertBinding(physicalKey);
          await storage.removeItem(physicalKey);
          return null;
        }
        return parsed.data.value;
      }),
    setAsync: async (key, value, writeOptions) => {
      const ttlMs = getTtlMs(writeOptions);
      if (ttlMs !== null && ttlMs <= 0) {
        await runAsync(key, "set", async (physicalKey) => await storage.removeItem(physicalKey));
        return;
      }
      if (Buffer.byteLength(value) > boardSnapshotMaxBytes) {
        throw new Error("Serialized board snapshot exceeds its byte limit");
      }
      await runAsync(key, "set", async (physicalKey) => {
        const expiresAtMs = ttlMs === null ? null : Date.now() + ttlMs;
        if (expiresAtMs !== null && (!Number.isFinite(expiresAtMs) || expiresAtMs > Number.MAX_SAFE_INTEGER)) {
          throw new Error("Serialized cache expiry exceeds its supported millisecond range");
        }
        const envelope: SerializedCacheEnvelope = {
          type: "homarr-serialized-cache",
          version: 1,
          logicalKey: key,
          value,
          expiresAtMs,
        };
        await storage.setItem(physicalKey, envelope);
      });
    },
    removeAsync: async (key) =>
      await runAsync(key, "remove", async (physicalKey) => await storage.removeItem(physicalKey)),
    stopAsync: () => {
      if (stopPromise) return stopPromise;
      accepting = false;
      stopPromise = Promise.all(pending).then(() => {
        lanes.clear();
        if (activeOwner === ownershipToken) activeOwner = undefined;
      });
      return stopPromise;
    },
  };
};

export const createNitroBoardSnapshotStorageOwner = (
  options: NitroBoardSnapshotCacheOptions,
): NitroBoardSnapshotStorageOwner => {
  const cache = createNitroBoardSnapshotCacheOwner(options);
  let accepting = true;

  return {
    createStorage: (identity) => {
      if (!accepting) throw new Error("The board snapshot cache owner is stopping or stopped");
      return createSerializedBoardSnapshotStorage(cache, identity);
    },
    stopAsync: () => {
      accepting = false;
      return cache.stopAsync();
    },
  };
};
