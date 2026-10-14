import type { MigrationMeta } from "drizzle-orm/migrator";

import type { CopiedSqlRow, CopiedSqlValue } from "./copied-sqlite";
import { assertSqliteMainTarget, readMainTargetBundle } from "./main-target-catalog";
import { assertSqliteMigrationHistory } from "./migrations/compatibility";
import mainSnapshot from "./migrations/sqlite/meta/0050_snapshot.json";
import { runtimeCatalog } from "./runtime-catalog";

export interface CopiedCatalogReader {
  all(query: string, values?: CopiedSqlValue[]): CopiedSqlRow[];
  iterate(query: string, values?: CopiedSqlValue[]): Iterable<CopiedSqlRow>;
}

type SqlToken = { kind: "keyword" | "identifier" | "literal" | "number" | "symbol"; value: string };
type ObjectDdl = { kind: "table" | "index"; table: string; tokens: SqlToken[] };

export interface CopiedCatalogBundle {
  identity: string;
  migrationCount: number;
  migrations: readonly MigrationMeta[];
  ddl: ReadonlyMap<string, ObjectDdl>;
}

interface CatalogColumn {
  name: string;
  type: string;
  primaryKey: boolean;
  notNull: boolean;
  default?: unknown;
}

interface CatalogTable {
  name: string;
  columns: Record<string, CatalogColumn>;
  compositePrimaryKeys: Record<string, { columns: string[] }>;
  indexes: Record<string, { name: string; columns: string[]; isUnique: boolean }>;
  foreignKeys: Record<
    string,
    {
      tableTo: string;
      columnsFrom: string[];
      columnsTo: string[];
      onDelete: string;
      onUpdate: string;
    }
  >;
}

const tables: CatalogTable[] = Object.values(runtimeCatalog.sqlite.tables);
const tableNames = new Set(tables.map((table) => table.name));
const keywords = new Set([
  "CREATE",
  "TABLE",
  "INDEX",
  "ON",
  "PRIMARY",
  "KEY",
  "FOREIGN",
  "REFERENCES",
  "UPDATE",
  "DELETE",
  "NO",
  "ACTION",
  "CASCADE",
  "CONSTRAINT",
  "CHECK",
  "AND",
  "OR",
  "IS",
  "NOT",
  "NULL",
  "IN",
  "COLLATE",
  "BINARY",
  "TEXT",
  "INTEGER",
  "REAL",
  "SERIAL",
  "NUMERIC",
  "IF",
  "EXISTS",
  "INSERT",
  "INTO",
  "VALUES",
]);

const reject = (): never => {
  throw new Error("Unsupported copied SQLite catalog");
};

const tokensFor = (sql: unknown): SqlToken[] => {
  if (typeof sql !== "string" || Buffer.byteLength(sql) > 65536) return reject();
  const tokens: SqlToken[] = [];
  let offset = 0;
  while (offset < sql.length) {
    if (tokens.length >= 2048) return reject();
    const character = sql[offset];
    if (!character) return reject();
    if (/[ \t\r\n\f]/.test(character)) {
      offset++;
      continue;
    }
    if (character === '"' || character === "`" || character === "'") {
      offset++;
      let value = "";
      let closed = false;
      while (offset < sql.length) {
        const next = sql[offset++];
        if (next === character) {
          if (sql[offset] === character) {
            value += character;
            offset++;
          } else {
            closed = true;
            break;
          }
        } else {
          if (!next || next === "\0") return reject();
          value += next;
        }
      }
      if (!closed) return reject();
      tokens.push({ kind: character === "'" ? "literal" : "identifier", value });
      continue;
    }
    const word = /^[A-Za-z_][A-Za-z_0-9]*/.exec(sql.slice(offset))?.[0];
    if (word) {
      const upper = word.toUpperCase();
      tokens.push(keywords.has(upper) ? { kind: "keyword", value: upper } : { kind: "identifier", value: word });
      offset += word.length;
      continue;
    }
    const number = /^\d+/.exec(sql.slice(offset))?.[0];
    if (number) {
      tokens.push({ kind: "number", value: number });
      offset += number.length;
      continue;
    }
    const symbol = sql.startsWith(">=", offset) ? ">=" : character;
    if (["(", ")", ",", ".", ">", ">=", "=", ";"].includes(symbol)) {
      tokens.push({ kind: "symbol", value: symbol });
      offset += symbol.length;
      continue;
    }
    return reject();
  }
  if (tokens.at(-1)?.value === ";") tokens.pop();
  return tokens;
};

