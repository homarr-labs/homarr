import crypto from "crypto";
import fs from "fs";
import path from "path";

import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { auth } from "@homarr/auth/next";
import { env } from "@homarr/common/env";
import { DB_CASING } from "@homarr/core/infrastructure/db/constants";
import { dbEnv } from "@homarr/core/infrastructure/db/env";
import { db } from "@homarr/db";

const REQUIRED_ZIP_ENTRIES = ["db.sqlite", "metadata.json"] as const;
const ALGORITHM = "aes-256-cbc";
const HEX_KEY_REGEX = /^[0-9a-fA-F]{64}$/;

const migrationsFolderCandidates = [
  path.join(process.cwd(), "db/migrations/sqlite"),
  path.join(process.cwd(), "packages/db/migrations/sqlite"),
  path.resolve(process.cwd(), "../../db/migrations/sqlite"),
  "/app/db/migrations/sqlite",
];

const findMigrationsFolder = () => migrationsFolderCandidates.find((candidate) => fs.existsSync(candidate));

const reEncryptSecrets = (tempDb: InstanceType<typeof Database>, importedKeyHex: string) => {
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

  const updateStmt = tempDb.prepare('UPDATE "integrationSecret" SET "value" = ? WHERE "integration_id" = ? AND "kind" = ?');
  const transaction = tempDb.transaction(() => {
    for (const row of rows) {
      const parts = row.value.split(".");
      if (parts.length !== 2) continue;
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

const isOnboardingActiveAsync = async (): Promise<boolean> => {
  const onboardingRow = await db.query.onboarding.findFirst();
  if (!onboardingRow) return true;
  return onboardingRow.step === "start";
};

export async function POST(req: Request) {
  const session = await auth();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;
  const isOnboarding = !isAdmin && (await isOnboardingActiveAsync());

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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  let zip: AdmZip;
  try {
    zip = new AdmZip(Buffer.from(arrayBuffer));
  } catch {
    return NextResponse.json({ error: "Invalid ZIP file" }, { status: 400 });
  }

  const entries = zip.getEntries().map((e) => e.entryName);
  const missingEntries = REQUIRED_ZIP_ENTRIES.filter((name) => !entries.includes(name));
  if (missingEntries.length > 0) {
    return NextResponse.json({ error: `Invalid backup: missing ${missingEntries.join(", ")}` }, { status: 400 });
  }

  const migrationsFolder = findMigrationsFolder();
  if (!migrationsFolder) {
    return NextResponse.json({ error: "Migration files not found" }, { status: 500 });
  }

  const tempPath = path.join(path.dirname(dbPath), "db.import.sqlite");
  let tempDb: InstanceType<typeof Database> | null = null;

  try {
    const dbEntry = zip.getEntry("db.sqlite")!;
    fs.writeFileSync(tempPath, dbEntry.getData());

    tempDb = new Database(tempPath);
    const drizzleDb = drizzle(tempDb, { casing: DB_CASING });
    migrate(drizzleDb, { migrationsFolder });

    const metadataEntry = zip.getEntry("metadata.json")!;
    const metadata = JSON.parse(metadataEntry.getData().toString());

    const importedKey =
      metadata.encryptionKey ??
      zip.getEntry("encryption-key.txt")?.getData().toString().trim();

    if (importedKey) {
      reEncryptSecrets(tempDb, importedKey);
    }

    tempDb.close();
    tempDb = null;

    fs.renameSync(tempPath, dbPath);

    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    setTimeout(() => {
      console.log("Database restored, restarting server...");
      process.exit(0);
    }, 500);

    return NextResponse.json({ success: true, message: "Database restored. Server is restarting..." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Restore failed: ${message}` }, { status: 500 });
  } finally {
    tempDb?.close();
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // temp file may have been renamed already
      }
    }
  }
}
