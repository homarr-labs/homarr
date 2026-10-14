import { Buffer } from "node:buffer";
import type { Database, Statement } from "bun:sqlite";

import sqliteSnapshot from "./migrations/sqlite/meta/0050_snapshot.json";
import {
  authCredentialNamespace,
  authCredentialSequence,
  decodeAuthCredentialPair,
} from "./runtime-auth-credential/validation";
import { assertEpoch } from "./runtime-state/validation";

const limits = Object.freeze({
  tableRows: 4096,
  totalRows: 32768,
  textBytes: 1024 * 1024,
  blobBytes: 16 * 1024 * 1024,
  rowBytes: 20 * 1024 * 1024,
  totalBytes: 64 * 1024 * 1024,
  operationMs: 10_000,
});
const runtimeTables = new Set([
  "homarr_runtime_history_entry",
  "homarr_runtime_history_stream",
  "homarr_runtime_state",
  "homarr_runtime_meta",
]);
const observationIdentity = Symbol("native-sqlite-preservation-observation");
const preparedIdentity = Symbol("prepared-sqlite-preservation-observation");

export interface SqlitePreservationOperation {
  readonly signal: AbortSignal;
  readonly lifetime: AbortSignal;
  readonly deadlineAt: number;
  readonly originalWallStartedAt: number;
  readonly originalMonotonicStartedAt: number;
  readonly originalBudgetMs: number;
  readonly originalMonotonicExpiresAt: number;
}

export interface NativeSqlitePreservationObservation {
  readonly [observationIdentity]: true;
}

export interface PreparedSqlitePreservationObservation {
  readonly [preparedIdentity]: true;
}

interface Column {
  readonly name: string;
  readonly type: string;
}

interface Table {
  readonly name: string;
  readonly columns: readonly Column[];
  readonly section: "preservation" | "runtime";
}

type Encoding = "UTF-8" | "UTF-16le" | "UTF-16be";
type Storage = "null" | "integer" | "text" | "blob" | "real";
type Cell =
  | { readonly storage: "null"; readonly bytes: Buffer }
  | { readonly storage: "integer"; readonly bytes: Buffer; readonly integer: string }
  | { readonly storage: "text" | "blob" | "real"; readonly bytes: Buffer };

interface Identity {
  readonly encoding: Encoding;
  readonly epoch: string;
  readonly namespace: string;
  readonly head: string;
}

interface PreparedRecord {
  readonly owner: object;
  readonly clock: SqlitePreservationClock;
  readonly bundle: string;
  readonly epoch: string;
  readonly bytes: Buffer;
}

interface ObservationRecord extends PreparedRecord {
  users: number;
  retiring: boolean;
}

const preparedRecords = new WeakMap<PreparedSqlitePreservationObservation, PreparedRecord>();
const observations = new WeakMap<NativeSqlitePreservationObservation, ObservationRecord>();
const disposedObservations = new WeakSet<NativeSqlitePreservationObservation>();

const reject = (): never => {
  throw new Error("SQLITE_PRESERVATION_UNAVAILABLE");
};

const ownRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return reject();
  if (Object.getOwnPropertySymbols(value).length !== 0) return reject();
  const result: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor)) return reject();
    Object.defineProperty(result, key, { value: descriptor.value, enumerable: true });
  }
  return result;
};

const identifier = (value: unknown): string => {
  if (typeof value !== "string" || !/^[A-Za-z_][A-Za-z_0-9]*$/.test(value)) return reject();
  return value;
};

const compareAscii = (left: string, right: string): number => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

