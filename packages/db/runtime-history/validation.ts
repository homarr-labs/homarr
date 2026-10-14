import { Buffer } from "node:buffer";

const maximumSequence = 9223372036854775807n;

export const requirePositiveInteger = (value: number, label: string): number => {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`Invalid history ${label}`);
  return value;
};

export const requireHistoryText = (value: unknown, maxBytes: number, label: string): number => {
  if (typeof value !== "string") throw new TypeError(`History ${label} must be SQL text`);
  if (value.length > maxBytes) throw new RangeError(`History ${label} exceeds its byte limit`);
  if (!value.isWellFormed() || value.includes("\u0000")) {
    throw new TypeError(`History ${label} must be exact UTF-8 SQL text without NUL`);
  }
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes > maxBytes) throw new RangeError(`History ${label} exceeds its byte limit`);
  return bytes;
};

export const requireEpoch = (rows: readonly unknown[], epoch: string): void => {
  const row = rows[0];
  if (rows.length !== 1 || typeof row !== "object" || row === null || !("epoch" in row) || row.epoch !== epoch) {
    throw new Error("History captured epoch is unavailable or retired");
  }
};

const decodeSequence = (value: unknown, minimum: bigint): bigint => {
  if (typeof value !== "string" || value.length > 19 || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new TypeError("Invalid history decimal sequence");
  }
  const sequence = BigInt(value);
  if (sequence < minimum || sequence > maximumSequence) throw new RangeError("Invalid history sequence range");
  return sequence;
};

export const requireHead = (rows: readonly unknown[]): bigint => {
  const row = rows[0];
  if (rows.length !== 1 || typeof row !== "object" || row === null || !("head_sequence" in row)) {
    throw new Error("History stream header is unavailable");
  }
  return decodeSequence(row.head_sequence, 0n);
};

export const nextSequence = (rows: readonly unknown[]): string => {
  const head = requireHead(rows);
  if (head === maximumSequence) throw new RangeError("History sequence overflow");
  return (head + 1n).toString();
};

const requireClock = (value: unknown): void => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 8640000000000000) {
    throw new RangeError("Invalid history database clock");
  }
};

export const requireClockObservation = (rows: readonly unknown[]): void => {
  const row = rows[0];
  if (rows.length !== 1 || typeof row !== "object" || row === null || !("now" in row)) {
    throw new Error("History database clock is unavailable");
  }
  requireClock(row.now);
};

export const requireAffectedRows = (value: unknown, expected?: number): void => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid history SQL effect metadata");
  }
  if (expected !== undefined && value !== expected) throw new Error("History SQL effect did not match its locked row");
};

export const decodeNewest = (
  rows: readonly unknown[],
  epoch: string,
  maxEntries: number,
  maxPayloadBytes: number,
): readonly string[] => {
  if (rows.length < 1 || rows.length > Math.max(1, maxEntries)) {
    throw new Error("Invalid history snapshot row count");
  }
  const payloads: string[] = [];
  let previous = maximumSequence + 1n;
  for (const row of rows) {
    if (
      typeof row !== "object" ||
      row === null ||
      !("epoch" in row) ||
      row.epoch !== epoch ||
      !("now" in row) ||
      !("sequence" in row) ||
      !("payload" in row)
    ) {
      throw new Error("History snapshot epoch or row is unavailable");
    }
    requireClock(row.now);
    if (row.sequence === null && row.payload === null && rows.length === 1) return payloads;
    const sequence = decodeSequence(row.sequence, 1n);
    if (sequence >= previous) throw new Error("History snapshot is not in descending sequence order");
    previous = sequence;
    requireHistoryText(row.payload, maxPayloadBytes, "stored payload");
    if (typeof row.payload !== "string") throw new TypeError("Invalid history payload");
    payloads.push(row.payload);
  }
  return payloads;
};
