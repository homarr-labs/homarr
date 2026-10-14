import { sql } from "@homarr/db";
import type { PersistenceRuntime, SQL } from "@homarr/db";
import type { BoundedTransactionOperation } from "@homarr/db/runtime";

import type { IconReadScope, IconSqlStatement } from "./resources";

export interface IconNativeReadLimits {
  readonly maxPendingReads: number;
  readonly maxParameterBytes: number;
  readonly maxResultRows: number;
  readonly maxResultBytes: number;
  readonly maxMediaBytes: number;
}

type ReadKind = "lookup" | "media" | "repositories" | "icons" | "direct" | "serialized" | "picker" | "count";
type FieldKind = "string" | "nullable-string" | "binary" | "size" | "count";
type Failure = { kind: "none" } | { kind: "failed"; error: unknown };

interface ReadField {
  readonly name: string;
  readonly kind: FieldKind;
}

interface CapturedRead {
  readonly kind: ReadKind;
  readonly parameter: string | number | undefined;
  readonly rows: ReturnType<typeof Promise.withResolvers<readonly Record<string, unknown>[]>>;
}

interface ResultBudget {
  rows: number;
  bytes: number;
}

const lookupPrefix =
  'SELECT i."id", i."name", i."url", i."checksum", i."icon_repository_id" FROM "icon" i INNER JOIN "iconRepository" r ON r."id" = i."icon_repository_id" WHERE i."name" LIKE ';
const lookupSuffix =
  ' AND (r."slug" <> \'local\' OR EXISTS (SELECT 1 FROM "media" m WHERE i."url" = \'/api/user-medias/\' || m."id")) LIMIT 1';
const mediaQuery = 'SELECT "id", "name", "content", "size" FROM "media"';
const repositoriesQuery = 'SELECT "id", "slug" FROM "iconRepository"';
const iconsQuery = 'SELECT "id", "name", "url", "checksum", "icon_repository_id" FROM "icon"';
const directQuery =
  'SELECT "icon_url" AS "url" FROM "app" UNION ALL SELECT "icon_url" FROM "search_engine" UNION ALL SELECT "logo_image_url" FROM "board" UNION ALL SELECT "favicon_image_url" FROM "board" UNION ALL SELECT "background_image_url" FROM "board" UNION ALL SELECT "icon_url" FROM "custom_widget_definition" UNION ALL SELECT "icon_url" FROM "custom_widget_v2_definition"';
const serializedQuery =
  'SELECT "value" FROM "serverSetting" WHERE "setting_key" = \'branding\' UNION ALL SELECT "options" FROM "item" UNION ALL SELECT "advanced_options" FROM "item" UNION ALL SELECT "options" FROM "section" WHERE "options" IS NOT NULL UNION ALL SELECT "display_config" FROM "custom_widget_definition" UNION ALL SELECT "options" FROM "custom_widget_v2_definition"';
const pickerBase =
  'SELECT r."id" AS "repository_id", r."slug", i."id", i."name", i."url", ROW_NUMBER() OVER (PARTITION BY r."id" ORDER BY CASE WHEN i."name" LIKE \'%.svg\' THEN 0 ELSE 1 END, i."name") AS "group_position" FROM "iconRepository" r LEFT JOIN "icon" i ON i."icon_repository_id" = r."id" AND (r."slug" <> \'local\' OR EXISTS (SELECT 1 FROM "media" m WHERE i."url" = \'/api/user-medias/\' || m."id"))';
const pickerPrefix = `WITH ranked_icons AS (${pickerBase}) SELECT "repository_id", "slug", "id", "name", "url" FROM ranked_icons`;
const pickerOrder = ' ORDER BY CASE WHEN "slug" = \'local\' THEN 0 ELSE 1 END, "slug", "group_position"';
const countQuery = 'SELECT count(*) AS "count" FROM "icon"';
const metadataFields = ["__rows", "__bytes", "__max_media"];

