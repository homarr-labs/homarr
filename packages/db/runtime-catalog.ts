import sqliteSnapshot from "./migrations/sqlite/meta/0049_snapshot.json";
import postgresqlSnapshot from "./migrations/postgresql/meta/0017_snapshot.json";

export const runtimeUninitializedEpoch = "homarr-runtime:uninitialized:v1";

export const runtimeCatalog = {
  version: "homarr.runtime.sql.v1",
  initialMetaRows: [
    { id: 1, epoch: runtimeUninitializedEpoch },
    { id: 2, epoch: null },
  ],
  sqlite: {
    dialect: "sqlite",
    identityCollation: "BINARY",
    sourceJournalLength: 49,
    targetJournalLength: 50,
    migration: {
      idx: 49,
      version: "6",
      when: 1791712104288,
      tag: "0049_robust_gateway",
      breakpoints: true,
      sqlPath: "migrations/sqlite/0049_robust_gateway.sql",
      generatedSqlSha256: "ea24d0f5cc3737531835c7b778b5c2250981dad9d0f14fb9f32e7f924d81d870",
      sqlSha256: "29d003efc340625e9539d5a133508cb98e6e66342934d295855577074643141e",
    },
    snapshot: {
      path: "migrations/sqlite/meta/0049_snapshot.json",
      version: sqliteSnapshot.version,
      id: sqliteSnapshot.id,
      prevId: sqliteSnapshot.prevId,
      sha256: "c34fa23c8b1caa400ce0e2082d715cffefba05a5078e4b904512ed0835bd17f1",
      runtimeDefinitionsSha256: "f5bb4c1b842005743ef575e20b390c1cc8388d6acbf1beb820a19fb860d4397a",
    },
    tables: {
      homarr_runtime_meta: sqliteSnapshot.tables.homarr_runtime_meta,
      homarr_runtime_state: sqliteSnapshot.tables.homarr_runtime_state,
      homarr_runtime_history_stream: sqliteSnapshot.tables.homarr_runtime_history_stream,
      homarr_runtime_history_entry: sqliteSnapshot.tables.homarr_runtime_history_entry,
    },
    physicalPrimaryKeyNames: {
      homarr_runtime_meta: null,
      homarr_runtime_state: null,
      homarr_runtime_history_stream: null,
      homarr_runtime_history_entry: null,
    },
    physicalHistoryForeignKeyName: null,
  },
  postgresql: {
    dialect: "postgresql",
    schema: "public",
    identityCollation: "C",
    sourceJournalLength: 17,
    targetJournalLength: 18,
    migration: {
      idx: 17,
      version: "7",
      when: 1791712152164,
      tag: "0017_ambitious_roughhouse",
      breakpoints: true,
      sqlPath: "migrations/postgresql/0017_ambitious_roughhouse.sql",
      generatedSqlSha256: "1dd401528dd05ba9afb4571e292588a28929e71ba3ea56c83a124c6b7b5ff107",
      sqlSha256: "5ca45b95e8d355064a2cd0317c7c5f56b2aab2cc4868fdb2ca32564b5ee81529",
    },
    snapshot: {
      path: "migrations/postgresql/meta/0017_snapshot.json",
      version: postgresqlSnapshot.version,
      id: postgresqlSnapshot.id,
      prevId: postgresqlSnapshot.prevId,
      sha256: "402debe006db3382d23f1077727396d1c13050633d6f247c5d92f6d491ccf81f",
      runtimeDefinitionsSha256: "1c8c420a79af1994c63d5e2a851add7ed34a72f90e19f16aa236d7db3eee6039",
    },
    tables: {
      homarr_runtime_meta: postgresqlSnapshot.tables["public.homarr_runtime_meta"],
      homarr_runtime_state: postgresqlSnapshot.tables["public.homarr_runtime_state"],
      homarr_runtime_history_stream: postgresqlSnapshot.tables["public.homarr_runtime_history_stream"],
      homarr_runtime_history_entry: postgresqlSnapshot.tables["public.homarr_runtime_history_entry"],
    },
    physicalPrimaryKeyNames: {
      homarr_runtime_meta: "homarr_runtime_meta_pkey",
      homarr_runtime_state: "homarr_runtime_state_pk",
      homarr_runtime_history_stream: "homarr_runtime_history_stream_pk",
      homarr_runtime_history_entry: "homarr_runtime_history_entry_pk",
    },
    physicalHistoryForeignKeyName: "homarr_runtime_history_entry_stream_fk",
  },
} as const;
