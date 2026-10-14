import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  customType,
  doublePrecision,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";

const identityText = customType<{ data: string; driverData: string }>({
  dataType: () => 'text COLLATE "C"',
});

export const runtimeMeta = pgTable(
  "homarr_runtime_meta",
  {
    id: integer("id").primaryKey().notNull(),
    epoch: identityText("epoch"),
  },
  (table) => [
    check(
      "homarr_runtime_meta_identity_check",
      sql`(${table.id} = 1 AND ${table.epoch} IS NOT NULL) OR (${table.id} = 2 AND ${table.epoch} IS NULL)`,
    ),
  ],
);

export const runtimeState = pgTable(
  "homarr_runtime_state",
  {
    epoch: identityText("epoch").notNull(),
    key: identityText("key").notNull(),
    value: text("value").notNull(),
    expiresAtMs: doublePrecision("expires_at_ms"),
  },
  (table) => [
    primaryKey({ name: "homarr_runtime_state_pk", columns: [table.epoch, table.key] }),
    index("homarr_runtime_state_expiry_idx").on(table.epoch, table.expiresAtMs, table.key),
  ],
);

export const runtimeHistoryStream = pgTable(
  "homarr_runtime_history_stream",
  {
    epoch: identityText("epoch").notNull(),
    kind: identityText("kind").$type<"log" | "sample">().notNull(),
    name: identityText("name").notNull(),
    headSequence: bigint("head_sequence", { mode: "bigint" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "homarr_runtime_history_stream_pk", columns: [table.epoch, table.kind, table.name] }),
    check("homarr_runtime_history_stream_kind_check", sql`${table.kind} IN ('log', 'sample')`),
    check("homarr_runtime_history_stream_sequence_check", sql`${table.headSequence} >= 0`),
  ],
);

export const runtimeHistoryEntry = pgTable(
  "homarr_runtime_history_entry",
  {
    epoch: identityText("epoch").notNull(),
    kind: identityText("kind").$type<"log" | "sample">().notNull(),
    name: identityText("name").notNull(),
    sequence: bigint("sequence", { mode: "bigint" }).notNull(),
    payload: text("payload").notNull(),
  },
  (table) => [
    primaryKey({
      name: "homarr_runtime_history_entry_pk",
      columns: [table.epoch, table.kind, table.name, table.sequence],
    }),
    check("homarr_runtime_history_entry_sequence_check", sql`${table.sequence} > 0`),
    foreignKey({
      name: "homarr_runtime_history_entry_stream_fk",
      columns: [table.epoch, table.kind, table.name],
      foreignColumns: [runtimeHistoryStream.epoch, runtimeHistoryStream.kind, runtimeHistoryStream.name],
    }).onDelete("cascade"),
  ],
);
