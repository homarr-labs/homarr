export function areCustomWidgetValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left)) {
    if (!Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => areCustomWidgetValuesEqual(value, right[index]));
  }

  if (!isRecord(left) || !isRecord(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => Object.hasOwn(right, key) && areCustomWidgetValuesEqual(left[key], right[key]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
