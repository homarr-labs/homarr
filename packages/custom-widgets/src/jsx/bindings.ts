import { createSafeCallable } from "./safe-bindings";

function sanitizeData(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitizeData);
  const safe: Record<string, unknown> = Object.create(null);
  for (const [key, child] of Object.entries(value)) {
    if (["constructor", "__proto__", "prototype"].includes(key)) continue;
    safe[key] = sanitizeData(child);
  }
  return safe;
}

const safeMath = Object.freeze(
  Object.assign(Object.create(null) as Record<string, unknown>, {
    round: createSafeCallable((value: number) => Math.round(value)),
    floor: createSafeCallable((value: number) => Math.floor(value)),
    ceil: createSafeCallable((value: number) => Math.ceil(value)),
    abs: createSafeCallable((value: number) => Math.abs(value)),
    min: createSafeCallable((...values: number[]) => Math.min(...values)),
    max: createSafeCallable((...values: number[]) => Math.max(...values)),
    pow: createSafeCallable((base: number, exponent: number) => Math.pow(base, exponent)),
    sqrt: createSafeCallable((value: number) => Math.sqrt(value)),
    PI: Math.PI,
  }),
);

const safeDate = Object.freeze(
  Object.assign(Object.create(null) as Record<string, unknown>, {
    now: createSafeCallable(() => Date.now()),
    create: createSafeCallable((value?: string | number) =>
      value === undefined ? Date.now() : new Date(value).getTime(),
    ),
    toISOString: createSafeCallable((value: string | number) => new Date(value).toISOString()),
    toLocaleDateString: createSafeCallable((value: string | number, locale?: string) =>
      new Date(value).toLocaleDateString(locale ?? "en-US"),
    ),
    toLocaleTimeString: createSafeCallable((value: string | number, locale?: string) =>
      new Date(value).toLocaleTimeString(locale ?? "en-US"),
    ),
    getTime: createSafeCallable((value: string | number) => new Date(value).getTime()),
    getYear: createSafeCallable((value: string | number) => new Date(value).getFullYear()),
    getMonth: createSafeCallable((value: string | number) => new Date(value).getMonth()),
    getDay: createSafeCallable((value: string | number) => new Date(value).getUTCDay()),
  }),
);

export function createCustomJsxBindings(apiData: unknown) {
  const safeJson = Object.freeze(
    Object.assign(Object.create(null) as Record<string, unknown>, {
      stringify: createSafeCallable((value: unknown) => JSON.stringify(value)),
    }),
  );
  const safeArray = Object.freeze(
    Object.assign(Object.create(null) as Record<string, unknown>, {
      isArray: createSafeCallable(Array.isArray),
      from: createSafeCallable((value: ArrayLike<unknown> | Iterable<unknown>) => Array.from(value).slice(0, 2_000)),
    }),
  );
  const safeObject = Object.freeze(
    Object.assign(Object.create(null) as Record<string, unknown>, {
      keys: createSafeCallable(Object.keys),
      values: createSafeCallable(Object.values),
      entries: createSafeCallable(Object.entries),
    }),
  );
  return {
    data: sanitizeData(apiData),
    String: createSafeCallable((value: unknown) => String(value)),
    Number: createSafeCallable((value: unknown) => Number(value)),
    Boolean: createSafeCallable((value: unknown) => Boolean(value)),
    Math: safeMath,
    JSON: safeJson,
    Array: safeArray,
    Object: safeObject,
    Date: safeDate,
    parseInt: createSafeCallable((value: string, radix?: number) => parseInt(value, radix)),
    parseFloat: createSafeCallable((value: string) => parseFloat(value)),
    encodeURIComponent: createSafeCallable((value: string) => encodeURIComponent(value)),
    decodeURIComponent: createSafeCallable((value: string) => decodeURIComponent(value)),
    isNaN: createSafeCallable((value: unknown) => Number.isNaN(Number(value))),
    isFinite: createSafeCallable((value: unknown) => Number.isFinite(Number(value))),
  };
}
