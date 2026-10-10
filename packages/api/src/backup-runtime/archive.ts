import { inflateRawSync } from "node:zlib";

import { BackupError } from "./contracts";
import type { BackupMetadata } from "./contracts";

const mebibyte = 1024 * 1024;

export const backupLimits = {
  compressed: 256 * mebibyte,
  multipart: 257 * mebibyte,
  database: 512 * mebibyte,
  archive: 514 * mebibyte,
  metadata: mebibyte,
  key: 1024,
} as const;

interface ZipEntry {
  name: string;
  flags: number;
  method: number;
  crc: number;
  compressed: number;
  size: number;
  offset: number;
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  return crc >>> 0;
});

export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ (crcTable[(crc ^ byte) & 0xff] ?? 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function invalid(): never {
  throw new BackupError("invalid-archive");
}

function safeName(bytes: Uint8Array) {
  const name = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (
    !name ||
    name.startsWith("/") ||
    /[\\:]/.test(name) ||
    [...name].some((character) => character.charCodeAt(0) < 32)
  )
    invalid();
  const segments = name.replace(/\/$/, "").split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) invalid();
  return name;
}

function readEntries(bytes: Buffer): Map<string, ZipEntry> {
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50 && offset + 22 + bytes.readUInt16LE(offset + 20) === bytes.length) {
      end = offset;
      break;
    }
  }
  if (end < 0) invalid();
  const count = bytes.readUInt16LE(end + 10);
  if (
    bytes.readUInt16LE(end + 4) !== 0 ||
    bytes.readUInt16LE(end + 6) !== 0 ||
    bytes.readUInt16LE(end + 8) !== count ||
    count === 65535
  )
    invalid();
  const centralSize = bytes.readUInt32LE(end + 12);
  const centralOffset = bytes.readUInt32LE(end + 16);
  if (centralOffset + centralSize !== end) invalid();
  let offset = centralOffset;
  let total = 0;
  const entries = new Map<string, ZipEntry>();
  const ranges: { start: number; end: number }[] = [];
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || bytes.readUInt32LE(offset) !== 0x02014b50) invalid();
    const nameSize = bytes.readUInt16LE(offset + 28);
    const next = offset + 46 + nameSize + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32);
    if (next > end || bytes.readUInt16LE(offset + 34) !== 0) invalid();
    const entry: ZipEntry = {
      name: safeName(bytes.subarray(offset + 46, offset + 46 + nameSize)),
      flags: bytes.readUInt16LE(offset + 8),
      method: bytes.readUInt16LE(offset + 10),
      crc: bytes.readUInt32LE(offset + 16),
      compressed: bytes.readUInt32LE(offset + 20),
      size: bytes.readUInt32LE(offset + 24),
      offset: bytes.readUInt32LE(offset + 42),
    };
    if (entries.has(entry.name) || (entry.flags & ~0x080e) !== 0 || ![0, 8].includes(entry.method)) invalid();
    total += entry.size;
    const limit =
      entry.name === "db.sqlite"
        ? backupLimits.database
        : entry.name === "metadata.json"
          ? backupLimits.metadata
          : entry.name === "encryption-key.txt"
            ? backupLimits.key
            : backupLimits.archive;
    if (entry.size > limit || total > backupLimits.archive) throw new BackupError("too-large");
    const local = entry.offset;
    if (local + 30 > centralOffset || bytes.readUInt32LE(local) !== 0x04034b50) invalid();
    const localNameSize = bytes.readUInt16LE(local + 26);
    const start = local + 30 + localNameSize + bytes.readUInt16LE(local + 28);
    if (
      start + entry.compressed > centralOffset ||
      safeName(bytes.subarray(local + 30, local + 30 + localNameSize)) !== entry.name ||
      bytes.readUInt16LE(local + 6) !== entry.flags ||
      bytes.readUInt16LE(local + 8) !== entry.method
    )
      invalid();
    if (
      !(entry.flags & 8) &&
      (bytes.readUInt32LE(local + 14) !== entry.crc ||
        bytes.readUInt32LE(local + 18) !== entry.compressed ||
        bytes.readUInt32LE(local + 22) !== entry.size)
    )
      invalid();
    ranges.push({ start: local, end: start + entry.compressed });
    entries.set(entry.name, { ...entry, offset: start });
    offset = next;
  }
  if (offset !== end) invalid();
  ranges.sort((left, right) => left.start - right.start);
  for (let index = 1; index < ranges.length; index++) {
    const previous = ranges[index - 1];
    const current = ranges[index];
    if (!previous || !current || current.start < previous.end) invalid();
  }
  return entries;
}