const sameTokens = (actual: SqlToken[], expected: SqlToken[]) =>
  actual.length === expected.length &&
  actual.every((token, index) => token.kind === expected[index]?.kind && token.value === expected[index]?.value);

export const readCopiedCatalogBundle = (migrationsFolder: string): CopiedCatalogBundle => {
  const bundle = readMainTargetBundle("sqlite", migrationsFolder);
  const migration = bundle.migrations[bundle.runtimeAnchorIndex];
  if (
    !migration ||
    bundle.runtimeAnchorIndex !== runtimeCatalog.sqlite.migration.idx ||
    migration.hash !== runtimeCatalog.sqlite.migration.sqlSha256 ||
    migration.folderMillis !== runtimeCatalog.sqlite.migration.when ||
    migration.bps !== runtimeCatalog.sqlite.migration.breakpoints
  )
    return reject();
  const ddl = new Map<string, ObjectDdl>();
  for (const sql of migration.sql) {
    const tokens = tokensFor(sql);
    const name = tokens[2];
    if (tokens[0]?.value !== "CREATE" || name?.kind !== "identifier") continue;
    if (tokens[1]?.value === "TABLE" && tableNames.has(name.value)) {
      if (ddl.has(name.value)) return reject();
      ddl.set(name.value, { kind: "table", table: name.value, tokens });
    } else if (tokens[1]?.value === "INDEX") {
      const table = tokens[4];
      if (
        tokens[3]?.value !== "ON" ||
        table?.kind !== "identifier" ||
        !tableNames.has(table.value) ||
        ddl.has(name.value)
      )
        return reject();
      ddl.set(name.value, { kind: "index", table: table.value, tokens });
    } else return reject();
  }
  const expectedNames = tables.flatMap((table) => [table.name, ...Object.keys(table.indexes)]);
  if (ddl.size !== expectedNames.length || expectedNames.some((name) => !ddl.has(name))) return reject();
  return Object.freeze({
    identity: bundle.identity,
    migrationCount: bundle.migrationCount,
    migrations: bundle.migrations,
    ddl,
  });
};

export const isCopiedRuntimeSchemaObject = (object: CopiedSqlRow) =>
  [object.name, object.tbl_name].some(
    (name) =>
      typeof name === "string" &&
      (name.startsWith("homarr_runtime_") ||
        tables.some((table) => name.startsWith(`sqlite_autoindex_${table.name}_`))),
  );

const primaryColumns = (table: CatalogTable): string[] => {
  const composite = Object.values(table.compositePrimaryKeys);
  const inline = Object.values(table.columns)
    .filter((column) => column.primaryKey)
    .map((column) => column.name);
  if (composite.length > 1 || (composite.length && inline.length)) return reject();
  return composite[0]?.columns ?? inline;
};

const hasPrimaryIndex = (table: CatalogTable) => {
  const columns = primaryColumns(table);
  return (
    columns.length > 1 || (columns.length === 1 && table.columns[columns[0] ?? ""]?.type.toUpperCase() !== "INTEGER")
  );
};

export const copiedRuntimeObjectLimit =
  tables.length +
  tables.reduce((count, table) => count + Object.keys(table.indexes).length, 0) +
  tables.filter(hasPrimaryIndex).length;

const assertColumns = (reader: CopiedCatalogReader, table: CatalogTable) => {
  const expected = Object.values(table.columns);
  const primary = primaryColumns(table);
  const actual = reader.all(
    'SELECT cid, name, type, "notnull", dflt_value, pk, hidden FROM pragma_table_xinfo(?, ?) ORDER BY cid LIMIT ?',
    [table.name, "main", expected.length + 1],
  );
  if (
    actual.length !== expected.length ||
    actual.some((column, index) => {
      const target = expected[index];
      if (!target) return true;
      const type = tokensFor(target.type)[0]?.value.toUpperCase();
      return (
        column.cid !== index ||
        column.name !== target.name ||
        typeof column.type !== "string" ||
        column.type.toUpperCase() !== type ||
        column.notnull !== Number(target.notNull) ||
        column.pk !== primary.indexOf(target.name) + 1 ||
        column.hidden !== 0 ||
        column.dflt_value !== (target.default ?? null)
      );
    })
  )
    return reject();
};