const specification = (() => {
  const source = ownRecord(sqliteSnapshot);
  if (source.version !== "6" || source.dialect !== "sqlite") return reject();
  const tables: Table[] = [];
  const types = new Set(["text", "text COLLATE BINARY", "integer", "real", "blob", "numeric", "SERIAL"]);
  for (const [name, value] of Object.entries(ownRecord(source.tables))) {
    const table = ownRecord(value);
    if (identifier(name) !== table.name || name === "__drizzle_migrations") return reject();
    const columns: Column[] = [];
    for (const [columnName, definition] of Object.entries(ownRecord(table.columns))) {
      const column = ownRecord(definition);
      if (identifier(columnName) !== column.name || typeof column.type !== "string" || !types.has(column.type))
        return reject();
      columns.push(Object.freeze({ name: columnName, type: column.type }));
    }
    if (columns.length === 0) return reject();
    columns.sort((left, right) => compareAscii(left.name, right.name));
    let section: Table["section"] = "preservation";
    if (runtimeTables.has(name)) section = "runtime";
    tables.push(Object.freeze({ name, columns: Object.freeze(columns), section }));
  }
  for (const name of runtimeTables) if (!tables.some((table) => table.name === name)) return reject();
  tables.push(
    Object.freeze<Table>({
      name: "__drizzle_migrations",
      columns: Object.freeze([
        Object.freeze({ name: "created_at", type: "numeric" }),
        Object.freeze({ name: "hash", type: "text" }),
        Object.freeze({ name: "id", type: "SERIAL" }),
      ]),
      section: "preservation",
    }),
  );
  tables.sort((left, right) => compareAscii(left.name, right.name));
  if (new Set(tables.map((table) => table.name)).size !== tables.length) return reject();
  for (const table of tables) {
    identifier(table.name);
    if (new Set(table.columns.map((column) => column.name)).size !== table.columns.length) return reject();
    for (const column of table.columns) {
      identifier(column.name);
      if (!types.has(column.type)) return reject();
    }
  }
  return Object.freeze(tables);
})();

export const captureSqlitePreservationOperation = (input: SqlitePreservationOperation): SqlitePreservationOperation => {
  const value = ownRecord(input);
  const {
    signal,
    lifetime,
    deadlineAt,
    originalWallStartedAt,
    originalMonotonicStartedAt,
    originalBudgetMs,
    originalMonotonicExpiresAt,
  } = value;
  if (
    Object.keys(value).length !== 7 ||
    ![
      "signal",
      "lifetime",
      "deadlineAt",
      "originalWallStartedAt",
      "originalMonotonicStartedAt",
      "originalBudgetMs",
      "originalMonotonicExpiresAt",
    ].every((key) => Object.hasOwn(value, key)) ||
    !(signal instanceof AbortSignal) ||
    !(lifetime instanceof AbortSignal) ||
    typeof deadlineAt !== "number" ||
    !Number.isSafeInteger(deadlineAt) ||
    typeof originalWallStartedAt !== "number" ||
    !Number.isSafeInteger(originalWallStartedAt) ||
    originalWallStartedAt < 0 ||
    typeof originalMonotonicStartedAt !== "number" ||
    !Number.isFinite(originalMonotonicStartedAt) ||
    originalMonotonicStartedAt < 0 ||
    typeof originalBudgetMs !== "number" ||
    !Number.isSafeInteger(originalBudgetMs) ||
    originalBudgetMs < 1 ||
    originalBudgetMs > limits.operationMs ||
    typeof originalMonotonicExpiresAt !== "number" ||
    !Number.isFinite(originalMonotonicExpiresAt) ||
    originalMonotonicExpiresAt !== originalMonotonicStartedAt + originalBudgetMs ||
    !Number.isSafeInteger(originalWallStartedAt + originalBudgetMs) ||
    deadlineAt > originalWallStartedAt + originalBudgetMs ||
    deadlineAt <= originalWallStartedAt
  )
    return reject();
  return Object.freeze({
    signal,
    lifetime,
    deadlineAt,
    originalWallStartedAt,
    originalMonotonicStartedAt,
    originalBudgetMs,
    originalMonotonicExpiresAt,
  });
};

export class SqlitePreservationClock {
  private lastWall: number;
  private lastMonotonic: number;
  private lastNativeWall: number;
  readonly effectiveMonotonicExpiresAt: number;

  constructor(
    readonly operation: SqlitePreservationOperation,
    private readonly ownerLifetime: AbortSignal,
  ) {
    this.lastWall = operation.originalWallStartedAt;
    this.lastNativeWall = operation.originalWallStartedAt;
    this.lastMonotonic = operation.originalMonotonicStartedAt;
    this.effectiveMonotonicExpiresAt = Math.min(
      operation.originalMonotonicExpiresAt,
      operation.originalMonotonicStartedAt + (operation.deadlineAt - operation.originalWallStartedAt),
    );
    this.check();
  }

