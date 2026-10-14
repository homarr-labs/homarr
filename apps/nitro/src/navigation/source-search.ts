import type { SearchParser, SearchSerializer } from "@tanstack/react-router";

const snapshotKey = Symbol("source-search");

function searchValues(value: unknown): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((entry: unknown) => searchValues(entry));
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    return [String(value)];
  }
  throw new TypeError("Source search values must be URLSearchParams-compatible scalars");
}

export function parseSourceSearch(search: string): Record<string, unknown> {
  const params = new URLSearchParams(search);
  const values: Record<string, unknown> = Object.fromEntries(
    Array.from(new Set(params.keys()), (key) => {
      const entries = params.getAll(key);
      if (entries.length === 1) return [key, entries[0]];
      return [key, entries];
    }),
  );
  Object.defineProperty(values, snapshotKey, { value: search, enumerable: true });
  return values;
}

export function stringifySourceSearch(search: Record<string, unknown>): string {
  const values = new Map(Object.entries(search).map(([key, value]) => [key, searchValues(value)]));
  const snapshot: unknown = Reflect.get(search, snapshotKey);
  const parts: string[] = [];
  const emitted = new Set<string>();
  const append = (key: string) => {
    const params = new URLSearchParams();
    for (const value of values.get(key) ?? []) params.append(key, value);
    if (params.size > 0) parts.push(params.toString());
    emitted.add(key);
  };

  if (typeof snapshot === "string") {
    const original = new URLSearchParams(snapshot);
    for (const part of snapshot.replace(/^\?/, "").split("&")) {
      const entry = new URLSearchParams(`?${part}`).entries().next().value;
      if (!entry) {
        if (part || snapshot.length > 1) parts.push(part);
        continue;
      }
      const [key] = entry;
      const previous = original.getAll(key);
      const current = values.get(key) ?? [];
      if (previous.length === current.length && previous.every((value, index) => value === current[index])) {
        parts.push(part);
        emitted.add(key);
      } else if (!emitted.has(key)) {
        append(key);
      }
    }
  }

  for (const key of values.keys()) {
    if (!emitted.has(key)) append(key);
  }
  if (parts.length === 0) return "";
  return `?${parts.join("&")}`;
}

export const sourceSearchSerialization = Object.freeze({
  parseSearch: parseSourceSearch,
  stringifySearch: stringifySourceSearch,
}) satisfies { parseSearch: SearchParser; stringifySearch: SearchSerializer };
