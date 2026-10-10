import { Column, is, Name, Param, Placeholder, SQL, StringChunk, Subquery, Table } from "drizzle-orm";

export interface DatabaseScope<T extends object> {
  database: T;
  revoke(): void;
  settleAsync(): Promise<void>;
}

const privateProperties = new Set<PropertyKey>([
  "$client",
  "client",
  "session",
  "stmt",
  "dialect",
  "config",
  "_",
  "db",
  "database",
]);

const scopedHandles = new WeakSet<object>();

const isMetadataValue = (value: unknown, visited: WeakSet<object>): boolean => {
  if (typeof value !== "object" || value === null) return typeof value !== "function";
  if (scopedHandles.has(value)) return false;
  if (value instanceof Date || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return true;
  if (visited.has(value)) return true;
  visited.add(value);
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== null && (is(value, Column) || is(value, Table))) return true;
  if (Array.isArray(value)) return value.every((item) => isMetadataValue(item, visited));
  if (prototype === SQL.prototype) return isMetadataValue(Reflect.get(value, "queryChunks"), visited);
  if (prototype === SQL.Aliased.prototype) return isMetadataValue(Reflect.get(value, "sql"), visited);
  if (prototype === Param.prototype) return isMetadataValue(Reflect.get(value, "value"), visited);
  if (prototype === Name.prototype || prototype === Placeholder.prototype || prototype === StringChunk.prototype)
    return isMetadataValue(Reflect.get(value, "value") ?? Reflect.get(value, "name"), visited);
  if (prototype !== null && is(value, Subquery)) return isMetadataValue(Reflect.get(value, "_"), visited);
  if (prototype === Object.prototype || prototype === null)
    return Object.values(Object.getOwnPropertyDescriptors(value)).every(
      (descriptor) => "value" in descriptor && isMetadataValue(descriptor.value, visited),
    );
  return false;
};

const isSqlMetadata = (value: object) => {
  if (scopedHandles.has(value)) return false;
  const prototype = Reflect.getPrototypeOf(value);
  return (
    prototype !== null &&
    (prototype === SQL.prototype ||
      prototype === SQL.Aliased.prototype ||
      is(value, Column) ||
      is(value, Table) ||
      is(value, Subquery)) &&
    isMetadataValue(value, new WeakSet())
  );
};

