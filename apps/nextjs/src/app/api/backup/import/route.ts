import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as NodeReadableStream } from "stream/web";

import { NextResponse } from "next/server";
import BetterSqlite3 from "better-sqlite3";
import busboy from "busboy";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import yauzl from "yauzl";
import type { Entry as ZipEntry, ZipFile } from "yauzl";

import {
  getOnboardingClaimTokenFromCookieHeader,
  isClaimOnlyOnboardingAccessAllowedAsync,
} from "@homarr/api/onboarding-claim";
import { normalizeOnboardingStep } from "@homarr/api/onboarding-step";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/common/env";
import { DB_CASING } from "@homarr/core/infrastructure/db/constants";
import { dbEnv } from "@homarr/core/infrastructure/db/env";
import { db } from "@homarr/db";
import type { Database } from "@homarr/db";
import { applyCustomMigrationsAsync } from "@homarr/db/migrations/custom";
import { schema } from "@homarr/db/schema";

import { findMigrationsFolder } from "../shared";

const REQUIRED_ZIP_ENTRIES = ["db.sqlite", "metadata.json"] as const;
const ALGORITHM = "aes-256-cbc";
const HEX_KEY_REGEX = /^[0-9a-fA-F]{64}$/;
const MEBIBYTE = 1024 * 1024;
const MAX_COMPRESSED_BACKUP_BYTES = 256 * MEBIBYTE;
const MAX_MULTIPART_REQUEST_BYTES = MAX_COMPRESSED_BACKUP_BYTES + MEBIBYTE;
const MAX_UNCOMPRESSED_DATABASE_BYTES = 512 * MEBIBYTE;
const MAX_UNCOMPRESSED_ARCHIVE_BYTES = MAX_UNCOMPRESSED_DATABASE_BYTES + 2 * MEBIBYTE;
const MAX_METADATA_BYTES = MEBIBYTE;
const MAX_ENCRYPTION_KEY_BYTES = 1024;
const MAX_ARCHIVE_ENTRIES = 1024;
const UPLOAD_IDLE_TIMEOUT_MS = 60_000;
const RESTART_DELAY_MS = 500;

let restoreInProgress = false;

class BackupTooLargeError extends Error {}

const assertDeclaredRequestSize = (request: Request) => {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength === null) return;

  const parsedLength = Number(declaredLength);
  if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
    throw new Error("Invalid Content-Length header");
  }
  if (parsedLength > MAX_MULTIPART_REQUEST_BYTES) {
    throw new BackupTooLargeError("Backup upload exceeds the 256 MB limit");
  }
};

const createRequestSizeLimiter = () => {
  let totalBytes = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      totalBytes += chunk.byteLength;
      if (totalBytes > MAX_MULTIPART_REQUEST_BYTES) {
        callback(new BackupTooLargeError("Backup upload exceeds the 256 MB limit"));
        return;
      }
      callback(null, chunk);
    },
  });
};

const createUploadIdleTimeout = () => {
  let timeout: NodeJS.Timeout | undefined;
  const stream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      resetTimeout();
      callback(null, chunk);
    },
  });
  const resetTimeout = () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => stream.destroy(new Error("Backup upload timed out")), UPLOAD_IDLE_TIMEOUT_MS);
    timeout.unref();
  };
  resetTimeout();
  stream.on("close", () => {
    if (timeout) clearTimeout(timeout);
  });
  return stream;
};

const streamUploadedBackupAsync = async (request: Request, uploadPath: string): Promise<number | null> => {
  assertDeclaredRequestSize(request);
  if (!request.body) return null;

  const parser = busboy({
    headers: Object.fromEntries(request.headers.entries()),
    preservePath: false,
    limits: {
      fileSize: MAX_COMPRESSED_BACKUP_BYTES,
      files: 1,
      fields: 0,
      parts: 2,
      headerPairs: 200,
    },
  });
  let uploadSize = 0;
  let uploadFound = false;
  let uploadWrite = Promise.resolve();
  let parseError: Error | null = null;

  parser.on("file", (fieldName, file) => {
    if (fieldName !== "file" || uploadFound) {
      parseError = new Error("Unexpected file field");
      file.resume();
      return;
    }
    uploadFound = true;

    file.on("data", (chunk: Buffer) => {
      uploadSize += chunk.byteLength;
    });
    file.on("limit", () => {
      parseError = new BackupTooLargeError("Backup upload exceeds the 256 MB limit");
    });

    uploadWrite = pipeline(file, fs.createWriteStream(uploadPath, { flags: "wx" }));
    void uploadWrite.catch((error: unknown) => {
      parser.destroy(error instanceof Error ? error : new Error("Failed to store backup upload"));
    });
  });
  parser.on("field", () => {
    parseError = new Error("Unexpected form field");
  });
  parser.on("filesLimit", () => {
    parseError = new Error("Too many files");
  });
  parser.on("fieldsLimit", () => {
    parseError = new Error("Unexpected form field");
  });
  parser.on("partsLimit", () => {
    parseError = new Error("Too many form parts");
  });

  const requestStream = Readable.fromWeb(request.body as NodeReadableStream<Uint8Array>);
  try {
    await pipeline(requestStream, createUploadIdleTimeout(), createRequestSizeLimiter(), parser, {
      signal: request.signal,
    });
    await uploadWrite;
  } catch (error) {
    await uploadWrite.catch(() => undefined);
    throw error;
  }

  if (parseError) throw parseError;
  if (!uploadFound) return null;
  return uploadSize;
};