  check(): number {
    this.ownerLifetime.throwIfAborted();
    this.operation.lifetime.throwIfAborted();
    this.operation.signal.throwIfAborted();
    const wall = Date.now();
    const monotonic = performance.now();
    if (
      !Number.isSafeInteger(wall) ||
      wall < this.lastWall ||
      !Number.isFinite(monotonic) ||
      monotonic < this.lastMonotonic
    )
      return reject();
    this.lastWall = wall;
    this.lastMonotonic = monotonic;
    const remaining = Math.min(
      this.operation.originalWallStartedAt + this.operation.originalBudgetMs - wall,
      this.operation.deadlineAt - wall,
      this.operation.originalMonotonicExpiresAt - monotonic,
      this.effectiveMonotonicExpiresAt - monotonic,
    );
    if (!Number.isFinite(remaining) || remaining < 1) return reject();
    return Math.min(2147483647, Math.floor(remaining));
  }

  observeNativeWall(value: unknown, before: number): void {
    this.check();
    const now = Date.now();
    if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value) || value.length > 16) return reject();
    const native = Number(value);
    if (!Number.isSafeInteger(native) || native < before || native > now || native < this.lastNativeWall)
      return reject();
    this.lastNativeWall = native;
    this.check();
  }
}

const signedInteger = (value: unknown): string => {
  if (typeof value !== "string" || value.length > 20 || !/^(0|[1-9][0-9]*|-[1-9][0-9]*)$/.test(value)) return reject();
  const number = BigInt(value);
  if (number < -9223372036854775808n || number > 9223372036854775807n || number.toString() !== value) return reject();
  return value;
};

const storage = (value: unknown): Storage => {
  if (value === "null" || value === "integer" || value === "text" || value === "blob" || value === "real") return value;
  return reject();
};

const byteLength = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return reject();
  return value;
};

const copyBytes = (value: Uint8Array, check: () => void): Buffer => {
  check();
  const result = Buffer.alloc(value.byteLength);
  try {
    for (let offset = 0; offset < value.byteLength; offset += 4096) {
      check();
      result.set(value.subarray(offset, Math.min(value.byteLength, offset + 4096)), offset);
    }
    check();
    return result;
  } catch (error) {
    result.fill(0);
    throw error;
  }
};

const joinBytes = (parts: readonly Uint8Array[], maximum: number, check: () => void): Buffer => {
  let size = 0;
  for (const part of parts) {
    check();
    size += part.byteLength;
    if (!Number.isSafeInteger(size) || size > maximum) return reject();
  }
  check();
  const result = Buffer.alloc(size);
  let destination = 0;
  try {
    for (const part of parts) {
      for (let offset = 0; offset < part.byteLength; offset += 4096) {
        check();
        const chunk = part.subarray(offset, Math.min(part.byteLength, offset + 4096));
        result.set(chunk, destination);
        destination += chunk.byteLength;
      }
    }
    check();
    return result;
  } catch (error) {
    result.fill(0);
    throw error;
  }
};

const unsigned = (value: number, check: () => void): Buffer => {
  check();
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) return reject();
  const result = Buffer.alloc(4);
  result.writeUInt32BE(value);
  return result;
};

const textFrame = (value: string, check: () => void): Buffer => {
  check();
  const bytes = Buffer.from(value, "utf8");
  return joinBytes([unsigned(bytes.byteLength, check), bytes], limits.totalBytes, check);
};

const header = (bundle: string, encoding: Encoding, check: () => void): Buffer => {
  if (!/^[0-9a-f]{64}$/.test(bundle)) return reject();
  return joinBytes(
    [
      textFrame("homarr.sqlite.preservation.v1", check),
      textFrame("sqlite0050.complete.v1", check),
      textFrame("4096:32768:1048576:16777216:20971520:67108864:10000", check),
      textFrame(sqliteSnapshot.id, check),
      textFrame(bundle, check),
      textFrame(encoding, check),
      unsigned(specification.length, check),
    ],
    limits.totalBytes,
    check,
  );
};

