import { sql } from "drizzle-orm";
import {
  check,
  customType,
  foreignKey,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

const identityText = customType<{ data: string; driverData: string }>({
  dataType: () => "text COLLATE BINARY",
});

export const runtimeMeta = sqliteTable(
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

export const runtimeState = sqliteTable(
  "homarr_runtime_state",
  {
    epoch: identityText("epoch").notNull(),
    key: identityText("key").notNull(),
    value: text("value").notNull(),
    expiresAtMs: real("expires_at_ms"),
  },
  (table) => [
    primaryKey({ name: "homarr_runtime_state_pk", columns: [table.epoch, table.key] }),
    index("homarr_runtime_state_expiry_idx").on(table.epoch, table.expiresAtMs, table.key),
  ],
);

export const runtimeHistoryStream = sqliteTable(
  "homarr_runtime_history_stream",
  {
    epoch: identityText("epoch").notNull(),
    kind: identityText("kind").$type<"log" | "sample">().notNull(),
    name: identityText("name").notNull(),
    headSequence: integer("head_sequence").notNull(),
  },
  (table) => [
    primaryKey({ name: "homarr_runtime_history_stream_pk", columns: [table.epoch, table.kind, table.name] }),
    check("homarr_runtime_history_stream_kind_check", sql`${table.kind} IN ('log', 'sample')`),
    check("homarr_runtime_history_stream_sequence_check", sql`${table.headSequence} >= 0`),
  ],
);

export const runtimeHistoryEntry = sqliteTable(
  "homarr_runtime_history_entry",
  {
    epoch: identityText("epoch").notNull(),
    kind: identityText("kind").$type<"log" | "sample">().notNull(),
    name: identityText("name").notNull(),
    sequence: integer("sequence").notNull(),
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
