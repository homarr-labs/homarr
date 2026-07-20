import { SafeJsxError } from "./interpreter-foundation";
import type { Budget } from "./interpreter-foundation";
import { CUSTOM_JSX_BLOCKED_PROPERTIES, normalizeCustomJsxProperty } from "./policy";
import { ownProperty } from "./safe-properties";

export const DEFAULT_MAX_DEPTH = 16;
export const HARD_MAX_DEPTH = 32;
export const DEFAULT_MAX_NODES = 500;
export const HARD_MAX_NODES = 2_000;

export function exceedsRecursiveListNodeLimit(
  roots: readonly unknown[],
  childrenPath: readonly string[],
  maxDepth: number,
  maxNodes: number,
  budget: Budget,
) {
  let rows = 0;
  const charge = (depth: number) => {
    budget.operation(depth + 1);
    rows += 1;
    return rows > maxNodes;
  };
  const visit = (values: readonly unknown[], depth: number, ancestors: ReadonlySet<object>): boolean => {
    for (const value of values) {
      if (charge(depth)) return true;
      if (!isObject(value) || ancestors.has(value)) continue;

      const rawChildren = readRestrictedPath(value, childrenPath);
      if (rawChildren !== undefined && rawChildren !== null && !Array.isArray(rawChildren)) {
        if (charge(depth + 1)) return true;
        continue;
      }
      if (!Array.isArray(rawChildren) || rawChildren.length === 0) continue;
      if (depth + 1 >= maxDepth) {
        if (charge(depth + 1)) return true;
        continue;
      }
      if (visit(rawChildren, depth + 1, new Set(ancestors).add(value))) return true;
    }
    return false;
  };
  return visit(roots, 0, new Set());
}

export function parseRestrictedPath(value: string, name: string): string[] {
  if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/u.test(value)) {
    throw new SafeJsxError(`RECURSIVE_LIST_INVALID_PATH: ${name} must be a dotted property path`);
  }
  const segments = value.split(".");
  for (const segment of segments) {
    if (CUSTOM_JSX_BLOCKED_PROPERTIES.has(normalizeCustomJsxProperty(segment))) {
      throw new SafeJsxError(`RECURSIVE_LIST_INVALID_PATH: ${name} contains blocked segment '${segment}'`);
    }
  }
  return segments;
}

export function readRestrictedPath(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const segment of path) current = ownProperty(current, segment);
  return current;
}

export function primitiveKey(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : null;
}

export function clampWithWarning(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
  name: string,
  warnings: Set<string>,
) {
  const validNumber = typeof value === "number" && Number.isFinite(value);
  const number = validNumber ? Math.trunc(value) : fallback;
  const clamped = Math.min(maximum, Math.max(minimum, number));
  if (value !== undefined && (!validNumber || value !== number || number !== clamped)) {
    warnings.add(`RECURSIVE_LIST_LIMIT_CLAMPED: ${name} was clamped to ${clamped}`);
  }
  return clamped;
}

export function isObject(value: unknown): value is object {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function formatPath(path: readonly number[]) {
  return path.length === 0 ? "root" : path.join(".");
}
