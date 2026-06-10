import fs from "fs";
import path from "path";

import { NextResponse } from "next/server";

import { findMigrationsFolder } from "../shared";

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface MigrationFile {
  idx: number;
  tag: string;
  sql: string;
  when: number;
}

export async function GET() {
  try {
    const migrationsFolder = findMigrationsFolder();
    if (!migrationsFolder) {
      return NextResponse.json({ error: "Migration files not found" }, { status: 500 });
    }

    const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
    if (!fs.existsSync(journalPath)) {
      return NextResponse.json({ error: "Migration journal not found" }, { status: 500 });
    }

    const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8")) as { entries: JournalEntry[] };

    const migrations: MigrationFile[] = [];
    for (const entry of journal.entries) {
      const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
      if (!fs.existsSync(sqlPath)) continue;

      migrations.push({
        idx: entry.idx,
        tag: entry.tag,
        sql: fs.readFileSync(sqlPath, "utf-8"),
        when: entry.when,
      });
    }

    return NextResponse.json(
      { total: migrations.length, migrations },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      },
    );
  } catch (error) {
    console.error("[backup/migrations] Failed to read migrations:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to read migrations: ${message}` }, { status: 500 });
  }
}