interface BackupArchiveEntries {
  database: ZipEntry;
  metadata: ZipEntry;
  encryptionKey: ZipEntry | null;
}

const openArchiveAsync = (archivePath: string) =>
  new Promise<ZipFile>((resolve, reject) => {
    yauzl.open(
      archivePath,
      { lazyEntries: true, autoClose: false, validateEntrySizes: true, strictFileNames: true },
      (error, zip) => {
        if (error) {
          reject(error);
          return;
        }
        if (!zip) {
          reject(new Error("ZIP archive could not be opened"));
          return;
        }
        resolve(zip);
      },
    );
  });

const inspectArchiveAsync = (zip: ZipFile) =>
  new Promise<BackupArchiveEntries>((resolve, reject) => {
    let database: ZipEntry | null = null;
    let metadata: ZipEntry | null = null;
    let encryptionKey: ZipEntry | null = null;
    let totalSize = 0;
    let entryCount = 0;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    zip.once("error", fail);
    zip.on("entry", (entry: ZipEntry) => {
      entryCount += 1;
      if (entryCount > MAX_ARCHIVE_ENTRIES) {
        fail(new BackupTooLargeError(`Backup archive contains more than ${MAX_ARCHIVE_ENTRIES} entries`));
        return;
      }

      const entrySize = entry.uncompressedSize;
      if (!Number.isSafeInteger(entrySize) || entrySize < 0) {
        fail(new Error(`Invalid uncompressed size for ${entry.fileName}`));
        return;
      }
      totalSize += entrySize;
      if (totalSize > MAX_UNCOMPRESSED_ARCHIVE_BYTES) {
        fail(new BackupTooLargeError("Uncompressed backup archive exceeds the 514 MB limit"));
        return;
      }

      if (entry.fileName === "db.sqlite") {
        if (database) {
          fail(new Error("Invalid backup: duplicate db.sqlite entry"));
          return;
        }
        if (entrySize > MAX_UNCOMPRESSED_DATABASE_BYTES) {
          fail(new BackupTooLargeError("Uncompressed SQLite database exceeds the 512 MB limit"));
          return;
        }
        database = entry;
      } else if (entry.fileName === "metadata.json") {
        if (metadata) {
          fail(new Error("Invalid backup: duplicate metadata.json entry"));
          return;
        }
        if (entrySize > MAX_METADATA_BYTES) {
          fail(new BackupTooLargeError("Backup metadata exceeds the 1 MB limit"));
          return;
        }
        metadata = entry;
      } else if (entry.fileName === "encryption-key.txt") {
        if (encryptionKey) {
          fail(new Error("Invalid backup: duplicate encryption-key.txt entry"));
          return;
        }
        if (entrySize > MAX_ENCRYPTION_KEY_BYTES) {
          fail(new BackupTooLargeError("Backup encryption key entry is too large"));
          return;
        }
        encryptionKey = entry;
      }

      zip.readEntry();
    });
    zip.once("end", () => {
      if (settled) return;
      settled = true;
      if (!database || !metadata) {
        const presentNames = [database ? "db.sqlite" : null, metadata ? "metadata.json" : null];
        const missingEntries = REQUIRED_ZIP_ENTRIES.filter((name) => !presentNames.includes(name));
        reject(new Error(`Invalid backup: missing ${missingEntries.join(", ")}`));
        return;
      }
      resolve({ database, metadata, encryptionKey });
    });
    zip.readEntry();
  });

const openEntryStreamAsync = (zip: ZipFile, entry: ZipEntry) =>
  new Promise<Readable>((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }
      if (!stream) {
        reject(new Error(`Could not read ${entry.fileName}`));
        return;
      }
      resolve(stream);
    });
  });