const assertForeignKeys = (reader: CopiedCatalogReader, table: CatalogTable) => {
  const foreignKeys = Object.values(table.foreignKeys);
  const expectedCount = foreignKeys.reduce((count, key) => count + key.columnsFrom.length, 0);
  const actual = reader.all(
    'SELECT id, seq, "table", "from", "to", on_update, on_delete, "match" FROM pragma_foreign_key_list(?, ?) ORDER BY id, seq LIMIT ?',
    [table.name, "main", expectedCount + 1],
  );
  if (actual.length !== expectedCount || foreignKeys.length > 1) return reject();
  const expected = foreignKeys[0];
  if (
    expected &&
    actual.some(
      (row, index) =>
        row.id !== 0 ||
        row.seq !== index ||
        row.table !== expected.tableTo ||
        row.from !== expected.columnsFrom[index] ||
        row.to !== expected.columnsTo[index] ||
        row.on_update !== expected.onUpdate.toUpperCase() ||
        row.on_delete !== expected.onDelete.toUpperCase() ||
        row.match !== "NONE",
    )
  )
    return reject();
};

const assertIndexColumns = (reader: CopiedCatalogReader, table: CatalogTable, name: string, columns: string[]) => {
  const actual = reader.all(
    'SELECT seqno, cid, name, "desc", coll, "key" FROM pragma_index_xinfo(?, ?) ORDER BY seqno LIMIT ?',
    [name, "main", columns.length + 2],
  );
  const columnNames = Object.keys(table.columns);
  if (
    actual.length !== columns.length + 1 ||
    actual.some((column, index) => {
      if (column.seqno !== index || column.desc !== 0 || column.coll !== runtimeCatalog.sqlite.identityCollation)
        return true;
      if (index === columns.length) return column.key !== 0 || column.cid !== -1 || column.name !== null;
      const expected = columns[index];
      return !expected || column.key !== 1 || column.name !== expected || column.cid !== columnNames.indexOf(expected);
    })
  )
    return reject();
};

const assertIndexes = (reader: CopiedCatalogReader, table: CatalogTable) => {
  const expected = new Map(
    Object.values(table.indexes).map((index) => [
      index.name,
      { columns: index.columns, unique: Number(index.isUnique), origin: "c" },
    ]),
  );
  if (hasPrimaryIndex(table))
    expected.set(`sqlite_autoindex_${table.name}_1`, { columns: primaryColumns(table), unique: 1, origin: "pk" });
  const actual = reader.all(
    'SELECT name, "unique", origin, partial FROM pragma_index_list(?, ?) ORDER BY name LIMIT ?',
    [table.name, "main", expected.size + 1],
  );
  if (actual.length !== expected.size) return reject();
  for (const index of actual) {
    if (typeof index.name !== "string") return reject();
    const target = expected.get(index.name);
    if (!target || index.unique !== target.unique || index.origin !== target.origin || index.partial !== 0)
      return reject();
    assertIndexColumns(reader, table, index.name, target.columns);
    expected.delete(index.name);
  }
  if (expected.size) return reject();
};

const ledger: CatalogTable = {
  name: "__drizzle_migrations",
  columns: {
    id: { name: "id", type: "SERIAL", primaryKey: true, notNull: false },
    hash: { name: "hash", type: "text", primaryKey: false, notNull: true },
    created_at: { name: "created_at", type: "numeric", primaryKey: false, notNull: false },
  },
  compositePrimaryKeys: {},
  foreignKeys: {},
  indexes: {},
};

