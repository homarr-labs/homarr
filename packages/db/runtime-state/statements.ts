import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { PreparedStateWrite } from "./contracts";

export type RuntimeStateDialect = "sqlite" | "postgresql";

const metaTable = (dialect: RuntimeStateDialect): SQL =>
  dialect === "sqlite" ? sql`"homarr_runtime_meta"` : sql`"public"."homarr_runtime_meta"`;

const stateTable = (dialect: RuntimeStateDialect): SQL =>
  dialect === "sqlite" ? sql`"homarr_runtime_state"` : sql`"public"."homarr_runtime_state"`;

const clockExpression = (dialect: RuntimeStateDialect): SQL =>
  dialect === "sqlite"
    ? sql`CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)`
    : sql`CAST(FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) AS DOUBLE PRECISION)`;

const valueBytesExpression = (dialect: RuntimeStateDialect, value: SQL): SQL =>
  dialect === "sqlite" ? sql`length(CAST(${value} AS BLOB))` : sql`octet_length(${value})`;

export const stateClockStatement = (dialect: RuntimeStateDialect): SQL =>
  sql`SELECT ${clockExpression(dialect)} AS "now"`;

export const stateEpochStatement = (dialect: RuntimeStateDialect, initialize = false): SQL => {
  const lock = dialect === "sqlite" ? sql`` : initialize ? sql` FOR UPDATE` : sql` FOR SHARE`;
  return sql`SELECT "epoch" FROM ${metaTable(dialect)} WHERE "id" = 1${lock}`;
};

export const stateMutexStatement = (dialect: RuntimeStateDialect): SQL => {
  const lock = dialect === "sqlite" ? sql`` : sql` FOR UPDATE`;
  return sql`SELECT "epoch" FROM ${metaTable(dialect)} WHERE "id" = 2${lock}`;
};

export const initializeEpochStatement = (dialect: RuntimeStateDialect, sentinel: string, epoch: string): SQL =>
  sql`UPDATE ${metaTable(dialect)} SET "epoch" = ${epoch} WHERE "id" = 1 AND "epoch" = ${sentinel} RETURNING "epoch"`;

export const stateSnapshotStatement = (
  dialect: RuntimeStateDialect,
  epoch: string,
  keys: readonly string[],
  maxValueBytes: number,
): SQL => {
  const requested =
    keys.length === 0
      ? sql`SELECT CAST(NULL AS TEXT) WHERE 1 = 0`
      : sql`VALUES ${sql.join(
          keys.map((key) => sql`(CAST(${key} AS TEXT))`),
          sql`, `,
        )}`;
  return sql`WITH "observation" AS MATERIALIZED (
      SELECT ${clockExpression(dialect)} AS "now"
    ), "epoch_check" AS MATERIALIZED (
      SELECT "epoch" FROM ${metaTable(dialect)} WHERE "id" = 1
    ), "requested"("key") AS (${requested})
    SELECT "observation"."now" AS "now", "epoch_check"."epoch" AS "epoch",
      "requested"."key" AS "key",
      CASE WHEN "state"."expires_at_ms" IS NULL OR "state"."expires_at_ms" > "observation"."now"
        THEN CASE WHEN ${valueBytesExpression(dialect, sql`"state"."value"`)} <= ${maxValueBytes}
          THEN "state"."value" ELSE NULL END ELSE NULL END AS "value",
      CASE WHEN ("state"."expires_at_ms" IS NULL OR "state"."expires_at_ms" > "observation"."now")
        AND ${valueBytesExpression(dialect, sql`"state"."value"`)} > ${maxValueBytes}
        THEN 1 ELSE 0 END AS "oversized",
      "state"."expires_at_ms" AS "expires_at_ms"
    FROM "observation"
    LEFT JOIN "epoch_check" ON 1 = 1
    LEFT JOIN "requested" ON 1 = 1
    LEFT JOIN ${stateTable(dialect)} AS "state"
      ON "state"."epoch" = ${epoch} AND "state"."key" = "requested"."key"`;
};

export const stateRowsStatement = (
  dialect: RuntimeStateDialect,
  epoch: string,
  keys: readonly string[],
  maxValueBytes: number,
  now: number,
): SQL =>
  sql`SELECT "key", CASE WHEN ${valueBytesExpression(dialect, sql`"value"`)} <= ${maxValueBytes}
      THEN "value" ELSE NULL END AS "value", "expires_at_ms" FROM ${stateTable(dialect)}
    WHERE "epoch" = ${epoch} AND "key" IN (${sql.join(
      keys.map((key) => sql`${key}`),
      sql`, `,
    )}) AND ("expires_at_ms" IS NULL OR "expires_at_ms" > ${now})`;

export const stateWriteStatement = (dialect: RuntimeStateDialect, epoch: string, write: PreparedStateWrite): SQL => {
  if (write.kind === "delete")
    return sql`DELETE FROM ${stateTable(dialect)} WHERE "epoch" = ${epoch} AND "key" = ${write.key}`;
  return sql`INSERT INTO ${stateTable(dialect)} ("epoch", "key", "value", "expires_at_ms")
    VALUES (${epoch}, ${write.key}, ${write.value}, ${write.expiresAtMs})
    ON CONFLICT ("epoch", "key") DO UPDATE
      SET "value" = excluded."value", "expires_at_ms" = excluded."expires_at_ms"`;
};
