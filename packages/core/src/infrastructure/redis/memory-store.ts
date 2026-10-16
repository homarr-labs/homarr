import type { StateMessageCallback, StateSubscription } from "./state";

type Value = string | string[] | Map<string, string> | Map<string, number>;
type ValueKind = "string" | "list" | "hash" | "leases";
interface Entry {
  value: Value;
  kind: ValueKind;
  expiresAt?: number;
  protected: boolean;
  bytes: number;
}
interface Subscriber {
  callback: StateMessageCallback;
  busy: boolean;
  active: boolean;
  bytes: number;
}

const stringBytes = (value: string) => value.length * 2;
const positive = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) throw new Error("State TTL must be positive and finite");
  return value;
};

/** Single-process cache state. No sockets, interval timers, offline queue, or durable user data. */
export class MemoryStateStore {
  private readonly entries = new Map<string, Entry>();
  private readonly subscribers = new Map<string, Set<Subscriber>>();
  private bytes = 0;
  private subscriptionCount = 0;
  private sequence = 0;

  constructor(
    readonly maxBytes = 16 * 1024 * 1024,
    private readonly now: () => number = Date.now,
    readonly maxSubscriptions = 4096,
  ) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1024) throw new Error("Invalid local state byte limit");
    if (!Number.isSafeInteger(maxSubscriptions) || maxSubscriptions < 1) throw new Error("Invalid subscription limit");
  }

  get stats() {
    this.sweep();
    return {
      bytes: this.bytes,
      maxBytes: this.maxBytes,
      entries: this.entries.size,
      subscriptions: this.subscriptionCount,
    };
  }

  private remove(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return 0;
    this.entries.delete(key);
    this.bytes -= entry.bytes;
    return 1;
  }

  private sweep() {
    const now = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt !== undefined && entry.expiresAt <= now) this.remove(key);
    }
  }

  private read(key: string, kind?: ValueKind) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== undefined && entry.expiresAt <= this.now()) {
      this.remove(key);
      return undefined;
    }
    if (kind && entry.kind !== kind) throw new Error("State value has the wrong type");
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  private size(key: string, value: Value) {
    // Include conservative per-entry/map/list overhead as well as UTF-16 payloads.
    let size = 256 + stringBytes(key);
    if (typeof value === "string") return size + stringBytes(value);
    if (Array.isArray(value)) {
      for (const item of value) size += 32 + stringBytes(item);
      return size;
    }
    for (const [field, item] of value) {
      size += 96 + stringBytes(field);
      if (typeof item === "string") size += stringBytes(item);
      else size += 8;
    }
    return size;
  }

  private makeRoom(additional: number, retainKey?: string) {
    if (this.bytes + additional <= this.maxBytes) return;
    this.sweep();
    for (const [key, entry] of this.entries) {
      if (this.bytes + additional <= this.maxBytes) break;
      if (!entry.protected && key !== retainKey) this.remove(key);
    }
    if (this.bytes + additional > this.maxBytes) throw new Error("Local state capacity exceeded");
  }

  private write(key: string, value: Value, kind: ValueKind, expiresAt?: number, protectedEntry = false) {
    const bytes = this.size(key, value);
    if (bytes > this.maxBytes) throw new Error("State value exceeds local state capacity");
    const previous = this.read(key);
    const additional = bytes - (previous?.bytes ?? 0);
    this.makeRoom(additional, key);
    this.remove(key);
    this.entries.set(key, { value, kind, expiresAt, protected: protectedEntry, bytes });
    this.bytes += bytes;
  }

  get(key: string): string | null {
    return (this.read(key, "string")?.value as string | undefined) ?? null;
  }

  set(key: string, value: string, options: (string | number)[] = []): "OK" | null {
    let ttlMs: number | undefined;
    let nx = false;
    for (let index = 0; index < options.length; index++) {
      const option = options[index];
      if (option === "NX" && !nx) nx = true;
      else if ((option === "EX" || option === "PX") && ttlMs === undefined) {
        let unit = 1;
        if (option === "EX") unit = 1000;
        ttlMs = positive(Number(options[++index])) * unit;
      } else throw new Error("Unsupported state SET option");
    }
    if (nx && this.read(key)) return null;
    let expiresAt: number | undefined;
    if (ttlMs !== undefined) expiresAt = this.now() + ttlMs;
    // NX is used for leases. Leases cannot be evicted while their owner can still write.
    this.write(key, value, "string", expiresAt, nx);
    return "OK";
  }

  del(key: string) {
    return this.remove(key);
  }

  expire(key: string, ttlMs: number) {
    const entry = this.read(key);
    if (!entry) return 0;
    if (ttlMs <= 0) return this.remove(key);
    entry.expiresAt = this.now() + positive(ttlMs);
    return 1;
  }

  lpush(key: string, value: string) {
    const entry = this.read(key, "list");
    const items = [...((entry?.value as string[] | undefined) ?? [])];
    items.unshift(value);
    // Histories and queues drop oldest entries before exceeding the shared budget.
    while (items.length > 1 && this.size(key, items) > this.maxBytes / 4) items.pop();
    this.write(key, items, "list", entry?.expiresAt);
    return items.length;
  }

  lrange(key: string, start: number, stop: number) {
    const items = (this.read(key, "list")?.value as string[] | undefined) ?? [];
    let normalizedStart = start;
    let normalizedStop = stop;
    if (start < 0) normalizedStart = Math.max(0, items.length + start);
    if (stop < 0) normalizedStop = items.length + stop;
    if (normalizedStop < normalizedStart) return [];
    return items.slice(normalizedStart, normalizedStop + 1);
  }

  llen(key: string) {
    return (this.read(key, "list")?.value as string[] | undefined)?.length ?? 0;
  }

  ltrim(key: string, start: number, stop: number) {
    const entry = this.read(key, "list");
    if (!entry) return "OK";
    const values = this.lrange(key, start, stop);
    if (!values.length) this.remove(key);
    else this.write(key, values, "list", entry.expiresAt);
    return "OK";
  }

  lrem(key: string, count: number, value: string) {
    const entry = this.read(key, "list");
    if (!entry) return 0;
    const items = [...(entry.value as string[])];
    let removed = 0;
    if (count < 0) items.reverse();
    const retained = items.filter((item) => {
      if (item !== value || (count !== 0 && removed >= Math.abs(count))) return true;
      removed++;
      return false;
    });
    if (count < 0) retained.reverse();
    if (!retained.length) this.remove(key);
    else this.write(key, retained, "list", entry.expiresAt);
    return removed;
  }

  hset(key: string, field: string, value: string) {
    const entry = this.read(key, "hash");
    const fields = new Map((entry?.value as Map<string, string> | undefined) ?? []);
    const existed = fields.has(field);
    fields.set(field, value);
    this.write(key, fields, "hash", entry?.expiresAt);
    if (existed) return 0;
    return 1;
  }

  hvals(key: string) {
    return [...((this.read(key, "hash")?.value as Map<string, string> | undefined)?.values() ?? [])];
  }

  releaseOwned(key: string, token: string) {
    if (this.get(key) === token) this.remove(key);
  }

  renewOwned(key: string, token: string, ttlSeconds: number) {
    if (this.get(key) !== token) return false;
    this.expire(key, positive(ttlSeconds) * 1000);
    return true;
  }

  setOwned(key: string, token: string, target: string, value: string, ttlMs?: number) {
    if (this.get(key) !== token) return false;
    let expiresAt: number | undefined;
    if (ttlMs !== undefined) expiresAt = this.now() + positive(ttlMs);
    this.write(target, value, "string", expiresAt);
    return true;
  }

  advanceGeneration(key: string, ttlSeconds: number, globalKey?: string, deleteKey?: string) {
    const expiresAt = this.now() + positive(ttlSeconds) * 1000;
    // Process-unique monotonic tokens prevent a generation cycling after expiry.
    // Protected entries cannot disappear while stale payloads or leases are retained.
    const generation = String(++this.sequence);
    if (deleteKey) this.remove(deleteKey);
    this.write(key, generation, "string", expiresAt, true);
    const global = globalKey && this.get(globalKey);
    if (global && global !== "0") return `${global}:${generation}`;
    return generation;
  }

  compareAndSwapRevision(key: string, revision: number, value: string, ttlMs: number) {
    const current = this.get(key);
    if (!current) return false;
    try {
      const parsed: unknown = JSON.parse(current);
      if (!parsed || typeof parsed !== "object" || !("revision" in parsed) || Number(parsed.revision) !== revision)
        return false;
    } catch {
      return false;
    }
    this.set(key, value, ["PX", ttlMs]);
    return true;
  }

  incrementRate(key: string, windowMs: number) {
    positive(windowMs);
    const entry = this.read(key, "string");
    let count = 0;
    if (entry) count = Number(entry.value);
    if (!Number.isSafeInteger(count) || !Number.isSafeInteger(count + 1)) throw new Error("Invalid rate counter");
    const expiresAt = entry?.expiresAt ?? this.now() + windowMs;
    this.write(key, String(count + 1), "string", expiresAt, true);
    return { count: count + 1, retryAfterMs: Math.max(0, expiresAt - this.now()) };
  }

  acquireConcurrency(key: string, owner: string, limit: number, ttlMs: number) {
    positive(ttlMs);
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("Invalid concurrency limit");
    const entry = this.read(key, "leases");
    const leases = new Map((entry?.value as Map<string, number> | undefined) ?? []);
    const now = this.now();
    for (const [id, expiresAt] of leases) if (expiresAt <= now) leases.delete(id);
    if (leases.size >= limit) return false;
    leases.set(owner, now + ttlMs);
    let expiresAt = now + ttlMs;
    for (const leaseExpiry of leases.values()) expiresAt = Math.max(expiresAt, leaseExpiry);
    this.write(key, leases, "leases", expiresAt, true);
    return true;
  }

  releaseConcurrency(key: string, owner: string) {
    const entry = this.read(key, "leases");
    if (!entry) return;
    const leases = new Map(entry.value as Map<string, number>);
    leases.delete(owner);
    if (!leases.size) this.remove(key);
    else this.write(key, leases, "leases", entry.expiresAt, true);
  }

  subscribe(channel: string, callback: StateMessageCallback): StateSubscription {
    if (this.subscriptionCount >= this.maxSubscriptions) throw new Error("Local state subscription limit exceeded");
    const bytes = 320 + stringBytes(channel);
    this.makeRoom(bytes);
    const subscriber = { callback, busy: false, active: true, bytes };
    const subscriptions = this.subscribers.get(channel) ?? new Set<Subscriber>();
    subscriptions.add(subscriber);
    this.subscribers.set(channel, subscriptions);
    this.bytes += bytes;
    this.subscriptionCount++;
    return {
      ready: Promise.resolve(),
      unsubscribe: () => {
        if (!subscriber.active) return;
        subscriber.active = false;
        subscriptions.delete(subscriber);
        this.bytes -= bytes;
        this.subscriptionCount--;
        if (!subscriptions.size) this.subscribers.delete(channel);
      },
    };
  }

  publish(channel: string, message: string) {
    if (stringBytes(message) > this.maxBytes / 4) throw new Error("State message exceeds local state limit");
    const subscriptions = this.subscribers.get(channel);
    if (!subscriptions) return 0;
    for (const subscriber of subscriptions) {
      if (!subscriber.active || subscriber.busy) continue;
      try {
        const result = subscriber.callback(message);
        if (result && typeof result.then === "function") {
          subscriber.busy = true;
          void Promise.resolve(result)
            .catch(() => undefined)
            .finally(() => {
              subscriber.busy = false;
            });
        }
      } catch {
        /* One subscriber cannot interrupt the publisher or other subscribers. */
      }
    }
    return subscriptions.size;
  }
}