function extract(bytes: Buffer, entry: ZipEntry) {
  if (entry.method === 0 && entry.compressed !== entry.size) invalid();
  const compressed = bytes.subarray(entry.offset, entry.offset + entry.compressed);
  const content =
    entry.method === 0
      ? Buffer.from(compressed)
      : inflateRawSync(compressed, { maxOutputLength: Math.max(1, entry.size) });
  if (content.length !== entry.size || crc32(content) !== entry.crc) invalid();
  return content;
}

function readMetadata(bytes: Uint8Array): { metadata: BackupMetadata; sourceKey?: string } {
  const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid();
  const record = value as Record<string, unknown>;
  if (record.dbDialect !== "sqlite") throw new BackupError("unsupported-dialect");
  if (
    typeof record.homarrVersion !== "string" ||
    !record.homarrVersion ||
    typeof record.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(record.exportedAt))
  )
    invalid();
  if (record.encryptionKey !== undefined && record.encryptionKey !== null && typeof record.encryptionKey !== "string")
    throw new BackupError("invalid-key");
  return {
    metadata: { homarrVersion: record.homarrVersion, exportedAt: record.exportedAt, dbDialect: "sqlite" },
    sourceKey: typeof record.encryptionKey === "string" && record.encryptionKey ? record.encryptionKey : undefined,
  };
}

export class ParsedLegacyArchive {
  readonly #database: Buffer;
  readonly #sourceKey: string | undefined;
  constructor(
    readonly metadata: BackupMetadata,
    database: Buffer,
    sourceKey?: string,
  ) {
    this.#database = database;
    this.#sourceKey = sourceKey;
  }
  get carriesEncryptionKey() {
    return this.#sourceKey !== undefined;
  }
  withServerContents<T>(work: (database: Uint8Array, sourceKey?: string) => T): T {
    return work(this.#database, this.#sourceKey);
  }
  toJSON() {
    return { metadata: this.metadata, carriesEncryptionKey: this.carriesEncryptionKey, scope: "sql-only-sensitive" };
  }
}

export function parseLegacyArchive(input: Uint8Array): ParsedLegacyArchive {
  if (input.byteLength > backupLimits.compressed) throw new BackupError("too-large");
  try {
    const bytes = Buffer.from(input);
    const entries = readEntries(bytes);
    const databaseEntry = entries.get("db.sqlite");
    const metadataEntry = entries.get("metadata.json");
    if (!databaseEntry || !metadataEntry) invalid();
    const database = extract(bytes, databaseEntry);
    if (database.length < 100 || database.subarray(0, 16).toString("ascii") !== "SQLite format 3\x00")
      throw new BackupError("invalid-database");
    const { metadata, sourceKey } = readMetadata(extract(bytes, metadataEntry));
    const keyEntry = entries.get("encryption-key.txt");
    const entryKey = keyEntry
      ? new TextDecoder("utf-8", { fatal: true }).decode(extract(bytes, keyEntry)).trim()
      : undefined;
    if (sourceKey && entryKey && sourceKey.toLowerCase() !== entryKey.toLowerCase())
      throw new BackupError("key-conflict");
    const key = sourceKey ?? (entryKey || undefined);
    if (key !== undefined && !/^[0-9a-fA-F]{64}$/.test(key)) throw new BackupError("invalid-key");
    return new ParsedLegacyArchive(metadata, database, key);
  } catch (error) {
    if (error instanceof BackupError) throw error;
    throw new BackupError("invalid-archive");
  }
}

export async function readBackupUploadAsync(request: Request): Promise<Uint8Array> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length))))
    throw new BackupError("invalid-archive");
  if (length !== null && Number(length) > backupLimits.multipart) throw new BackupError("too-large");
  if (!request.body) throw new BackupError("invalid-archive");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > backupLimits.multipart) {
        await reader.cancel();
        throw new BackupError("too-large");
      }
      chunks.push(chunk.value);
    }
    const body = Buffer.concat(chunks, size);
    const contentType = request.headers.get("content-type");
    if (!contentType?.startsWith("multipart/form-data;")) throw new BackupError("invalid-archive");
    const form = await new Response(body, { headers: { "content-type": contentType } }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || form.getAll("file").length !== 1) throw new BackupError("invalid-archive");
    if (file.size > backupLimits.compressed) throw new BackupError("too-large");
    return new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    if (error instanceof BackupError) throw error;
    throw new BackupError("invalid-archive");
  } finally {
    reader.releaseLock();
  }
}