const assertLedgerObject = (reader: CopiedCatalogReader) => {
  const objects = reader.all("SELECT type, name, tbl_name, sql FROM main.sqlite_master WHERE name = ? LIMIT 2", [
    ledger.name,
  ]);
  const object = objects[0];
  if (
    objects.length !== 1 ||
    !object ||
    object.type !== "table" ||
    object.name !== ledger.name ||
    object.tbl_name !== ledger.name
  )
    return reject();
  const actual = tokensFor(object.sql);
  if (actual[2]?.value === "IF" && actual[3]?.value === "NOT" && actual[4]?.value === "EXISTS") actual.splice(2, 3);
  if (
    !sameTokens(
      actual,
      tokensFor('CREATE TABLE "__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)'),
    )
  )
    return reject();
  assertColumns(reader, ledger);
  assertForeignKeys(reader, ledger);
  const primary = reader.all(
    'SELECT name, "unique", origin, partial FROM pragma_index_list(?, ?) WHERE origin = ? LIMIT 2',
    [ledger.name, "main", "pk"],
  );
  const index = primary[0];
  const indexName = `sqlite_autoindex_${ledger.name}_1`;
  if (
    primary.length !== 1 ||
    !index ||
    index.name !== indexName ||
    index.unique !== 1 ||
    index.origin !== "pk" ||
    index.partial !== 0
  )
    return reject();
  assertIndexColumns(reader, ledger, indexName, primaryColumns(ledger));
  assertIndexes(reader, ledger);
};

export const assertCopiedCatalogPrefix = (reader: CopiedCatalogReader, migrationsFolder: string): void => {
  const bundle = readCopiedCatalogBundle(migrationsFolder);
  assertLedgerObject(reader);
  const rows = reader.all(
    "SELECT hash, created_at FROM main.__drizzle_migrations NOT INDEXED ORDER BY created_at LIMIT ?",
    [bundle.migrationCount + 1],
  );
  assertSqliteMigrationHistory(
    rows.map((row) => ({ hash: row.hash, created_at: row.created_at })),
    migrationsFolder,
  );
  if (rows.length === bundle.migrationCount) {
    assertSqliteMainTarget(reader, migrationsFolder);
    return;
  }
  const objects = readPrefixObjects(reader);
  if (rows.length <= runtimeCatalog.sqlite.sourceJournalLength) {
    if (objects.length) return reject();
    return;
  }
  if (rows.length !== runtimeCatalog.sqlite.targetJournalLength) return reject();
  const expectedCount = bundle.ddl.size + tables.filter(hasPrimaryIndex).length;
  if (objects.length !== expectedCount) return reject();
  const seen = new Set<string>();
  for (const object of objects) {
    if (typeof object.name !== "string" || typeof object.tbl_name !== "string" || seen.has(object.name))
      return reject();
    seen.add(object.name);
    const expected = bundle.ddl.get(object.name);
    if (expected) {
      if (
        object.type !== expected.kind ||
        object.tbl_name !== expected.table ||
        !sameTokens(tokensFor(object.sql), expected.tokens)
      )
        return reject();
    } else {
      const table = tables.find((table) => table.name === object.tbl_name);
      if (
        !table ||
        !hasPrimaryIndex(table) ||
        object.type !== "index" ||
        object.sql !== null ||
        object.name !== `sqlite_autoindex_${table.name}_1`
      )
        return reject();
    }
  }
  if ([...bundle.ddl.keys()].some((name) => !seen.has(name))) return reject();
  for (const table of tables) {
    assertColumns(reader, table);
    assertForeignKeys(reader, table);
    assertIndexes(reader, table);
  }
  const meta = runtimeCatalog.initialMetaRows;
  const rowsMeta = reader.all(
    `SELECT id, typeof(epoch) AS epoch_type, epoch IS NULL AS epoch_is_null FROM main.homarr_runtime_meta ORDER BY id LIMIT ?`,
    [meta.length + 1],
  );
  if (
    rowsMeta.length !== meta.length ||
    rowsMeta.some(
      (row, index) =>
        row.id !== meta[index]?.id ||
        row.epoch_type !== (meta[index]?.epoch === null ? "null" : "text") ||
        row.epoch_is_null !== Number(meta[index]?.epoch === null),
    )
  )
    return reject();
};

