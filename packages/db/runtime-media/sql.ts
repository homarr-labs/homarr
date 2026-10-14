import { sql } from "drizzle-orm";

import { MediaSqlPreconditionError } from "./contracts";
import type { InsertedLocalIcon, MediaDeleteSelection, PreparedMediaUploadRow } from "./contracts";

export const insertMediaGroup = (rows: readonly PreparedMediaUploadRow[]) => {
  if (rows.length === 0) throw new Error("values() must be called with at least one value");
  const values = rows.map(
    (row) =>
      sql`(${row.id}, ${row.creatorId}, ${sql.param(row.content)}, ${row.size}, ${row.contentType}, ${row.name})`,
  );
  return sql`INSERT INTO "media" ("id", "creator_id", "content", "size", "content_type", "name")
    VALUES ${sql.join(values, sql`, `)}`;
};

export const selectLocalRepository = (engine: "sqlite" | "postgresql", slug: "local") =>
  engine === "postgresql"
    ? sql`SELECT "id" FROM "iconRepository" WHERE "slug" = ${slug} LIMIT 1 FOR SHARE`
    : sql`SELECT "id" FROM "iconRepository" WHERE "slug" = ${slug} LIMIT 1`;

export const insertLocalIconGroup = (rows: readonly InsertedLocalIcon[]) => {
  if (rows.length === 0) throw new Error("values() must be called with at least one value");
  const values = rows.map((row) => sql`(${row.id}, ${row.checksum}, ${row.name}, ${row.url}, ${row.iconRepositoryId})`);
  return sql`INSERT INTO "icon" ("id", "checksum", "name", "url", "icon_repository_id")
    VALUES ${sql.join(values, sql`, `)}`;
};

export const selectMediaIdentity = (engine: "sqlite" | "postgresql", id: string) =>
  engine === "postgresql"
    ? sql`SELECT "id", "creator_id" AS "creatorId" FROM "media" WHERE "id" = ${id} FOR UPDATE`
    : sql`SELECT "id", "creator_id" AS "creatorId" FROM "media" WHERE "id" = ${id}`;

export const deleteSelectedMedia = (engine: "sqlite" | "postgresql", selection: MediaDeleteSelection) =>
  engine === "postgresql"
    ? sql`DELETE FROM "media" WHERE "id" = ${selection.id}
        AND "creator_id" IS NOT DISTINCT FROM ${selection.creatorId}`
    : sql`DELETE FROM "media" WHERE "id" = ${selection.id}
        AND ("creator_id" = ${selection.creatorId}
          OR ("creator_id" IS NULL AND ${selection.creatorId} IS NULL))`;

export const deleteExactIconUrl = (url: string) => sql`DELETE FROM "icon" WHERE "url" = ${url}`;

export const requireAffectedRows = (actual: number | null, expected?: number): void => {
  if (actual === null || !Number.isSafeInteger(actual) || actual < 0)
    throw new MediaSqlPreconditionError("MEDIA_INVALID_SQL_RESULT");
  if (expected !== undefined && actual !== expected)
    throw new MediaSqlPreconditionError("MEDIA_AFFECTED_COUNT_MISMATCH");
};

const selectedRow = (rows: readonly unknown[]): unknown => {
  if (rows.length > 1) throw new MediaSqlPreconditionError("MEDIA_INVALID_SQL_RESULT");
  return rows[0];
};

export const readLocalRepository = (rows: readonly unknown[]): string | undefined => {
  const row = selectedRow(rows);
  if (row === undefined) return undefined;
  if (row === null || typeof row !== "object" || !("id" in row) || typeof row.id !== "string")
    throw new MediaSqlPreconditionError("MEDIA_INVALID_SQL_RESULT");
  return row.id;
};

export const reconfirmMediaSelection = (rows: readonly unknown[], expected: MediaDeleteSelection): void => {
  const row = selectedRow(rows);
  if (row === undefined) throw new MediaSqlPreconditionError("MEDIA_NOT_FOUND");
  if (
    row === null ||
    typeof row !== "object" ||
    !("id" in row) ||
    typeof row.id !== "string" ||
    !("creatorId" in row) ||
    (row.creatorId !== null && typeof row.creatorId !== "string") ||
    row.id !== expected.id
  )
    throw new MediaSqlPreconditionError("MEDIA_INVALID_SQL_RESULT");
  if (row.creatorId !== expected.creatorId) throw new MediaSqlPreconditionError("MEDIA_CREATOR_CHANGED");
};
