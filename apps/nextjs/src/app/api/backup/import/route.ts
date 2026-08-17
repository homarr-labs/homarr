import crypto from "crypto";
import fs from "fs";
import path from "path";

import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

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
const RESTART_DELAY_MS = 500;

let restoreInProgress = false;

class BackupTooLargeError extends Error {}

const readBoundedRequestBodyAsync = async (request: Request): Promise<Uint8Array<ArrayBuffer>> => {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      throw new Error("Invalid Content-Length header");
    }
    if (parsedLength > MAX_MULTIPART_REQUEST_BYTES) {
      throw new BackupTooLargeError("Backup upload exceeds the 256 MB limit");
    }
  }

  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_MULTIPART_REQUEST_BYTES) {
        await reader.cancel();
        throw new BackupTooLargeError("Backup upload exceeds the 256 MB limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
};

const parseBoundedFormDataAsync = async (request: Request): Promise<FormData> => {
  const contentType = request.headers.get("content-type");
  if (!contentType) throw new Error("Missing Content-Type header");

  const body = await readBoundedRequestBodyAsync(request);
  return new Response(body, { headers: { "content-type": contentType } }).formData();
};

const assertArchiveSizeLimits = (zip: AdmZip) => {
  const entries = zip.getEntries();
  let totalSize = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const entrySize = entry.header.size;
    if (!Number.isSafeInteger(entrySize) || entrySize < 0) {
      throw new Error(`Invalid uncompressed size for ${entry.entryName}`);
    }
    totalSize += entrySize;
    if (totalSize > MAX_UNCOMPRESSED_ARCHIVE_BYTES) {
      throw new BackupTooLargeError("Uncompressed backup archive exceeds the 514 MB limit");
    }
  }

  const dbEntry = zip.getEntry("db.sqlite");
  if (dbEntry && dbEntry.header.size > MAX_UNCOMPRESSED_DATABASE_BYTES) {
    throw new BackupTooLargeError("Uncompressed SQLite database exceeds the 512 MB limit");
  }

  const metadataEntry = zip.getEntry("metadata.json");
  if (metadataEntry && metadataEntry.header.size > MAX_METADATA_BYTES) {
    throw new BackupTooLargeError("Backup metadata exceeds the 1 MB limit");
  }

  const encryptionKeyEntry = zip.getEntry("encryption-key.txt");
  if (encryptionKeyEntry && encryptionKeyEntry.header.size > MAX_ENCRYPTION_KEY_BYTES) {
    throw new BackupTooLargeError("Backup encryption key entry is too large");
  }
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
    let formData: FormData;
    try {
      formData = await parseBoundedFormDataAsync(req);
    } catch (error) {
      if (error instanceof BackupTooLargeError) {
        return NextResponse.json({ error: error.message }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_COMPRESSED_BACKUP_BYTES) {
      return NextResponse.json({ error: "Backup upload exceeds the 256 MB limit" }, { status: 413 });
    }

    let zip: AdmZip;
    try {
      zip = new AdmZip(Buffer.from(await file.arrayBuffer()));
    } catch {
      return NextResponse.json({ error: "Invalid ZIP file" }, { status: 400 });
    }

    const entries = zip.getEntries().map((entry) => entry.entryName);
    const missingEntries = REQUIRED_ZIP_ENTRIES.filter((name) => !entries.includes(name));
    if (missingEntries.length > 0) {
      return NextResponse.json({ error: `Invalid backup: missing ${missingEntries.join(", ")}` }, { status: 400 });
    }

    try {
      assertArchiveSizeLimits(zip);
    } catch (error) {
      if (error instanceof BackupTooLargeError) {
        return NextResponse.json({ error: error.message }, { status: 413 });
      }
      throw error;
    }

    tempDirectory = fs.mkdtempSync(path.join(path.dirname(dbPath), ".homarr-restore-"));
    const tempPath = path.join(tempDirectory, "db.sqlite");
    const dbEntry = zip.getEntry("db.sqlite");
    if (!dbEntry) {
      return NextResponse.json({ error: "Invalid backup: missing db.sqlite" }, { status: 400 });
    }
    fs.writeFileSync(tempPath, dbEntry.getData());

    tempDb = new BetterSqlite3(tempPath);
    const drizzleDb = drizzle(tempDb, { casing: DB_CASING, schema });
    migrate(drizzleDb, { migrationsFolder });
    await applyCustomMigrationsAsync(drizzleDb as unknown as Database);

    const metadataEntry = zip.getEntry("metadata.json");
    if (!metadataEntry) {
      return NextResponse.json({ error: "Invalid backup: missing metadata.json" }, { status: 400 });
    }
    const metadata = JSON.parse(metadataEntry.getData().toString());

    const rawKey = metadata.encryptionKey ?? zip.getEntry("encryption-key.txt")?.getData().toString().trim();
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