const fieldsFor = (kind: ReadKind): readonly ReadField[] => {
  switch (kind) {
    case "lookup":
    case "icons":
      return ["id", "name", "url", "checksum", "icon_repository_id"].map((name) => ({ name, kind: "string" }));
    case "media":
      return [
        { name: "id", kind: "string" },
        { name: "name", kind: "string" },
        { name: "content", kind: "binary" },
        { name: "size", kind: "size" },
      ];
    case "repositories":
      return ["id", "slug"].map((name) => ({ name, kind: "string" }));
    case "direct":
      return [{ name: "url", kind: "nullable-string" }];
    case "serialized":
      return [{ name: "value", kind: "string" }];
    case "picker":
      return [
        { name: "repository_id", kind: "string" },
        { name: "slug", kind: "string" },
        { name: "id", kind: "nullable-string" },
        { name: "name", kind: "nullable-string" },
        { name: "url", kind: "nullable-string" },
      ];
    case "count":
      return [{ name: "count", kind: "count" }];
  }
};

const safeSum = (left: number, right: number) => {
  const value = left + right;
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("Icon read budget arithmetic exceeded its bound");
  return value;
};

const safeProduct = (left: number, right: number) => {
  const value = left * right;
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("Icon read budget arithmetic exceeded its bound");
  return value;
};

const utf8Bytes = (value: string) => {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit < 128) bytes += 1;
    else if (unit < 2048) bytes += 2;
    else if (
      unit >= 55296 &&
      unit <= 56319 &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 56320 &&
      value.charCodeAt(index + 1) <= 57343
    ) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
};

const safeNativeInteger = (value: unknown) => {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string" && value.length <= 16 && /^(0|[1-9][0-9]*)$/.test(value)) {
    const integer = BigInt(value);
    if (integer <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(integer);
  }
  throw new TypeError("Invalid native icon integer");
};

const rowCharge = (fields: readonly ReadField[], picker: boolean) => {
  const names = [...fields.map((field) => field.name), ...metadataFields];
  if (picker) names.push("group_position");
  let bytes = 32;
  for (const name of names) bytes = safeSum(bytes, safeSum(utf8Bytes(name), 24));
  return safeSum(bytes, safeProduct(metadataFields.length, 16));
};

const captureStatement = (
  statement: IconSqlStatement,
  dialect: IconReadScope["dialect"],
  maxParameterBytes: number,
) => {
  const text: unknown = statement.sql;
  const supplied: unknown = statement.parameters;
  if (typeof text !== "string" || !Array.isArray(supplied)) throw new TypeError("Invalid icon read statement");
  if (supplied.length > 1) throw new TypeError("Unexpected icon read parameter count");
  const parameters: unknown[] = [...supplied];
  const marker = dialect === "postgresql" ? "$1" : "?";
  let kind: ReadKind;
  let parameter: string | number | undefined;
  if (text === `${lookupPrefix}${marker}${lookupSuffix}`) {
    kind = "lookup";
    const value: unknown = parameters[0];
    if (parameters.length !== 1 || typeof value !== "string") throw new TypeError("Invalid icon lookup parameters");
    parameter = value;
  } else if (text === `${pickerPrefix} WHERE "group_position" <= ${marker}${pickerOrder}`) {
    kind = "picker";
    const value: unknown = parameters[0];
    if (parameters.length !== 1 || typeof value !== "number" || !Number.isFinite(value) || value < 1 || value > 500)
      throw new TypeError("Invalid icon picker parameters");
    parameter = value;
  } else {
    if (parameters.length !== 0) throw new TypeError("Unexpected icon read parameters");
    switch (text) {
      case mediaQuery:
        kind = "media";
        break;
      case repositoriesQuery:
        kind = "repositories";
        break;
      case iconsQuery:
        kind = "icons";
        break;
      case directQuery:
        kind = "direct";
        break;
      case serializedQuery:
        kind = "serialized";
        break;
      case `${pickerPrefix}${pickerOrder}`:
        kind = "picker";
        break;
      case countQuery:
        kind = "count";
        break;
      default:
        throw new TypeError("Unsupported icon read statement");
    }
  }
  let bytes = 0;
  if (parameter !== undefined) bytes = utf8Bytes(String(parameter));
  if (bytes > maxParameterBytes) throw new RangeError("Icon read parameter bytes exceeded their bound");
  return { kind, parameter, bytes };
};