const tableHeader = (table: Table, count: number, check: () => void): Buffer => {
  const parts: Buffer[] = [
    textFrame(table.name, check),
    textFrame(table.section, check),
    unsigned(table.columns.length, check),
  ];
  for (const column of table.columns) {
    check();
    parts.push(textFrame(column.name, check), textFrame(column.type, check));
  }
  parts.push(unsigned(count, check));
  return joinBytes(parts, limits.totalBytes, check);
};

const eraseNativeReturnedRow = (
  row: unknown,
  retainCleanupFailure: (cause: unknown) => void,
  quarantine: (cause: unknown) => void,
): void => {
  if (typeof row !== "object" || row === null) return;
  const failed = (cause: unknown) => {
    retainCleanupFailure(cause);
    try {
      quarantine(cause);
    } catch (error) {
      retainCleanupFailure(error);
    }
  };
  let keys: (string | symbol)[];
  try {
    keys = Reflect.ownKeys(row);
  } catch (error) {
    failed(error);
    return;
  }
  for (const key of keys) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(row, key);
      if (descriptor && "value" in descriptor && descriptor.value instanceof Uint8Array)
        Uint8Array.prototype.fill.call(descriptor.value, 0);
    } catch (error) {
      failed(error);
    }
  }
};

const collectRows = (
  client: Database,
  query: string,
  check: () => void,
  quarantine: (reason: unknown) => void,
  visit: (row: Record<string, unknown>) => void,
): void => {
  check();
  let statement: Statement<unknown, []> | undefined;
  let iterator: IterableIterator<unknown> | undefined;
  const errors: unknown[] = [];
  const failed = (error: unknown) => {
    if (!errors.includes(error)) errors.push(error);
  };
  try {
    try {
      statement = client.prepare<unknown, []>(query);
    } catch (error) {
      quarantine(error);
      throw error;
    }
    check();
    try {
      iterator = statement.iterate();
    } catch (error) {
      quarantine(error);
      throw error;
    }
    for (;;) {
      check();
      let step: IteratorResult<unknown>;
      try {
        step = iterator.next();
      } catch (error) {
        quarantine(error);
        throw error;
      }
      const nativeRow = step.value;
      try {
        check();
        if (step.done) break;
        visit(ownRecord(nativeRow));
        check();
      } catch (error) {
        failed(error);
      } finally {
        eraseNativeReturnedRow(nativeRow, failed, quarantine);
      }
      if (errors.length > 0) break;
    }
  } catch (error) {
    failed(error);
  } finally {
    try {
      iterator?.return?.();
    } catch (error) {
      failed(error);
      quarantine(error);
    }
    try {
      statement?.finalize();
    } catch (error) {
      failed(error);
      quarantine(error);
    }
    try {
      check();
    } catch (error) {
      failed(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1)
    throw new AggregateError(errors, "SQLite preservation read and cleanup failed", { cause: errors[0] });
};

const asciiValue = (value: unknown, encoding: Encoding): string => {
  if (!(value instanceof Uint8Array) || value.byteLength > 256) return reject();
  let result = "";
  let width = 1;
  if (encoding !== "UTF-8") width = 2;
  if (value.byteLength % width !== 0) return reject();
  for (let offset = 0; offset < value.byteLength; offset += width) {
    let character = value[offset];
    if (encoding === "UTF-16le") {
      if (value[offset + 1] !== 0) return reject();
    } else if (encoding === "UTF-16be") {
      if (value[offset] !== 0) return reject();
      character = value[offset + 1];
    }
    if (character === undefined || character < 32 || character > 126) return reject();
    result += String.fromCharCode(character);
  }
  return result;
};

const readIdentity = (client: Database, check: () => void, quarantine: (reason: unknown) => void): Identity => {
  let encoding: Encoding | undefined;
  let encodings = 0;
  collectRows(client, "PRAGMA main.encoding", check, quarantine, (row) => {
    encodings += 1;
    if (row.encoding !== "UTF-8" && row.encoding !== "UTF-16le" && row.encoding !== "UTF-16be") return reject();
    encoding = row.encoding;
  });
  if (encodings !== 1 || encoding === undefined) return reject();
  const capturedEncoding = encoding;
  let epoch: string | undefined;
  let metaCount = 0;
  collectRows(
    client,
    `SELECT CAST(id AS TEXT) AS id, typeof(id) AS id_storage, typeof(epoch) AS epoch_storage,
    CASE WHEN typeof(epoch) = 'text' AND length(CAST(epoch AS BLOB)) <= 256 THEN CAST(epoch AS BLOB) ELSE NULL END AS epoch
    FROM main.homarr_runtime_meta ORDER BY id LIMIT 3`,
    check,
    quarantine,
    (row) => {
      metaCount += 1;
      if (row.id_storage !== "integer") return reject();
      if (row.id === "1" && metaCount === 1 && row.epoch_storage === "text") {
        epoch = assertEpoch(asciiValue(row.epoch, capturedEncoding));
      } else if (row.id !== "2" || metaCount !== 2 || row.epoch_storage !== "null" || row.epoch !== null)
        return reject();
    },
  );
  if (metaCount !== 2 || epoch === undefined) return reject();
  let domainCount = 0;
  let namespace: string | undefined;
  let head: string | undefined;
  collectRows(
    client,
    `SELECT CAST(id AS TEXT) AS id, typeof(id) AS id_storage,
    typeof(namespace) AS namespace_storage, typeof(head_sequence) AS head_storage, typeof(phase) AS phase_storage,
    CASE WHEN typeof(namespace) = 'text' AND length(CAST(namespace AS BLOB)) <= 256 THEN CAST(namespace AS BLOB) ELSE NULL END AS namespace,
    CASE WHEN typeof(phase) = 'text' AND length(CAST(phase AS BLOB)) <= 256 THEN CAST(phase AS BLOB) ELSE NULL END AS phase,
    CASE WHEN typeof(head_sequence) = 'integer' THEN CAST(head_sequence AS TEXT) ELSE NULL END AS head
    FROM main.homarr_auth_credential_domain LIMIT 2`,
    check,
    quarantine,
    (row) => {
      domainCount += 1;
      if (
        domainCount !== 1 ||
        row.id !== "1" ||
        row.id_storage !== "integer" ||
        row.head_storage !== "integer" ||
        row.namespace_storage !== "text" ||
        row.phase_storage !== "text" ||
        asciiValue(row.phase, capturedEncoding) !== "ready"
      )
        return reject();
      namespace = authCredentialNamespace(asciiValue(row.namespace, capturedEncoding));
      head = authCredentialSequence(row.head, 0n).toString();
    },
  );
  if (domainCount !== 1 || namespace === undefined || head === undefined) return reject();
  return Object.freeze({ encoding: capturedEncoding, epoch, namespace, head });
};

const lengths = (column: string): string => `CASE typeof(${column})
  WHEN 'null' THEN 0 WHEN 'integer' THEN length(CAST(${column} AS TEXT))
  WHEN 'real' THEN 8 WHEN 'text' THEN length(CAST(${column} AS BLOB))
  WHEN 'blob' THEN length(${column}) ELSE NULL END`;

export const assertSqlitePreservationLedgerTransferBounds = (
  client: Database,
  clock: SqlitePreservationClock,
  assertCurrent: () => void,
  quarantine: (reason: unknown) => void,
): void => {
  const check = () => {
    clock.check();
    assertCurrent();
    if (!client.inTransaction) return reject();
  };
  check();
  const ledger = specification.find((table) => table.name === "__drizzle_migrations");
  if (!ledger) return reject();
  let rows = 0;
  let bytes = 0;
  collectRows(
    client,
    `SELECT typeof(hash) AS hash_storage, length(CAST(hash AS BLOB)) AS hash_bytes,
      typeof(created_at) AS created_at_storage, ${lengths('"created_at"')} AS created_at_bytes
      FROM main."__drizzle_migrations" LIMIT 52`,
    check,
    quarantine,
    (row) => {
      rows += 1;
      if (rows > 51 || row.hash_storage !== "text") return reject();
      const hashBytes = byteLength(row.hash_bytes);
      if (hashBytes > limits.textBytes) return reject();
      check();
      const kind = storage(row.created_at_storage);
      const length = byteLength(row.created_at_bytes);
      if (
        (kind === "null" && length !== 0) ||
        (kind === "real" && length !== 8) ||
        (kind === "integer" && (length < 1 || length > 20)) ||
        (kind === "text" && length > limits.textBytes) ||
        (kind === "blob" && length > limits.blobBytes)
      )
        return reject();
      const rowBytes = 4 + 5 + hashBytes + 5 + length;
      if (rowBytes > limits.rowBytes) return reject();
      bytes += rowBytes;
      if (bytes > limits.totalBytes) return reject();
      check();
    },
  );
  check();
  const framing = tableHeader(ledger, rows, check);
  try {
    if (bytes + framing.byteLength > limits.totalBytes) return reject();
    check();
  } finally {
    framing.fill(0);
  }
};

const tableQuery = (table: Table, payload: boolean, check: () => void): string => {
  const conditions: string[] = [];
  const sizes: string[] = [];
  for (const column of table.columns) {
    check();
    const name = `"${column.name}"`;
    const size = lengths(name);
    sizes.push(`5 + (${size})`);
    conditions.push(`typeof(${name}) IN ('null', 'integer', 'real', 'text', 'blob')`);
    conditions.push(`(typeof(${name}) <> 'text' OR length(CAST(${name} AS BLOB)) <= ${limits.textBytes})`);
    conditions.push(`(typeof(${name}) <> 'blob' OR length(${name}) <= ${limits.blobBytes})`);
  }
  conditions.push(`(${sizes.join(" + ")}) <= ${limits.rowBytes - 4}`);
  const allowed = conditions.join(" AND ");
  const fields = [`CASE WHEN ${allowed} THEN 1 ELSE 0 END AS allowed`];
  for (const [index, column] of table.columns.entries()) {
    check();
    const name = `"${column.name}"`;
    fields.push(`typeof(${name}) AS s${index}`, `${lengths(name)} AS n${index}`);
    if (payload)
      fields.push(`CASE WHEN ${allowed} THEN CASE typeof(${name})
      WHEN 'integer' THEN CAST(${name} AS TEXT) WHEN 'text' THEN CAST(${name} AS BLOB)
      WHEN 'blob' THEN ${name} WHEN 'real' THEN ${name} ELSE NULL END ELSE NULL END AS v${index}`);
  }
  check();
  return `SELECT ${fields.join(", ")} FROM main."${table.name}" LIMIT ${limits.tableRows + 1}`;
};

const inspectRowSize = (row: Record<string, unknown>, table: Table, check: () => void): number => {
  if (row.allowed !== 1) return reject();
  let size = 0;
  for (const [index] of table.columns.entries()) {
    check();
    const kind = storage(row[`s${index}`]);
    const length = byteLength(row[`n${index}`]);
    if (
      (kind === "null" && length !== 0) ||
      (kind === "real" && length !== 8) ||
      (kind === "integer" && (length < 1 || length > 20)) ||
      (kind === "text" && length > limits.textBytes) ||
      (kind === "blob" && length > limits.blobBytes)
    )
      return reject();
    size += 5 + length;
    if (size + 4 > limits.rowBytes) return reject();
  }
  return size;
};

const readCell = (row: Record<string, unknown>, index: number, check: () => void): Cell => {
  check();
  const kind = storage(row[`s${index}`]);
  const expectedLength = byteLength(row[`n${index}`]);
  const value = row[`v${index}`];
  if (kind === "null") {
    if (value !== null || expectedLength !== 0) return reject();
    return { storage: kind, bytes: Buffer.alloc(0) };
  }
  if (kind === "integer") {
    const integer = signedInteger(value);
    check();
    const bytes = Buffer.from(integer, "ascii");
    if (bytes.byteLength !== expectedLength) return reject();
    return { storage: kind, bytes, integer };
  }
  if (kind === "real") {
    if (typeof value !== "number" || !Number.isFinite(value) || expectedLength !== 8) return reject();
    check();
    const bytes = Buffer.alloc(8);
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setFloat64(0, value, false);
    return { storage: kind, bytes };
  }
  if (!(value instanceof Uint8Array) || value.byteLength !== expectedLength) return reject();
  if ((kind === "text" && expectedLength > limits.textBytes) || (kind === "blob" && expectedLength > limits.blobBytes))
    return reject();
  return { storage: kind, bytes: copyBytes(value, check) };
};

const field = (table: Table, cells: readonly Cell[], name: string): Cell => {
  const value = cells[table.columns.findIndex((column) => column.name === name)];
  if (!value) return reject();
  return value;
};

const nullableInteger = (cell: Cell): string | null => {
  if (cell.storage === "null") return null;
  if (cell.storage !== "integer") return reject();
  return cell.integer;
};

const validateCredentialCells = (table: Table, cells: readonly Cell[], head: string): void => {
  if (table.name !== "session" && table.name !== "apiKey") return;
  const lifetime = field(table, cells, "auth_lifetime_sequence");
  const write = field(table, cells, "auth_write_sequence");
  decodeAuthCredentialPair(
    "sqlite",
    {
      lifetime_sequence: nullableInteger(lifetime),
      write_sequence: nullableInteger(write),
      lifetime_storage: lifetime.storage,
      write_storage: write.storage,
    },
    head,
  );
  if (table.name === "session") {
    const expires = field(table, cells, "expires");
    if (expires.storage !== "integer") return reject();
    const value = BigInt(expires.integer);
    if (value < 0n || value > 8640000000000000n) return reject();
  }
};

const rowFrame = (row: Record<string, unknown>, table: Table, head: string, check: () => void): Buffer => {
  const expectedSize = inspectRowSize(row, table, check);
  const cells: Cell[] = [];
  const parts: Buffer[] = [];
  try {
    for (const [index] of table.columns.entries()) {
      check();
      const cell = readCell(row, index, check);
      cells.push(cell);
      let tag = 0;
      if (cell.storage === "integer") tag = 1;
      else if (cell.storage === "text") tag = 2;
      else if (cell.storage === "blob") tag = 3;
      else if (cell.storage === "real") tag = 4;
      check();
      parts.push(Buffer.from([tag]), unsigned(cell.bytes.byteLength, check), cell.bytes);
    }
    check();
    validateCredentialCells(table, cells, head);
    const result = joinBytes(parts, limits.rowBytes - 4, check);
    if (result.byteLength !== expectedSize) {
      result.fill(0);
      return reject();
    }
    return result;
  } finally {
    for (const cell of cells) cell.bytes.fill(0);
  }
};

const compareRows = (left: Buffer, right: Buffer, check: () => void): number => {
  const length = Math.min(left.byteLength, right.byteLength);
  for (let index = 0; index < length; index += 1) {
    if (index % 4096 === 0) check();
    const a = left[index];
    const b = right[index];
    if (a === undefined || b === undefined) return reject();
    if (a !== b) return a - b;
  }
  check();
  return left.byteLength - right.byteLength;
};

const observeNativeClock = (
  client: Database,
  clock: SqlitePreservationClock,
  check: () => void,
  quarantine: (reason: unknown) => void,
): void => {
  check();
  const before = Date.now();
  let clocks = 0;
  collectRows(
    client,
    `SELECT CAST(CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER) AS TEXT) AS observed_now`,
    check,
    quarantine,
    (row) => {
      clocks += 1;
      clock.observeNativeWall(row.observed_now, before);
    },
  );
  if (clocks !== 1) return reject();
};

export const prepareSqlitePreservationRecords = (
  client: Database,
  owner: object,
  clock: SqlitePreservationClock,
  bundle: string,
  assertCurrent: () => void,
  quarantine: (reason: unknown) => void,
): PreparedSqlitePreservationObservation => {
  const check = () => {
    clock.check();
    assertCurrent();
    if (!client.inTransaction) return reject();
  };
  const owned: Buffer[] = [];
  let finalBytes: Buffer | undefined;
  try {
    check();
    observeNativeClock(client, clock, check, quarantine);
    const identity = readIdentity(client, check, quarantine);
    const start = header(bundle, identity.encoding, check);
    owned.push(start);
    let totalSize = start.byteLength;
    let totalRows = 0;
    const counts = new Map<string, { rows: number; bytes: number }>();
    for (const table of specification) {
      check();
      let rows = 0;
      let bytes = 0;
      collectRows(client, tableQuery(table, false, check), check, quarantine, (row) => {
        rows += 1;
        totalRows += 1;
        if (rows > limits.tableRows || totalRows > limits.totalRows) return reject();
        bytes += 4 + inspectRowSize(row, table, check);
        if (bytes > limits.totalBytes - totalSize) return reject();
      });
      const tableStart = tableHeader(table, rows, check);
      owned.push(tableStart);
      totalSize += tableStart.byteLength + bytes;
      if (totalSize > limits.totalBytes) return reject();
      counts.set(table.name, { rows, bytes });
    }
    const parts: Buffer[] = [start];
    let actualSize = start.byteLength;
    for (const table of specification) {
      check();
      const expected = counts.get(table.name);
      if (!expected) return reject();
      const tableStart = tableHeader(table, expected.rows, check);
      owned.push(tableStart);
      parts.push(tableStart);
      actualSize += tableStart.byteLength;
      const rows: Buffer[] = [];
      let bytes = 0;
      collectRows(client, tableQuery(table, true, check), check, quarantine, (row) => {
        if (rows.length >= expected.rows) return reject();
        const frame = rowFrame(row, table, identity.head, check);
        owned.push(frame);
        rows.push(frame);
        bytes += 4 + frame.byteLength;
        if (bytes > expected.bytes || actualSize + bytes > limits.totalBytes) return reject();
      });
      if (rows.length !== expected.rows || bytes !== expected.bytes) return reject();
      rows.sort((left, right) => compareRows(left, right, check));
      check();
      for (const row of rows) parts.push(unsigned(row.byteLength, check), row);
      actualSize += bytes;
    }
    observeNativeClock(client, clock, check, quarantine);
    const after = readIdentity(client, check, quarantine);
    if (
      after.encoding !== identity.encoding ||
      after.epoch !== identity.epoch ||
      after.namespace !== identity.namespace ||
      after.head !== identity.head ||
      actualSize !== totalSize
    )
      return reject();
    finalBytes = joinBytes(parts, limits.totalBytes, check);
    if (finalBytes.byteLength !== totalSize) return reject();
    check();
    const prepared = Object.freeze<PreparedSqlitePreservationObservation>({ [preparedIdentity]: true });
    preparedRecords.set(prepared, { owner, clock, bundle, epoch: identity.epoch, bytes: finalBytes });
    finalBytes = undefined;
    return prepared;
  } finally {
    finalBytes?.fill(0);
    for (const bytes of owned) bytes.fill(0);
  }
};

export const discardPreparedSqlitePreservation = (prepared: PreparedSqlitePreservationObservation): void => {
  const record = preparedRecords.get(prepared);
  if (!record) return reject();
  preparedRecords.delete(prepared);
  record.bytes.fill(0);
};

export const publishSqlitePreservationObservation = (
  prepared: PreparedSqlitePreservationObservation,
  owner: object,
): NativeSqlitePreservationObservation => {
  const record = preparedRecords.get(prepared);
  if (!record || record.owner !== owner) return reject();
  record.clock.check();
  const handle = Object.freeze<NativeSqlitePreservationObservation>({ [observationIdentity]: true });
  observations.set(handle, { ...record, users: 0, retiring: false });
  preparedRecords.delete(prepared);
  return handle;
};

const retire = (handle: NativeSqlitePreservationObservation, record: ObservationRecord): void => {
  if (record.users !== 0) return;
  record.bytes.fill(0);
  observations.delete(handle);
  disposedObservations.add(handle);
};

export const encodeNativeSqlitePreservationObservation = (handle: NativeSqlitePreservationObservation): Uint8Array => {
  const record = observations.get(handle);
  if (!record || record.retiring) return reject();
  record.users += 1;
  try {
    if (record.bytes.byteLength > limits.totalBytes) return reject();
    return copyBytes(record.bytes, () => {
      record.clock.check();
    });
  } finally {
    record.users -= 1;
    if (record.retiring) retire(handle, record);
  }
};

export const disposeNativeSqlitePreservationObservation = (handle: NativeSqlitePreservationObservation): void => {
  const record = observations.get(handle);
  if (!record) {
    if (disposedObservations.has(handle)) return;
    return reject();
  }
  record.retiring = true;
  retire(handle, record);
};