const extractEntryToFileAsync = async (zip: ZipFile, entry: ZipEntry, outputPath: string) => {
  const source = await openEntryStreamAsync(zip, entry);
  await pipeline(source, fs.createWriteStream(outputPath, { flags: "wx" }));
};

const readBoundedEntryAsync = async (zip: ZipFile, entry: ZipEntry, maximumBytes: number) => {
  const source = await openEntryStreamAsync(zip, entry);
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of source) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > maximumBytes) {
      source.destroy();
      throw new BackupTooLargeError(`${entry.fileName} exceeds its size limit`);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, totalBytes);
};

const reEncryptSecrets = (tempDb: InstanceType<typeof BetterSqlite3>, importedKeyHex: string) => {
  const currentKeyHex = env.SECRET_ENCRYPTION_KEY;
  if (importedKeyHex === currentKeyHex) return;

  if (!HEX_KEY_REGEX.test(importedKeyHex)) {
    throw new Error("Imported encryption key is not a valid 64-character hex string");
  }

  const oldKey = Buffer.from(importedKeyHex, "hex");
  const newKey = Buffer.from(currentKeyHex, "hex");

  const rows = tempDb.prepare('SELECT "integration_id", "kind", "value" FROM "integrationSecret"').all() as {
    integration_id: string;
    kind: string;
    value: string;
  }[];

  if (rows.length === 0) return;

  const updateStmt = tempDb.prepare(
    'UPDATE "integrationSecret" SET "value" = ? WHERE "integration_id" = ? AND "kind" = ?',
  );
  const transaction = tempDb.transaction(() => {
    for (const row of rows) {
      const parts = row.value.split(".");
      if (parts.length !== 2) {
        throw new Error(
          `Malformed secret value for integration ${row.integration_id} (${row.kind}): expected "data.iv" format`,
        );
      }
      const [data, dataIv] = parts as [string, string];

      try {
        const iv = Buffer.from(dataIv, "hex");
        const encrypted = Buffer.from(data, "hex");
        const decipher = crypto.createDecipheriv(ALGORITHM, oldKey, iv);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();

        const newIv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, newKey, newIv);
        const newEncrypted = Buffer.concat([cipher.update(decrypted), cipher.final()]);
        const newValue = `${newEncrypted.toString("hex")}.${newIv.toString("hex")}`;

        updateStmt.run(newValue, row.integration_id, row.kind);
      } catch {
        throw new Error(`Failed to re-encrypt secret for integration ${row.integration_id} (${row.kind})`);
      }
    }
  });
  transaction();
};

const getHomeBoardName = (tempDb: InstanceType<typeof BetterSqlite3>): string | null => {
  const row = tempDb
    .prepare(
      `SELECT "name" FROM (
         SELECT "board"."name" AS "name", 0 AS "priority"
         FROM "group"
         INNER JOIN "board" ON "board"."id" = "group"."home_board_id"
         WHERE "group"."name" = 'everyone'
         UNION ALL
         SELECT "board"."name" AS "name", 1 AS "priority"
         FROM "user"
         INNER JOIN "board" ON "board"."id" = "user"."home_board_id"
         UNION ALL
         SELECT "board"."name" AS "name", 2 AS "priority"
         FROM "board"
       )
       ORDER BY "priority", "name"
       LIMIT 1`,
    )
    .get() as { name: string } | undefined;
  return row?.name ?? null;
};

const isOnboardingActiveAsync = async (): Promise<boolean> => {
  const onboardingRow = await db.query.onboarding.findFirst();
  if (!onboardingRow) return false;
  return normalizeOnboardingStep(onboardingRow.step) === "start";
};

