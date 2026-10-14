import type { AtomicStateBacking, StateMutation, StateOperation, StateSnapshot } from "./backing";

const assertActive = (operation: StateOperation) => {
  operation.signal.throwIfAborted();
  if (Date.now() >= operation.deadlineAt) throw new Error("Fixture operation expired");
};

export const createStateBackingFixture = () => {
  const rows = new Map<string, { value: string; expiresAt: number | null }>();
  const read = (key: string, now: number) => {
    const row = rows.get(key);
    if (!row) return null;
    if (row.expiresAt !== null && now >= row.expiresAt) {
      rows.delete(key);
      return null;
    }
    return row.value;
  };
  const snapshot = (keys: readonly string[]): StateSnapshot => {
    const now = Date.now();
    return { now, values: Object.fromEntries(keys.map((key) => [key, read(key, now)])) };
  };
  const backing: AtomicStateBacking = {
    readAsync: async (keys, operation) => {
      assertActive(operation);
      return snapshot(keys);
    },
    mutateAsync: async (mutation: StateMutation, operation: StateOperation) => {
      assertActive(operation);
      const now = Date.now();
      if (!mutation.conditions.every((condition) => read(condition.key, now) === condition.equals)) {
        return { ...snapshot(mutation.readKeys), applied: false };
      }
      for (const write of mutation.writes) {
        if (write.kind === "delete") rows.delete(write.key);
        else if (write.kind === "set")
          rows.set(write.key, { value: write.value, expiresAt: write.ttlMs === null ? null : now + write.ttlMs });
        else
          rows.set(write.key, { value: String(Number(read(write.key, now) ?? 0) + 1), expiresAt: now + write.ttlMs });
      }
      return { ...snapshot(mutation.readKeys), applied: true };
    },
  };
  return backing;
};
