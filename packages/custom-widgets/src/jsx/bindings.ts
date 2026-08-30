import { createSafeCallable } from "./safe-bindings";
import { SafeJsxBudgetError, SafeJsxError } from "./interpreter-foundation";

export const CUSTOM_JSX_DATA_LIMITS = Object.freeze({
  depth: 32,
  nodes: 50_000,
  stringLength: 200_000,
});

interface SanitizeTask {
  value: unknown;
  depth: number;
  assign(value: unknown): void;
}

function sanitizeData(value: unknown): unknown {
  let result: unknown;
  let nodes = 0;
  const seen = new WeakSet<object>();
  const tasks: SanitizeTask[] = [{ value, depth: 0, assign: (sanitized) => (result = sanitized) }];

  while (tasks.length > 0) {
    const task = tasks.pop();
    if (!task) break;
    if (++nodes > CUSTOM_JSX_DATA_LIMITS.nodes) {
      throw new SafeJsxBudgetError(`Response data exceeded the node limit (${CUSTOM_JSX_DATA_LIMITS.nodes})`);
    }
    if (task.depth > CUSTOM_JSX_DATA_LIMITS.depth) {
      throw new SafeJsxBudgetError(`Response data exceeded the depth limit (${CUSTOM_JSX_DATA_LIMITS.depth})`);
    }
    if (typeof task.value === "string" && task.value.length > CUSTOM_JSX_DATA_LIMITS.stringLength) {
      throw new SafeJsxBudgetError(
        `Response data exceeded the string length limit (${CUSTOM_JSX_DATA_LIMITS.stringLength})`,
      );
    }
    if (task.value === null || typeof task.value !== "object") {
      task.assign(task.value);
      continue;
    }
    if (seen.has(task.value)) throw new SafeJsxError("Response data must not contain circular or repeated objects");
    seen.add(task.value);

    if (Array.isArray(task.value)) {
      if (task.value.length > CUSTOM_JSX_DATA_LIMITS.nodes - nodes) {
        throw new SafeJsxBudgetError(`Response data exceeded the node limit (${CUSTOM_JSX_DATA_LIMITS.nodes})`);
      }
      const safe = Array.from<unknown>({ length: task.value.length });
      task.assign(safe);
      for (let index = task.value.length - 1; index >= 0; index -= 1) {
        if (!Object.hasOwn(task.value, index)) continue;
        tasks.push({
          value: task.value[index],
          depth: task.depth + 1,
          assign: (sanitized) => (safe[index] = sanitized),
        });
      }
      continue;
    }

    const entries = Object.entries(task.value);
    if (entries.length > CUSTOM_JSX_DATA_LIMITS.nodes - nodes) {
      throw new SafeJsxBudgetError(`Response data exceeded the node limit (${CUSTOM_JSX_DATA_LIMITS.nodes})`);
    }
    const safe: Record<string, unknown> = Object.create(null);
    task.assign(safe);
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [key, child] = entries[index] as [string, unknown];
      if (["constructor", "__proto__", "prototype"].includes(key)) continue;
      if (key.length > CUSTOM_JSX_DATA_LIMITS.stringLength) {
        throw new SafeJsxBudgetError(
          `Response data exceeded the string length limit (${CUSTOM_JSX_DATA_LIMITS.stringLength})`,
        );
      }
      tasks.push({
        value: child,
        depth: task.depth + 1,
        assign: (sanitized) => (safe[key] = sanitized),
      });
    }
  }

  return result;
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

const formatLocaleDateTime = (value: string | number, locale = "en-US", timeZone?: string) => {
  const options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
  if (timeZone) options.timeZone = timeZone;
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
};

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
    toLocaleString: createSafeCallable(formatLocaleDateTime),
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
