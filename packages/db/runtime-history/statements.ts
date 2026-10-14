import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { RuntimeHistoryStream } from "./types";

export const createHistoryStatements = (
  engine: "sqlite" | "postgresql",
  epoch: string,
  stream: RuntimeHistoryStream,
) => {
  const meta = engine === "postgresql" ? sql`"public"."homarr_runtime_meta"` : sql`"homarr_runtime_meta"`;
  const headers =
    engine === "postgresql" ? sql`"public"."homarr_runtime_history_stream"` : sql`"homarr_runtime_history_stream"`;
  const entries =
    engine === "postgresql" ? sql`"public"."homarr_runtime_history_entry"` : sql`"homarr_runtime_history_entry"`;
  const identity = sql`"epoch" = ${epoch} AND "kind" = ${stream.kind} AND "name" = ${stream.name}`;
  const clock =
    engine === "postgresql"
      ? sql`CAST(FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) AS DOUBLE PRECISION)`
      : sql`CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)`;
  const share = engine === "postgresql" ? sql` FOR SHARE` : sql.empty();
  const update = engine === "postgresql" ? sql` FOR UPDATE` : sql.empty();
  const payloadBytes = engine === "postgresql" ? sql`octet_length("payload")` : sql`length(CAST("payload" AS BLOB))`;

  return {
    epoch: sql`SELECT "epoch" FROM ${meta} WHERE "id" = 1${share}`,
    insertHeader: sql`
      INSERT INTO ${headers} ("epoch", "kind", "name", "head_sequence")
      VALUES (${epoch}, ${stream.kind}, ${stream.name}, 0)
      ON CONFLICT ("epoch", "kind", "name") DO NOTHING
    `,
    lockHeader: sql`SELECT CAST("head_sequence" AS TEXT) AS "head_sequence" FROM ${headers} WHERE ${identity}${update}`,
    observeClock: sql`SELECT ${clock} AS "now"`,
    advanceHead(sequence: string): SQL {
      return sql`UPDATE ${headers} SET "head_sequence" = CAST(${sequence} AS BIGINT) WHERE ${identity}`;
    },
    insertEntry(sequence: string, payload: string): SQL {
      return sql`
        INSERT INTO ${entries} ("epoch", "kind", "name", "sequence", "payload")
        VALUES (${epoch}, ${stream.kind}, ${stream.name}, CAST(${sequence} AS BIGINT), ${payload})
      `;
    },
    trim(maxEntries: number): SQL {
      return sql`
        DELETE FROM ${entries} WHERE ${identity} AND "sequence" < (
          SELECT MIN("sequence") FROM (
            SELECT "sequence" FROM ${entries} WHERE ${identity} ORDER BY "sequence" DESC LIMIT ${maxEntries}
          ) AS "retained"
        )
      `;
    },
    newest(maxEntries: number, maxPayloadBytes: number): SQL {
      return sql`
        WITH "observation" AS MATERIALIZED (
          SELECT "epoch", ${clock} AS "now" FROM ${meta} WHERE "id" = 1
        )
        SELECT "observation"."epoch", "observation"."now",
          CAST("newest"."sequence" AS TEXT) AS "sequence", "newest"."payload"
        FROM "observation" LEFT JOIN (
          SELECT "sequence", CASE WHEN ${payloadBytes} <= ${maxPayloadBytes} THEN "payload" END AS "payload" FROM ${entries}
          WHERE ${identity} ORDER BY "sequence" DESC LIMIT ${maxEntries}
        ) AS "newest" ON "observation"."epoch" = ${epoch}
        ORDER BY "newest"."sequence" DESC
      `;
    },
    clear: sql`DELETE FROM ${entries} WHERE ${identity}`,
  };
};

export type HistoryStatements = ReturnType<typeof createHistoryStatements>;