const readPrefixObjects = (reader: CopiedCatalogReader): CopiedSqlRow[] => {
  const schemas = reader.all("SELECT name FROM pragma_database_list LIMIT 3");
  if (
    schemas.length === 0 ||
    schemas.length > 2 ||
    !schemas.some((row) => row.name === "main") ||
    schemas.some((row) => row.name !== "main" && row.name !== "temp") ||
    reader.all("SELECT name FROM sqlite_temp_master LIMIT 1").length !== 0
  )
    return reject();
  const applicationTables: CatalogTable[] = Object.values(mainSnapshot.tables).filter(
    (table) => !tableNames.has(table.name) && table.name !== "homarr_auth_credential_domain",
  );
  const allowedTables = new Set(applicationTables.map((table) => table.name));
  allowedTables.add(ledger.name);
  const allowedIndexes = new Map(
    applicationTables.flatMap((table) =>
      Object.values(table.indexes).map((index) => [index.name, table.name] satisfies [string, string]),
    ),
  );
  const implicitIndexes = new Map<string, string>();
  for (const table of [...applicationTables, ledger])
    if (hasPrimaryIndex(table)) implicitIndexes.set(`sqlite_autoindex_${table.name}_1`, table.name);
  const limit = allowedTables.size + allowedIndexes.size + implicitIndexes.size + copiedRuntimeObjectLimit + 2;
  const all = reader.all("SELECT type, name, tbl_name, sql FROM main.sqlite_master ORDER BY name LIMIT ?", [limit + 1]);
  if (all.length > limit) return reject();
  const runtime: CopiedSqlRow[] = [];
  const seen = new Set<string>();
  for (const object of all) {
    if (typeof object.name !== "string" || typeof object.tbl_name !== "string" || seen.has(object.name))
      return reject();
    seen.add(object.name);
    if (isCopiedRuntimeSchemaObject(object)) {
      runtime.push(object);
      continue;
    }
    if (object.type === "index" && object.sql === null && implicitIndexes.get(object.name) === object.tbl_name) {
      const indexes = reader.all("SELECT name, origin FROM pragma_index_list(?, ?) WHERE name = ? LIMIT 2", [
        object.tbl_name,
        "main",
        object.name,
      ]);
      if (indexes.length !== 1 || indexes[0]?.origin !== "pk") return reject();
      continue;
    }
    if (
      object.type === "table" &&
      object.name === object.tbl_name &&
      allowedTables.has(object.name) &&
      typeof object.sql === "string" &&
      /^CREATE\s+TABLE\s/i.test(object.sql) &&
      !/\b(auth_lifetime_sequence|auth_write_sequence)\b/i.test(object.sql)
    )
      continue;
    if (
      object.type === "index" &&
      allowedIndexes.get(object.name) === object.tbl_name &&
      typeof object.sql === "string" &&
      /^CREATE\s+(?:UNIQUE\s+)?INDEX\s/i.test(object.sql)
    )
      continue;
    let statistics: string[] | undefined;
    if (object.name === "sqlite_stat1") statistics = ["tbl", "idx", "stat"];
    if (object.name === "sqlite_stat4") statistics = ["tbl", "idx", "neq", "nlt", "ndlt", "sample"];
    if (
      statistics &&
      object.type === "table" &&
      object.name === object.tbl_name &&
      object.sql === `CREATE TABLE ${object.name}(${statistics.join(",")})`
    ) {
      const columns = reader.all(
        'SELECT name, type, pk, "notnull", dflt_value, hidden FROM pragma_table_xinfo(?, ?) ORDER BY cid LIMIT ?',
        [object.name, "main", statistics.length + 1],
      );
      if (
        columns.length !== statistics.length ||
        columns.some(
          (column, index) =>
            column.name !== statistics[index] ||
            column.type !== "" ||
            column.pk !== 0 ||
            column.notnull !== 0 ||
            column.dflt_value !== null ||
            column.hidden !== 0,
        )
      )
        return reject();
      if (
        reader.all("SELECT name FROM pragma_index_list(?, ?) LIMIT 1", [object.name, "main"]).length !== 0 ||
        reader.all("SELECT id FROM pragma_foreign_key_list(?, ?) LIMIT 1", [object.name, "main"]).length !== 0
      )
        return reject();
      continue;
    }
    return reject();
  }
  return runtime;
};
