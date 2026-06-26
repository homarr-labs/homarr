"use client";

import { useCallback, useRef, useState } from "react";

import { useScopedI18n } from "@homarr/translation/client";

import type { BackupAnalysis, MigrationFile, MigrationStatus } from "./types";
import { PREVIEW_TABLE_KEYS } from "./types";

const DRIZZLE_MIGRATIONS_TABLE = "__drizzle_migrations";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getAppliedMigrationCount = (db: any): number => {
  try {
    const result = db.exec(`SELECT COUNT(*) FROM "${DRIZZLE_MIGRATIONS_TABLE}"`);
    return (result[0]?.values[0]?.[0] as number) ?? 0;
  } catch {
    return 0;
  }
};

const fetchMigrations = async (): Promise<MigrationFile[]> => {
  const res = await fetch("/api/backup/migrations");
  if (!res.ok) throw new Error("Failed to fetch migration files from server");
  const data = await res.json();
  return data.migrations ?? [];
};

const countEntities = (db: any): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const key of PREVIEW_TABLE_KEYS) {
    try {
      const result = db.exec(`SELECT COUNT(*) FROM "${key}"`);
      counts[key] = (result[0]?.values[0]?.[0] as number) ?? 0;
    } catch {
      counts[key] = 0;
    }
  }
  return counts;
};

const getBoardNames = (db: any): string[] => {
  try {
    const result = db.exec('SELECT "name" FROM "board" ORDER BY "name"');
    return result[0]?.values.map((row: unknown[]) => row[0] as string) ?? [];
  } catch {
    return [];
  }
};

export interface MigrationProgress {
  current: number;
  total: number;
  tag: string;
  phase: "pending" | "applying" | "done" | "error";
}

export const useBackupAnalysis = () => {
  const t = useScopedI18n("management.page.tool.backup.restore");
  const [analysis, setAnalysis] = useState<BackupAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  const dbRef = useRef<any>(null);

  const analyzeFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      setAnalysis(null);
      setMigrationProgress(null);

      try {
        const [JSZip, initSqlJs, allMigrations, wasmBinary] = await Promise.all([
          import("jszip").then((m) => m.default),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          import("sql.js").then((m: any) => m.default),
          fetchMigrations(),
          fetch("/api/backup/sql-wasm").then((r) => {
            if (!r.ok) throw new Error("Failed to load SQL WASM binary");
            return r.arrayBuffer();
          }),
        ]);

        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        const metadataFile = zip.file("metadata.json");
        if (!metadataFile) throw new Error(t("invalidMissingMetadata"));
        const dbFile = zip.file("db.sqlite");
        if (!dbFile) throw new Error(t("invalidMissingDb"));

        const metadata = JSON.parse(await metadataFile.async("string"));
        const dbBuffer = await dbFile.async("uint8array");

        const SQL = await initSqlJs({ wasmBinary });

        const db = new SQL.Database(dbBuffer);
        dbRef.current = db;

        try {
          const appliedCount = getAppliedMigrationCount(db);
          const pendingMigrations = allMigrations.filter((m) => m.idx >= appliedCount);

          const migrations: MigrationStatus = {
            applied: appliedCount,
            pending: pendingMigrations,
            total: allMigrations.length,
          };

          if (pendingMigrations.length > 0) {
            for (const [i, migration] of pendingMigrations.entries()) {
              setMigrationProgress({
                current: i + 1,
                total: pendingMigrations.length,
                tag: migration.tag,
                phase: "applying",
              });

              await delay(100);

              try {
                const statements = migration.sql
                  .split("--> statement-breakpoint")
                  .map((s) => s.trim())
                  .filter(Boolean);

                for (const stmt of statements) {
                  db.run(stmt);
                }

                db.run(`INSERT INTO "${DRIZZLE_MIGRATIONS_TABLE}" ("hash", "created_at") VALUES (?, ?)`, [
                  migration.tag,
                  Date.now(),
                ]);
              } catch (migrationErr) {
                setMigrationProgress({
                  current: i + 1,
                  total: pendingMigrations.length,
                  tag: migration.tag,
                  phase: "error",
                });
                throw new Error(
                  `Migration ${migration.tag} failed: ${migrationErr instanceof Error ? migrationErr.message : "Unknown error"}`,
                  { cause: migrationErr },
                );
              }

              setMigrationProgress({
                current: i + 1,
                total: pendingMigrations.length,
                tag: migration.tag,
                phase: "done",
              });

              await delay(50);
            }
          }

          const counts = countEntities(db);
          const boardNames = getBoardNames(db);

          setMigrationProgress(null);
          setAnalysis({ metadata, counts, boardNames, migrations });
        } finally {
          db.close();
          dbRef.current = null;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("analyzeError"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const reset = useCallback(() => {
    if (dbRef.current) {
      try {
        dbRef.current.close();
      } catch {
        /* already closed */
      }
      dbRef.current = null;
    }
    setAnalysis(null);
    setError(null);
    setMigrationProgress(null);
  }, []);

  return { analysis, loading, error, migrationProgress, analyzeFile, reset };
};