export const createDatabaseScope = <T extends object>(
  database: T,
  options: { synchronousTransactions: boolean; assertParent?: () => void },
): DatabaseScope<T> => {
  let active = true;
  const pending = new Set<Promise<unknown>>();
  const wrapped = new WeakMap<object, object>();
  const argumentsByHandle = new WeakMap<object, object>();
  const assertActive = () => {
    options.assertParent?.();
    if (!active) throw new Error("The database scope is no longer active");
  };
  const track = (promise: Promise<unknown>) => {
    pending.add(promise);
    void promise.then(
      () => pending.delete(promise),
      () => pending.delete(promise),
    );
  };
  const resolveArgument = (argument: unknown, resolved = new WeakMap<object, object>()): unknown => {
    assertActive();
    if (typeof argument !== "object" || argument === null) return argument;
    const owned = argumentsByHandle.get(argument);
    if (owned) return owned;
    const previous = resolved.get(argument);
    if (previous) return previous;
    if (Array.isArray(argument)) {
      const result: unknown[] = [];
      resolved.set(argument, result);
      for (const item of argument) result.push(resolveArgument(item, resolved));
      return result;
    }
    const prototype = Reflect.getPrototypeOf(argument);
    if (prototype !== Object.prototype && prototype !== null) return argument;
    const descriptors = Object.getOwnPropertyDescriptors(argument);
    if (Object.values(descriptors).some((descriptor) => !("value" in descriptor))) return argument;
    const result = Object.create(prototype) as object;
    resolved.set(argument, result);
    for (const property of Reflect.ownKeys(descriptors)) {
      const descriptor = Reflect.getOwnPropertyDescriptor(argument, property);
      if (descriptor && "value" in descriptor)
        Reflect.defineProperty(result, property, { ...descriptor, value: resolveArgument(descriptor.value, resolved) });
    }
    return result;
  };
  const wrap = (value: unknown): unknown => {
    if (typeof value !== "object" || value === null) return value;
    if (
      value instanceof Date ||
      value instanceof Error ||
      value instanceof ArrayBuffer ||
      ArrayBuffer.isView(value) ||
      isSqlMetadata(value)
    )
      return value;
    const previous = wrapped.get(value);
    if (previous) return previous;
    if (value instanceof Promise) {
      const result = value.then(wrap);
      wrapped.set(value, result);
      track(result);
      return result;
    }
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      wrapped.set(value, result);
      for (const item of value) result.push(wrap(item));
      return result;
    }
    const prototype = Reflect.getPrototypeOf(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const rows: unknown = descriptors.rows?.value;
    const fields: unknown = descriptors.fields?.value;
    const command: unknown = descriptors.command?.value;
    const rowCount: unknown = descriptors.rowCount?.value;
    const oid: unknown = descriptors.oid?.value;
    if (
      prototype !== Object.prototype &&
      Array.isArray(rows) &&
      Array.isArray(fields) &&
      (typeof command === "string" || command === null) &&
      (typeof rowCount === "number" || rowCount === null) &&
      (typeof oid === "number" || oid === null)
    ) {
      const result: Record<string, unknown> = { command, rowCount, oid };
      wrapped.set(value, result);
      result.rows = wrap(rows);
      result.fields = fields.map((field: unknown) => {
        if (typeof field !== "object" || field === null) throw new TypeError("Invalid PostgreSQL result field");
        const definition: Record<string, unknown> = {};
        for (const key of ["name", "tableID", "columnID", "dataTypeID", "dataTypeSize", "dataTypeModifier", "format"]) {
          const metadata: unknown = Reflect.getOwnPropertyDescriptor(field, key)?.value;
          if (typeof metadata !== "string" && typeof metadata !== "number")
            throw new TypeError("Invalid PostgreSQL result field metadata");
          definition[key] = metadata;
        }
        return definition;
      });
      return result;
    }
    const isRecord =
      (prototype === Object.prototype || prototype === null) &&
      Object.values(descriptors).every((descriptor) => "value" in descriptor && typeof descriptor.value !== "function");
    if (isRecord) {
      const result: Record<PropertyKey, unknown> = {};
      wrapped.set(value, result);
      for (const property of Reflect.ownKeys(descriptors)) {
        const descriptor = Reflect.getOwnPropertyDescriptor(value, property);
        if (descriptor && "value" in descriptor)
          Reflect.defineProperty(result, property, { ...descriptor, value: wrap(descriptor.value) });
      }
      return result;
    }
    const read = (property: PropertyKey): unknown => {
      assertActive();
      if (privateProperties.has(property)) throw new Error("Database client and execution internals are private");
      const member: unknown = Reflect.get(value, property, value);
      if (property === "constructor") return member;
      if (typeof member !== "function") return wrap(member);
      if (property === "transaction")
        return (operation: (transaction: object) => unknown, ...args: unknown[]) => {
          assertActive();
          if (options.synchronousTransactions && operation.constructor.name === "AsyncFunction")
            throw new TypeError("SQLite transactions require a synchronous callback");
          const result: unknown = Reflect.apply(member, value, [
            (transaction: object) => {
              const nested = createDatabaseScope(transaction, { ...options, assertParent: assertActive });
              if (options.synchronousTransactions) {
                try {
                  const outcome = operation(nested.database);
                  if (
                    ((typeof outcome === "object" && outcome !== null) || typeof outcome === "function") &&
                    "then" in outcome &&
                    typeof outcome.then === "function"
                  ) {
                    void Promise.resolve(outcome).catch(() => undefined);
                    throw new TypeError("SQLite transaction callbacks cannot return a promise");
                  }
                  return outcome;
                } finally {
                  nested.revoke();
                }
              }
              return (async () => {
                try {
                  return await operation(nested.database);
                } finally {
                  nested.revoke();
                  await nested.settleAsync();
                }
              })();
            },
            ...args,
          ]);
          return wrap(result);
        };
      return (...args: unknown[]) => {
        assertActive();
        const callbacks = args.map((argument) =>
          typeof argument === "function"
            ? (...parameters: unknown[]) => {
                assertActive();
                return resolveArgument(Reflect.apply(argument, undefined, parameters.map(wrap)));
              }
            : resolveArgument(argument),
        );
        return wrap(Reflect.apply(member, value, callbacks));
      };
    };
    const result = new Proxy(Object.create(prototype) as object, {
      get(_target, property) {
        return read(property);
      },
      getPrototypeOf() {
        assertActive();
        return Object.getPrototypeOf(value);
      },
      has(_target, property) {
        assertActive();
        return !privateProperties.has(property) && Reflect.has(value, property);
      },
      ownKeys() {
        assertActive();
        return Reflect.ownKeys(value).filter((property) => !privateProperties.has(property));
      },
      getOwnPropertyDescriptor(_target, property) {
        assertActive();
        if (privateProperties.has(property)) return undefined;
        const descriptor = Reflect.getOwnPropertyDescriptor(value, property);
        return descriptor
          ? { configurable: true, enumerable: descriptor.enumerable, get: () => read(property) }
          : undefined;
      },
      set() {
        throw new Error("Database scope handles cannot be mutated");
      },
      defineProperty() {
        throw new Error("Database scope handles cannot be mutated");
      },
      deleteProperty() {
        throw new Error("Database scope handles cannot be mutated");
      },
      setPrototypeOf() {
        throw new Error("Database scope handles cannot be mutated");
      },
      preventExtensions() {
        throw new Error("Database scope handles cannot be mutated");
      },
    });
    wrapped.set(value, result);
    scopedHandles.add(result);
    if (value !== database) argumentsByHandle.set(result, value);
    return result;
  };
  return {
    database: wrap(database) as T,
    revoke() {
      active = false;
    },
    async settleAsync() {
      while (pending.size > 0) await Promise.allSettled(pending);
    },
  };
};
