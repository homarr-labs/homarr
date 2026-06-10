import fs from "fs";
import path from "path";

import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import Database from "better-sqlite3";

import { auth } from "@homarr/auth/next";
import { env } from "@homarr/common/env";
import { dbEnv } from "@homarr/core/infrastructure/db/env";

export async function GET() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (dbEnv.DRIVER !== "better-sqlite3") {
    return NextResponse.json({ error: "SQLite backup is only available for SQLite databases" }, { status: 400 });
  }

  const dbPath = dbEnv.URL as string | undefined;
  if (!dbPath || !fs.existsSync(dbPath)) {
    return NextResponse.json({ error: "Database file not found" }, { status: 500 });
  }

  const tempPath = path.join(path.dirname(dbPath), "db.backup.sqlite");
  let sourceDb: InstanceType<typeof Database> | null = null;

  try {
    sourceDb = new Database(dbPath, { readonly: true });
    sourceDb.pragma("wal_checkpoint(TRUNCATE)");
    sourceDb.exec(`VACUUM INTO '${tempPath}'`);
    sourceDb.close();
    sourceDb = null;

    const dbBuffer = fs.readFileSync(tempPath);

    const metadata = {
      homarrVersion: process.env.HOMARR_VERSION ?? "unknown",
      exportedAt: new Date().toISOString(),
      dbDialect: "sqlite",
      encryptionKey: env.SECRET_ENCRYPTION_KEY,
    };

    const zip = new AdmZip();
    zip.addFile("db.sqlite", dbBuffer);
    zip.addFile("metadata.json", Buffer.from(JSON.stringify(metadata, null, 2)));

    const zipBuffer = zip.toBuffer();

    const date = new Date().toISOString().split("T")[0];
    const filename = `homarr-backup-${date}.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[backup/export] Export failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Export failed: ${message}` }, { status: 500 });
  } finally {
    sourceDb?.close();
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (cleanupErr) {
      console.error("[backup/export] Failed to clean up temp file:", cleanupErr);
    }
  }
}