export async function POST(req: Request) {
  const session = await auth();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;
  const hasOnboardingClaim = await isClaimOnlyOnboardingAccessAllowedAsync(
    db,
    getOnboardingClaimTokenFromCookieHeader(req.headers.get("cookie")),
  );
  const isOnboarding = !isAdmin && hasOnboardingClaim && (await isOnboardingActiveAsync());

  if (!isAdmin && !isOnboarding) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (dbEnv.DRIVER !== "better-sqlite3") {
    return NextResponse.json({ error: "SQLite restore is only available for SQLite databases" }, { status: 400 });
  }

  const dbPath = dbEnv.URL as string | undefined;
  if (!dbPath) {
    return NextResponse.json({ error: "Database path not configured" }, { status: 500 });
  }

  const migrationsFolder = findMigrationsFolder();
  if (!migrationsFolder) {
    return NextResponse.json({ error: "Migration files not found" }, { status: 500 });
  }

  if (restoreInProgress) {
    return NextResponse.json({ error: "A database restore is already in progress" }, { status: 409 });
  }

  restoreInProgress = true;
  let tempDirectory: string | null = null;
  let tempDb: InstanceType<typeof BetterSqlite3> | null = null;

  try {
    tempDirectory = fs.mkdtempSync(path.join(path.dirname(dbPath), ".homarr-restore-"));
    const uploadPath = path.join(tempDirectory, "backup.zip");
    const tempPath = path.join(tempDirectory, "db.sqlite");

    let uploadSize: number | null;
    try {
      uploadSize = await streamUploadedBackupAsync(req, uploadPath);
    } catch (error) {
      if (error instanceof BackupTooLargeError) {
        return NextResponse.json({ error: error.message }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    if (uploadSize === null) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (uploadSize > MAX_COMPRESSED_BACKUP_BYTES) {
      return NextResponse.json({ error: "Backup upload exceeds the 256 MB limit" }, { status: 413 });
    }

    let zip: ZipFile;
    try {
      zip = await openArchiveAsync(uploadPath);
    } catch {
      return NextResponse.json({ error: "Invalid ZIP file" }, { status: 400 });
    }

    let metadata: { encryptionKey?: unknown };
    let archivedEncryptionKey: string | undefined;
    try {
      const entries = await inspectArchiveAsync(zip);
      await extractEntryToFileAsync(zip, entries.database, tempPath);
      const metadataBuffer = await readBoundedEntryAsync(zip, entries.metadata, MAX_METADATA_BYTES);
      const parsedMetadata: unknown = JSON.parse(metadataBuffer.toString());
      if (typeof parsedMetadata !== "object" || parsedMetadata === null || Array.isArray(parsedMetadata)) {
        throw new Error("Invalid backup: metadata.json must contain an object");
      }
      metadata = parsedMetadata as { encryptionKey?: unknown };
      if (entries.encryptionKey) {
        const keyBuffer = await readBoundedEntryAsync(zip, entries.encryptionKey, MAX_ENCRYPTION_KEY_BYTES);
        archivedEncryptionKey = keyBuffer.toString().trim();
      }
    } catch (error) {
      if (error instanceof BackupTooLargeError) {
        return NextResponse.json({ error: error.message }, { status: 413 });
      }
      const message =
        error instanceof Error && error.message.startsWith("Invalid backup:") ? error.message : "Invalid ZIP file";
      return NextResponse.json({ error: message }, { status: 400 });
    } finally {
      zip.close();
      try {
        fs.rmSync(uploadPath, { force: true });
      } catch {
        // The outer restore-directory cleanup retries this path.
      }
    }

    tempDb = new BetterSqlite3(tempPath);
    const drizzleDb = drizzle(tempDb, { casing: DB_CASING, schema });
    migrate(drizzleDb, { migrationsFolder });
    await applyCustomMigrationsAsync(drizzleDb as unknown as Database);

    const rawKey = metadata.encryptionKey ?? archivedEncryptionKey;
    const importedKey = typeof rawKey === "string" && rawKey.length > 0 ? rawKey : undefined;

    const secretCount = (tempDb.prepare('SELECT COUNT(*) as count FROM "integrationSecret"').get() as { count: number })
      .count;

    if (secretCount > 0 && !importedKey) {
      throw new Error(
        "Backup contains integration secrets but no encryption key. " +
          "Cannot restore without the original SECRET_ENCRYPTION_KEY.",
      );
    }

    if (importedKey) {
      reEncryptSecrets(tempDb, importedKey);
    }

    const homeBoardName = getHomeBoardName(tempDb);

    tempDb.close();
    tempDb = null;

    fs.renameSync(tempPath, dbPath);

    for (const suffix of ["-wal", "-shm"] as const) {
      try {
        const sidecar = `${dbPath}${suffix}`;
        if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
      } catch (cleanupErr) {
        console.error(`Failed to remove ${suffix} file:`, cleanupErr);
      }
    }

    const restartTimer = setTimeout(() => {
      console.log("Database restored, restarting server...");
      process.exit(0);
    }, RESTART_DELAY_MS);
    restartTimer.unref();

    return NextResponse.json({
      success: true,
      message: "Database restored. Server is restarting...",
      restartAfterMs: RESTART_DELAY_MS,
      homeBoardName,
    });
  } catch (error) {
    console.error("[backup/import] Restore failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Restore failed: ${message}` }, { status: 500 });
  } finally {
    restoreInProgress = false;
    try {
      tempDb?.close();
    } catch (error) {
      console.error("[backup/import] Failed to close temporary database:", error);
    }
    if (tempDirectory) {
      try {
        fs.rmSync(tempDirectory, { recursive: true, force: true });
      } catch (error) {
        console.error("[backup/import] Failed to remove temporary restore directory:", error);
      }
    }
  }
}
