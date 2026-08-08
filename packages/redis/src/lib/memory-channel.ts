import EventEmitter from "node:events";

import superjson from "superjson";

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

const lastData = new Map<string, { data: string; timestamp: number }>();
const MAX_ENTRIES = 500;

export const memoryPublish = (channel: string, data: unknown) => {
  const serialized = superjson.stringify(data);
  lastData.set(channel, { data: serialized, timestamp: Date.now() });

  // ponytail: FIFO eviction by Map insertion order, not timestamp.
  if (lastData.size > MAX_ENTRIES) {
    const oldest = lastData.keys().next().value;
    if (oldest) lastData.delete(oldest);
  }

  emitter.emit(channel, serialized);
};

export const memorySubscribe = (channel: string, callback: (data: string) => void) => {
  emitter.on(channel, callback);
  return () => {
    emitter.off(channel, callback);
  };
};

export const memoryGetLast = (channel: string): string | null => {
  const entry = lastData.get(channel);
  return entry?.data ?? null;
};
