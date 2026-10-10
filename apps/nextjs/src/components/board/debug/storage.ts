import type { BoardSnapshotPayload } from "./snapshot";

const createMemoryStorage = (values = new Map<string, string>()): Storage => ({
  get length() {
    return values.size;
  },
  clear: () => values.clear(),
  getItem: (key) => values.get(String(key)) ?? null,
  setItem: (key, value) => {
    values.set(String(key), String(value));
  },
  removeItem: (key) => {
    values.delete(String(key));
  },
  key: (index) => [...values.keys()][index] ?? null,
});

export const installReplayStorage = (payload: Pick<BoardSnapshotPayload, "localStates">, capturedAt: string) => {
  const values = new Map<string, string>();
  for (const state of payload.localStates) {
    const stored = structuredClone(state.value) as { value?: { deadline?: number; alerts?: unknown } };
    if (stored?.value) {
      if (typeof stored.value.deadline === "number") stored.value.deadline += Date.now() - Date.parse(capturedAt);
      stored.value.alerts = { sound: false, notifications: false };
    }
    values.set(`homarr:timer:${state.key[1]}:${state.key[2]}:state`, JSON.stringify(stored));
  }
  // The preview has its own Window. Widget hooks can use their usual storage
  // API, while every imported snapshot starts with isolated in-memory state.
  Object.defineProperty(window, "localStorage", { configurable: true, value: createMemoryStorage(values) });
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: createMemoryStorage() });
};
