import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { RuntimeStateEpochMismatchError } from "./types";

export type StateRow = { value: string; expiresAtMs: number | null };
export type Observation = { now: number; rows: Map<string, StateRow> };

export const clockSql = (engine: "sqlite" | "postgresql") =>
  engine === "sqlite"
    ? sql`CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)`
    : sql`CAST(floor(extract(epoch FROM clock_timestamp()) * 1000) AS DOUBLE PRECISION)`;

export const clockValue = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new TypeError("Unsupported runtime SQL clock value");
  return value;
};

export const expiryValue = (value: unknown): number | null => {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER)
    throw new TypeError("Unsupported runtime SQL expiry value");
  return value;
};

export const valueBytesSql = (engine: "sqlite" | "postgresql") =>
  engine === "sqlite" ? sql`length(CAST(s."value" AS BLOB))` : sql`octet_length(s."value")`;

export const snapshotSql = (
  engine: "sqlite" | "postgresql",
  epoch: string,
  keys: readonly string[],
  maxValueBytes: number,
): SQL => {
  const requested = keys.length
    ? sql`VALUES ${sql.join(
        keys.map((key) => sql`(CAST(${key} AS TEXT))`),
        sql`, `,
      )}`
    : sql`SELECT CAST(NULL AS TEXT) WHERE 1 = 0`;
  const bytes = valueBytesSql(engine);
  return sql`
    WITH observation AS MATERIALIZED (SELECT ${clockSql(engine)} AS "now"),
    installed AS MATERIALIZED (SELECT "epoch" FROM "homarr_runtime_meta" WHERE "id" = 1),
    requested("key") AS (${requested})
    SELECT observation."now", installed."epoch", requested."key",
      CASE WHEN s."expires_at_ms" IS NULL OR s."expires_at_ms" > observation."now"
        THEN CASE WHEN ${bytes} <= ${maxValueBytes} THEN s."value" ELSE NULL END
        ELSE NULL END AS "value",
      CASE WHEN s."expires_at_ms" IS NULL OR s."expires_at_ms" > observation."now"
        THEN ${bytes} ELSE NULL END AS "value_bytes",
      s."expires_at_ms"
    FROM observation LEFT JOIN installed ON 1 = 1 LEFT JOIN requested ON 1 = 1
    LEFT JOIN "homarr_runtime_state" s ON s."epoch" = ${epoch} AND s."key" = requested."key"`;
};

export const decodeObservation = (
  records: readonly Record<string, unknown>[],
  epoch: string,
  keys: readonly string[],
  maxValueBytes: number,
  maxOutputBytes: number,
): Observation => {
  const first = records[0];
  if (!first || first.epoch !== epoch) throw new RuntimeStateEpochMismatchError();
  const now = clockValue(first.now);
  const expected = new Set(keys);
  const seen = new Set<string>();
  const rows = new Map<string, StateRow>();
  let bytes = 0;
  for (const record of records) {
    if (record.epoch !== epoch || clockValue(record.now) !== now) throw new RuntimeStateEpochMismatchError();
    if (record.key === null && expected.size === 0) continue;
    if (typeof record.key !== "string" || !expected.has(record.key) || seen.has(record.key))
      throw new TypeError("Unexpected runtime SQL snapshot identity");
    seen.add(record.key);
    bytes += Buffer.byteLength(record.key, "utf8");
    const expiresAtMs = expiryValue(record.expires_at_ms);
    if (record.value_bytes !== null) {
      if (
        typeof record.value_bytes !== "number" ||
        !Number.isSafeInteger(record.value_bytes) ||
        record.value_bytes < 0 ||
        record.value_bytes > maxValueBytes ||
        typeof record.value !== "string" ||
        Buffer.byteLength(record.value, "utf8") !== record.value_bytes
      )
        throw new TypeError("Runtime SQL value exceeds its admitted byte limit or is malformed");
      bytes += record.value_bytes;
      rows.set(record.key, { value: record.value, expiresAtMs });
    } else if (record.value !== null) throw new TypeError("Malformed runtime SQL missing value");
    if (bytes > maxOutputBytes) throw new RangeError("Runtime SQL snapshot exceeds its admitted byte limit");
  }
  if (seen.size !== expected.size) throw new TypeError("Incomplete runtime SQL snapshot");
  return { now, rows };
};

export const selectStateSql = (
  engine: "sqlite" | "postgresql",
  epoch: string,
  keys: readonly string[],
  now: number,
  maxValueBytes: number,
) => {
  const bytes = valueBytesSql(engine);
  return sql`SELECT s."key",
    CASE WHEN ${bytes} <= ${maxValueBytes} THEN s."value" ELSE NULL END AS "value",
    ${bytes} AS "value_bytes", s."expires_at_ms"
    FROM "homarr_runtime_state" s
    WHERE s."epoch" = ${epoch} AND s."key" IN (${sql.join(
      keys.map((key) => sql`${key}`),
      sql`, `,
    )})
      AND (s."expires_at_ms" IS NULL OR s."expires_at_ms" > ${now})`;
};

export const deleteStateSql = (epoch: string, key: string) =>
  sql`DELETE FROM "homarr_runtime_state" WHERE "epoch" = ${epoch} AND "key" = ${key}`;

export const setStateSql = (epoch: string, key: string, row: StateRow) =>
  sql`INSERT INTO "homarr_runtime_state" ("epoch", "key", "value", "expires_at_ms")
    VALUES (${epoch}, ${key}, ${row.value}, ${row.expiresAtMs})
    ON CONFLICT ("epoch", "key") DO UPDATE
    SET "value" = excluded."value", "expires_at_ms" = excluded."expires_at_ms"`;