const assertGroup = (reads: readonly CapturedRead[]) => {
  const first = reads[0]?.kind;
  const second = reads[1]?.kind;
  if (reads.length === 1 && (first === "lookup" || first === "media")) return;
  if (
    reads.length === 2 &&
    ((first === "repositories" && second === "icons") ||
      (first === "direct" && second === "serialized") ||
      (first === "picker" && second === "count"))
  )
    return;
  throw new TypeError("Incomplete or mixed icon read group");
};

const trustedSource = (read: CapturedRead, dialect: IconReadScope["dialect"]): SQL => {
  switch (read.kind) {
    case "lookup":
      return sql`${sql.raw(lookupPrefix)}${read.parameter}${sql.raw(lookupSuffix)}`;
    case "media":
      return sql.raw(mediaQuery);
    case "repositories":
      return sql.raw(repositoriesQuery);
    case "icons":
      return sql.raw(iconsQuery);
    case "direct":
      return sql.raw(directQuery);
    case "serialized":
      return sql.raw(serializedQuery);
    case "count":
      return sql.raw(countQuery);
    case "picker": {
      let filter = sql``;
      if (read.parameter !== undefined) {
        if (dialect === "postgresql")
          filter = sql`WHERE "group_position" <= CAST(${String(read.parameter)} AS NUMERIC)`;
        else filter = sql`WHERE "group_position" <= ${read.parameter}`;
      }
      return sql`WITH ranked_icons AS (${sql.raw(pickerBase)}) SELECT "repository_id", "slug", "id", "name", "url", "group_position" FROM ranked_icons ${filter}`;
    }
  }
};

const boundedQuery = (
  read: CapturedRead,
  dialect: IconReadScope["dialect"],
  budget: ResultBudget,
  limits: IconNativeReadLimits,
) => {
  const fields = fieldsFor(read.kind);
  const picker = read.kind === "picker";
  const overhead = rowCharge(fields, picker);
  const deliveryRows = Math.min(safeSum(budget.rows, 1), safeSum(Math.floor(budget.bytes / overhead), 1));
  const measures = fields.map((field): SQL => {
    const column = sql.identifier(field.name);
    if (field.kind === "binary") {
      if (dialect === "postgresql") return sql`COALESCE(octet_length(${column}), 0)`;
      return sql`COALESCE(length(${column}), 0)`;
    }
    if (dialect === "postgresql") return sql`COALESCE(octet_length(convert_to(CAST(${column} AS TEXT), 'UTF8')), 0)`;
    return sql`COALESCE(3 * length(CAST(${column} AS BLOB)), 0)`;
  });
  if (picker) {
    if (dialect === "postgresql") measures.push(sql`octet_length(convert_to(CAST("group_position" AS TEXT), 'UTF8'))`);
    else measures.push(sql`3 * length(CAST("group_position" AS BLOB))`);
  }
  let mediaBytes = sql`0`;
  if (read.kind === "media") {
    if (dialect === "postgresql") mediaBytes = sql`COALESCE(octet_length("content"), 0)`;
    else mediaBytes = sql`COALESCE(length("content"), 0)`;
  }
  const admitted = sql`"__rows" <= ${budget.rows} AND "__bytes" <= ${budget.bytes} - "__rows" * ${overhead} AND "__max_media" <= ${limits.maxMediaBytes}`;
  const projection = fields.map(
    (field) => sql`CASE WHEN ${admitted} THEN ${sql.identifier(field.name)} END AS ${sql.identifier(field.name)}`,
  );
  let order = sql``;
  if (picker) {
    projection.push(sql`CASE WHEN ${admitted} THEN "group_position" END AS "group_position"`);
    order = sql.raw(pickerOrder);
  }
  return sql`WITH "__icon_source" AS (${trustedSource(read, dialect)}), "__icon_payload" AS (
    SELECT *, ${sql.join(measures, sql` + `)} AS "__payload_bytes", ${mediaBytes} AS "__media_bytes" FROM "__icon_source"
  ), "__icon_budget" AS (
    SELECT *, count(*) OVER () AS "__rows", sum("__payload_bytes") OVER () AS "__bytes", max("__media_bytes") OVER () AS "__max_media" FROM "__icon_payload"
  ) SELECT ${sql.join(projection, sql`, `)}, "__rows", "__bytes", "__max_media" FROM "__icon_budget" ${order} LIMIT ${deliveryRows}`;
};

