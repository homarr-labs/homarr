const safeCallables = new WeakSet<(...args: never[]) => unknown>();

/**
 * Marks a host function as callable by the Custom JSX interpreter.
 *
 * The interpreter never calls an arbitrary function obtained from data or a
 * prototype. Host helpers must opt in through this module instead.
 */
export function createSafeCallable<T extends (...args: never[]) => unknown>(callable: T): T {
  safeCallables.add(callable);
  return callable;
}

export function isSafeCallable(value: unknown): value is (...args: never[]) => unknown {
  return typeof value === "function" && safeCallables.has(value as (...args: never[]) => unknown);
}
