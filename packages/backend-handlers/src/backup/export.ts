import fs from "fs";
import path from "path";

import AdmZip from "adm-zip";

import { getSessionFromRequestAsync } from "@homarr/auth/request-session";
import { env } from "@homarr/common/env";
import { openSqliteDatabase } from "@homarr/core/infrastructure/db";
import type { SqliteConnection } from "@homarr/core/infrastructure/db";
import { dbEnv } from "@homarr/core/infrastructure/db/env";

export async function GET(req: Request) {
  const session = await getSessionFromRequestAsync(req);
  if (!session?.user.permissions.includes("admin")) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (dbEnv.DRIVER !== "better-sqlite3") {
    return Response.json({ error: "SQLite backup is only available for SQLite databases" }, { status: 400 });
  }

  const dbPath = dbEnv.URL as string | undefined;
  if (!dbPath || !fs.existsSync(dbPath)) {
    return Response.json({ error: "Database file not found" }, { status: 500 });
  }

  const tempPath = path.join(path.dirname(dbPath), "db.backup.sqlite");
  let sourceDb: SqliteConnection | null = null;

  try {
    sourceDb = openSqliteDatabase(dbPath, {}, { readonly: true }).connection;
    sourceDb.prepare("VACUUM INTO ?").run(tempPath);
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

    return new Response(new Uint8Array(zipBuffer), {
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
    return Response.json({ error: `Export failed: ${message}` }, { status: 500 });
  } finally {
    sourceDb?.close();
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (cleanupErr) {
      console.error("[backup/export] Failed to clean up temp file:", cleanupErr);
    }
  }
}