const detachRows = (
  input: unknown,
  read: CapturedRead,
  dialect: IconReadScope["dialect"],
  budget: ResultBudget,
  limits: IconNativeReadLimits,
  check: () => void,
) => {
  if (!Array.isArray(input)) throw new TypeError("Invalid native icon rowset");
  if (input.length > budget.rows) throw new RangeError("Icon read rows exceeded their bound");
  if (input.length === 0) {
    if (read.kind === "count") throw new TypeError("Missing native icon count");
    return [];
  }
  const fields = fieldsFor(read.kind);
  const picker = read.kind === "picker";
  const overhead = rowCharge(fields, picker);
  const names = [...fields.map((field) => field.name), ...metadataFields];
  if (picker) names.push("group_position");
  let totals: { rows: number; bytes: number; media: number } | undefined;
  let actualBytes = 0;
  let actualMedia = 0;
  const validated: Record<string, unknown>[] = [];
  for (const value of input) {
    check();
    const row: unknown = value;
    if (typeof row !== "object" || row === null || Array.isArray(row)) throw new TypeError("Invalid native icon row");
    const keys = Reflect.ownKeys(row);
    if (
      keys.length !== names.length ||
      keys.some((key) => typeof key !== "string" || !names.includes(key)) ||
      names.some((name) => !Object.hasOwn(row, name))
    )
      throw new TypeError("Invalid native icon result fields");
    const rows = safeNativeInteger(Reflect.get(row, "__rows"));
    const bytes = safeNativeInteger(Reflect.get(row, "__bytes"));
    const media = safeNativeInteger(Reflect.get(row, "__max_media"));
    if (
      rows !== input.length ||
      rows > budget.rows ||
      safeSum(bytes, safeProduct(rows, overhead)) > budget.bytes ||
      media > limits.maxMediaBytes
    )
      throw new RangeError("Incomplete or oversized native icon result");
    if (totals && (totals.rows !== rows || totals.bytes !== bytes || totals.media !== media))
      throw new TypeError("Inconsistent native icon result totals");
    totals = { rows, bytes, media };
    const projected: Record<string, unknown> = {};
    for (const field of fields) {
      const entry: unknown = Reflect.get(row, field.name);
      let charged = 0;
      switch (field.kind) {
        case "string":
          if (typeof entry !== "string") throw new TypeError("Invalid native icon string");
          charged = utf8Bytes(entry);
          break;
        case "nullable-string":
          if (entry !== null && typeof entry !== "string") throw new TypeError("Invalid native icon nullable string");
          if (typeof entry === "string") charged = utf8Bytes(entry);
          break;
        case "binary":
          if (!(entry instanceof Uint8Array)) throw new TypeError("Invalid native icon media bytes");
          charged = entry.byteLength;
          if (charged > limits.maxMediaBytes) throw new RangeError("Icon media bytes exceeded their bound");
          actualMedia = Math.max(actualMedia, charged);
          break;
        case "size":
          if (typeof entry !== "number" || !Number.isSafeInteger(entry) || entry < 0)
            throw new TypeError("Invalid native icon media size");
          charged = utf8Bytes(String(entry));
          break;
        case "count":
          safeNativeInteger(entry);
          charged = utf8Bytes(String(entry));
          break;
      }
      actualBytes = safeSum(actualBytes, charged);
      if (safeSum(actualBytes, safeProduct(input.length, overhead)) > budget.bytes)
        throw new RangeError("Icon read bytes exceeded their bound");
      Object.defineProperty(projected, field.name, {
        value: entry,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    if (picker) {
      const position = safeNativeInteger(Reflect.get(row, "group_position"));
      if (position < 1 || (typeof read.parameter === "number" && position > read.parameter))
        throw new TypeError("Invalid native icon group position");
      actualBytes = safeSum(actualBytes, utf8Bytes(String(Reflect.get(row, "group_position"))));
      const empty = projected.id === null;
      if (empty !== (projected.name === null) || empty !== (projected.url === null))
        throw new TypeError("Invalid native icon empty repository");
    }
    validated.push(projected);
  }
  if (
    !totals ||
    actualBytes > totals.bytes ||
    actualMedia !== totals.media ||
    safeSum(actualBytes, safeProduct(input.length, overhead)) > budget.bytes
  )
    throw new TypeError("Native icon payload totals disagree");
  if (dialect === "postgresql" && actualBytes !== totals.bytes)
    throw new TypeError("Native icon UTF-8 payload totals disagree");
  if (read.kind === "lookup" && input.length !== 1) throw new TypeError("Invalid native icon lookup cardinality");
  if (read.kind === "count" && input.length !== 1) throw new TypeError("Invalid native icon count cardinality");
  budget.rows -= input.length;
  budget.bytes -= safeSum(totals.bytes, safeProduct(input.length, overhead));
  for (const row of validated) {
    check();
    const content = row.content;
    if (content instanceof Uint8Array) row.content = new Uint8Array(content);
  }
  check();
  return validated;
};

export const createIconNativeReadSource = (options: {
  readonly runtime: PersistenceRuntime;
  readonly lifetime: AbortSignal;
  readonly limits: IconNativeReadLimits;
}) => {
  const { runtime, lifetime } = options;
  const limits = Object.freeze({ ...options.limits });
  for (const value of [
    limits.maxPendingReads,
    limits.maxParameterBytes,
    limits.maxResultRows,
    limits.maxResultBytes,
    limits.maxMediaBytes,
  ])
    if (!Number.isSafeInteger(value) || value <= 0)
      throw new TypeError("Icon read limits must be positive safe integers");
  safeSum(limits.maxResultRows, 1);
  const readKinds: readonly ReadKind[] = [
    "lookup",
    "media",
    "repositories",
    "icons",
    "direct",
    "serialized",
    "picker",
    "count",
  ];
  const rejectionSentinelBytes = Math.max(...readKinds.map((kind) => rowCharge(fieldsFor(kind), kind === "picker")));
  const maximumNativeDeliveryBytes = safeSum(limits.maxResultBytes, rejectionSentinelBytes);
  const maximumRetainedBytes = safeSum(limits.maxResultBytes, maximumNativeDeliveryBytes);
  safeProduct(safeSum(maximumRetainedBytes, limits.maxParameterBytes), limits.maxPendingReads);
  safeProduct(limits.maxResultRows, rejectionSentinelBytes);
  const dialect = runtime.engine;
  if (dialect !== "sqlite" && dialect !== "postgresql") throw new TypeError("Unsupported icon read dialect");
  const closing = new AbortController();
  const tasks = new Set<Promise<void>>();
  let closePromise: Promise<void> | undefined;

  const runReadAsync = <T>(
    operation: BoundedTransactionOperation,
    read: (scope: IconReadScope) => Promise<T>,
  ): Promise<T> => {
    const result = Promise.withResolvers<T>();
    const settled = result.promise.then(
      () => undefined,
      () => undefined,
    );
    try {
      if (closePromise) throw new Error("Icon read source is closing");
      lifetime.throwIfAborted();
      if (tasks.size >= limits.maxPendingReads) throw new RangeError("Icon read admission limit exceeded");
      const deadlineAt = operation.deadlineAt;
      if (!Number.isFinite(deadlineAt)) throw new TypeError("Icon read deadline must be finite");
      const startedAt = performance.now();
      const remainingAtStart = deadlineAt - Date.now();
      const nativeOperation: BoundedTransactionOperation = {
        signal: operation.signal,
        lifetime: AbortSignal.any([lifetime, closing.signal, operation.lifetime]),
        deadlineAt,
      };
      let failure: Failure = { kind: "none" };
      const recordFailure = (error: unknown) => {
        if (failure.kind === "none") failure = { kind: "failed", error };
      };
      const check = () => {
        if (failure.kind === "failed") throw failure.error;
        nativeOperation.signal.throwIfAborted();
        nativeOperation.lifetime.throwIfAborted();
        if (Math.min(deadlineAt - Date.now(), remainingAtStart - (performance.now() - startedAt)) < 1)
          throw new Error("Icon read deadline expired");
      };
      check();
      tasks.add(settled);
      let collecting = true;
      let parameterBytes = 0;
      const captured: CapturedRead[] = [];
      const scope: IconReadScope = Object.freeze({
        dialect,
        queryAsync(statement: IconSqlStatement) {
          const rows = Promise.withResolvers<readonly Record<string, unknown>[]>();
          void rows.promise.then(() => undefined, recordFailure);
          try {
            check();
            if (!collecting) throw new Error("Icon read collection is closed");
            if (captured.length >= 2) throw new TypeError("Too many icon read statements");
            const selected = captureStatement(statement, dialect, limits.maxParameterBytes);
            parameterBytes = safeSum(parameterBytes, selected.bytes);
            if (parameterBytes > limits.maxParameterBytes)
              throw new RangeError("Icon read group parameter bytes exceeded their bound");
            captured.push({ kind: selected.kind, parameter: selected.parameter, rows });
          } catch (error) {
            recordFailure(error);
            rows.reject(error);
          }
          return rows.promise;
        },
      });
      const complete = async () => {
        let domain: Promise<T>;
        try {
          domain = read(scope);
          if (!(domain instanceof Promise)) throw new TypeError("Icon domain reader must return a Promise");
        } catch (error) {
          domain = Promise.reject(error);
        } finally {
          collecting = false;
        }
        void domain.then(() => undefined, recordFailure);
        const nativeOutcome: { failure: Failure } = { failure: { kind: "none" } };
        try {
          check();
          assertGroup(captured);
          const budget = { rows: limits.maxResultRows, bytes: limits.maxResultBytes };
          let rowsets: readonly (readonly Record<string, unknown>[])[];
          try {
            if (dialect === "sqlite") {
              rowsets = runtime.boundedTransactionSync(nativeOperation, (database) => {
                const results: Record<string, unknown>[][] = [];
                for (const entry of captured) {
                  check();
                  results.push(
                    detachRows(
                      database.all<unknown>(boundedQuery(entry, dialect, budget, limits)),
                      entry,
                      dialect,
                      budget,
                      limits,
                      check,
                    ),
                  );
                }
                check();
                return results;
              });
            } else {
              rowsets = await runtime.boundedSnapshotAsync(nativeOperation, async (database) => {
                const results: Record<string, unknown>[][] = [];
                for (const entry of captured) {
                  check();
                  const nativeRows = await database.execute(boundedQuery(entry, dialect, budget, limits));
                  check();
                  results.push(detachRows(nativeRows.rows, entry, dialect, budget, limits, check));
                }
                check();
                return results;
              });
            }
          } catch (error) {
            nativeOutcome.failure = { kind: "failed", error };
            throw error;
          }
          check();
          for (let index = 0; index < captured.length; index += 1) {
            const entry = captured[index];
            const rows = rowsets[index];
            if (!entry || !rows) throw new TypeError("Missing native icon group result");
            entry.rows.resolve(rows);
          }
        } catch (error) {
          recordFailure(error);
          for (const entry of captured) entry.rows.reject(error);
        }
        await Promise.allSettled(captured.map((entry) => entry.rows.promise));
        const outcome = await domain.then(
          (value): { kind: "success"; value: T } => ({ kind: "success", value }),
          (error: unknown): { kind: "failed"; error: unknown } => ({ kind: "failed", error }),
        );
        if (nativeOutcome.failure.kind === "failed") throw nativeOutcome.failure.error;
        check();
        if (outcome.kind === "failed") throw outcome.error;
        return outcome.value;
      };
      void complete().then(result.resolve, result.reject);
      void settled.then(() => tasks.delete(settled));
    } catch (error) {
      result.reject(error);
    }
    return result.promise;
  };

  const closeAsync = () => {
    if (closePromise) return closePromise;
    const closed = Promise.withResolvers<void>();
    closePromise = closed.promise;
    closing.abort(new Error("Icon read source is closing"));
    void Promise.allSettled(tasks).then(() => closed.resolve());
    return closePromise;
  };

  return { runReadAsync, closeAsync };
};
