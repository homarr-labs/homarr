import assert from "node:assert/strict";
import { setImmediate as settleAsync } from "node:timers/promises";
import { parse, stringify } from "superjson";

import type { LoggerMessage } from "../../constants";
import { LOG_HISTORY_MAX_ENTRIES } from "../../constants";
import type { HistoryOperation, LogHistoryBacking, SampleHistoryBacking } from "../backing";
import type { LogAuthorizer, LogObserver, LogStreamClose, LogSubscriptionEvent } from "../log-history-stream";
import { LogBackpressureError, LogHistoryStream } from "../log-history-stream";
import type { SampleAuthorizer } from "../sample-history-store";
import { SampleHistoryStore } from "../sample-history-store";
import {
  createDashdotCpuHistory,
  createOpnsenseInterfaceHistory,
  getDashdotLoadAveragesAsync,
} from "../sample-payloads";

const deferred = <T>() => Promise.withResolvers<T>();
const message = (id: string, level: LoggerMessage["level"] = "info"): LoggerMessage => ({
  id,
  level,
  timestamp: new Date(1_000),
  message: `entry ${id}`,
});
const activeSignal = () => new AbortController().signal;

class LogFixture implements LogHistoryBacking {
  newest: string[] = [];
  listeners = new Set<(data: string) => void>();
  subscribeGate: Promise<void> | null = null;
  historyGate: Promise<readonly string[]> | null = null;
  failHistory = false;
  failSubscribe = false;
  reads = 0;
  subscriptions = 0;
  releases = 0;

  async appendAndPublishAsync(serialized: string, max: number, operation: HistoryOperation) {
    operation.signal.throwIfAborted();
    this.newest.unshift(serialized);
    this.newest.length = Math.min(this.newest.length, max);
    this.emit(serialized);
  }

  async readNewestAsync(max: number, operation: HistoryOperation) {
    operation.signal.throwIfAborted();
    this.reads++;
    if (this.failHistory) throw new Error("history unavailable");
    return this.historyGate ? await this.historyGate : this.newest.slice(0, max);
  }

  async subscribeAsync(callback: (data: string) => void, _operation: HistoryOperation) {
    this.subscriptions++;
    if (this.failSubscribe) throw new Error("subscribe unavailable");
    this.listeners.add(callback);
    if (this.subscribeGate) await this.subscribeGate;
    return () => {
      this.releases++;
      this.listeners.delete(callback);
    };
  }

  emit(serialized: string) {
    for (const listener of this.listeners) listener(serialized);
  }
}

const logPolicy = () => {
  const revoked = new AbortController();
  let allowed = true;
  const gate: { current: Promise<void> | null } = { current: null };
  const authorizer: LogAuthorizer = {
    revoked: revoked.signal,
    requirePermissionAsync: async (permission, signal) => {
      assert.equal(permission, "other-view-logs");
      signal.throwIfAborted();
      if (gate.current) await gate.current;
      signal.throwIfAborted();
      if (!allowed) throw new Error("denied");
    },
  };
  return {
    authorizer,
    revoked,
    deny: () => {
      allowed = false;
    },
    gate,
  };
};
const observerFixture = () => {
  const events: LogSubscriptionEvent[] = [];
  const closes: LogStreamClose[] = [];
  const observer: LogObserver = {
    nextAsync: async (event, signal) => {
      signal.throwIfAborted();
      events.push(event);
    },
    closed: (reason) => {
      closes.push(reason);
    },
  };
  return { observer, events, closes };
};

class SampleFixture implements SampleHistoryBacking {
  values = new Map<string, string[]>();
  listeners = new Map<string, Set<(data: string) => void>>();
  calls: string[] = [];
  readGate: Promise<readonly string[]> | null = null;
  subscribeGate: Promise<void> | null = null;
  releases = 0;

  async pushAsync(name: string, entry: string, max: number, operation: HistoryOperation) {
    operation.signal.throwIfAborted();
    this.calls.push("push");
    this.values.set(name, [entry, ...(this.values.get(name) ?? [])].slice(0, max));
  }

  async readNewestAsync(name: string, max: number, operation: HistoryOperation) {
    operation.signal.throwIfAborted();
    this.calls.push("read");
    return this.readGate ? await this.readGate : (this.values.get(name) ?? []).slice(0, max);
  }

  async clearAsync(name: string, operation: HistoryOperation) {
    operation.signal.throwIfAborted();
    this.values.delete(name);
  }

  async publishAsync(name: string, data: string, operation: HistoryOperation) {
    operation.signal.throwIfAborted();
    this.calls.push("publish");
    for (const listener of this.listeners.get(name) ?? []) listener(data);
  }

  async subscribeAsync(name: string, callback: (data: string) => void, _operation: HistoryOperation) {
    const listeners = this.listeners.get(name) ?? new Set<(data: string) => void>();
    listeners.add(callback);
    this.listeners.set(name, listeners);
    if (this.subscribeGate) await this.subscribeGate;
    return () => {
      this.releases++;
      listeners.delete(callback);
    };
  }
}

const samplePolicy = () => {
  const revoked = new AbortController();
  let allowed = true;
  const requests: string[] = [];
  const authorizer: SampleAuthorizer = {
    revoked: revoked.signal,
    requireAccessAsync: async (name, action, signal) => {
      requests.push(`${name}:${action}`);
      signal.throwIfAborted();
      if (!allowed) throw new Error("sample denied");
    },
  };
  return {
    authorizer,
    revoked,
    requests,
    deny: () => {
      allowed = false;
    },
  };
};

const checks: { name: string; runAsync(): Promise<void> }[] = [
  {
    name: "listener-before-history race, oldest-first replay, level filtering and bounded-ID deduplication",
    runAsync: async () => {
      const backing = new LogFixture();
      const history = deferred<readonly string[]>();
      backing.historyGate = history.promise;
      const stream = new LogHistoryStream(backing);
      const policy = logPolicy();
      const observed = observerFixture();
      const subscription = stream.subscribe({ authorizer: policy.authorizer, signal: activeSignal(), ...observed });
      await settleAsync();
      assert.equal(backing.listeners.size, 1);
      await stream.appendAsync(message("overlap"), activeSignal());
      backing.emit(stringify(message("overlap")));
      backing.emit("malformed");
      backing.emit(stringify(message("filtered", "debug")));
      backing.emit(stringify(message("after")));
      history.resolve([stringify(message("overlap")), stringify(message("old")), stringify(message("warn", "warn"))]);
      await subscription.readyAsync;
      await settleAsync();
      assert.deepEqual(observed.events, [
        { type: "history", messages: [message("old"), message("overlap")] },
        { type: "message", message: message("after") },
      ]);
      backing.emit(stringify(message("after")));
      await settleAsync();
      assert.equal(observed.events.length, 2);
      subscription.dispose();
      subscription.dispose();
      assert.equal(backing.releases, 1);
      assert.equal(backing.listeners.size, 0);
      assert.deepEqual(observed.closes, [{ type: "disposed" }]);
    },
  },
  {
    name: "real log producer keeps 5000 entries and SuperJSON Dates without timestamp sorting",
    runAsync: async () => {
      const backing = new LogFixture();
      const stream = new LogHistoryStream(backing);
      for (let index = 0; index < LOG_HISTORY_MAX_ENTRIES + 2; index++) {
        await stream.appendAsync({ ...message(`${index}`), timestamp: new Date(10_000 - index) }, activeSignal());
      }
      const entries = await stream.getRecentAsync(logPolicy().authorizer, activeSignal());
      assert.equal(entries.length, 5000);
      assert.equal(entries[0]?.id, "2");
      assert.equal(entries.at(-1)?.id, "5001");
      assert(entries[0]?.timestamp instanceof Date);
      const produced = await stream.recordAsync("formatted source message", "warn", activeSignal());
      assert.equal(produced.message, "formatted source message");
      assert.equal(produced.level, "warn");
      assert.equal(parse<LoggerMessage>(backing.newest[0] ?? "").id, produced.id);
    },
  },
  {
    name: "pending replay rejects overflow, tolerates repeated IDs and releases after late subscription settlement",
    runAsync: async () => {
      const backing = new LogFixture();
      const listener = deferred<void>();
      backing.subscribeGate = listener.promise;
      const observed = observerFixture();
      const subscription = new LogHistoryStream(backing).subscribe({
        authorizer: logPolicy().authorizer,
        signal: activeSignal(),
        ...observed,
      });
      await settleAsync();
      for (let index = 0; index <= LOG_HISTORY_MAX_ENTRIES; index++) backing.emit(stringify(message("duplicate")));
      assert.equal(observed.closes.length, 0);
      for (let index = 0; index < LOG_HISTORY_MAX_ENTRIES; index++) backing.emit(stringify(message(`unique-${index}`)));
      await assert.rejects(subscription.readyAsync, LogBackpressureError);
      listener.resolve();
      await settleAsync();
      assert.equal(backing.releases, 1);
      assert.equal(backing.reads, 0);
      assert.deepEqual(observed.events, []);
    },
  },
  {
    name: "direct log history rechecks policy after the backing read before returning private payloads",
    runAsync: async () => {
      const backing = new LogFixture();
      const history = deferred<readonly string[]>();
      backing.historyGate = history.promise;
      const policy = logPolicy();
      const read = new LogHistoryStream(backing).getRecentAsync(policy.authorizer, activeSignal());
      await settleAsync();
      policy.deny();
      history.resolve([stringify(message("private"))]);
      await assert.rejects(read, /denied/);
    },
  },
  {
    name: "abort before subscription settles promptly rejects readiness and releases a late listener once",
    runAsync: async () => {
      const backing = new LogFixture();
      const settling = deferred<void>();
      backing.subscribeGate = settling.promise;
      const request = new AbortController();
      const observed = observerFixture();
      const subscription = new LogHistoryStream(backing).subscribe({
        authorizer: logPolicy().authorizer,
        signal: request.signal,
        ...observed,
      });
      await settleAsync();
      const error = new Error("request cancelled");
      request.abort(error);
      await assert.rejects(subscription.readyAsync, (reason) => reason === error);
      backing.emit(stringify(message("late")));
      settling.resolve();
      await settleAsync();
      assert.equal(backing.releases, 1);
      assert.equal(backing.listeners.size, 0);
      assert.equal(backing.reads, 0);
      assert.deepEqual(observed.events, []);
      assert.equal(observed.closes[0]?.type, "aborted");
    },
  },
  {
    name: "initial denial and already-aborted signals do not acquire listeners or read history",
    runAsync: async () => {
      const backing = new LogFixture();
      const policy = logPolicy();
      policy.deny();
      const stream = new LogHistoryStream(backing);
      await assert.rejects(stream.getRecentAsync(policy.authorizer, activeSignal()), /denied/);
      const denied = stream.subscribe({ authorizer: policy.authorizer, signal: activeSignal(), ...observerFixture() });
      await assert.rejects(denied.readyAsync, /denied/);
      const aborted = stream.subscribe({
        authorizer: logPolicy().authorizer,
        signal: AbortSignal.abort(new Error("already aborted")),
        ...observerFixture(),
      });
      await assert.rejects(aborted.readyAsync, /already aborted/);
      assert.equal(backing.subscriptions, 0);
      assert.equal(backing.reads, 0);
    },
  },
  {
    name: "revocation during history load clears private pending delivery and releases the listener",
    runAsync: async () => {
      const backing = new LogFixture();
      const history = deferred<readonly string[]>();
      backing.historyGate = history.promise;
      const policy = logPolicy();
      const observed = observerFixture();
      const subscription = new LogHistoryStream(backing).subscribe({
        authorizer: policy.authorizer,
        signal: activeSignal(),
        ...observed,
      });
      await settleAsync();
      backing.emit(stringify(message("private")));
      policy.revoked.abort(new Error("revoked"));
      await assert.rejects(subscription.readyAsync, /revoked/);
      history.resolve([stringify(message("private"))]);
      await settleAsync();
      assert.equal(backing.releases, 1);
      assert.equal(observed.events.length, 0);
      assert.equal(observed.closes.length, 1);
    },
  },
  {
    name: "current policy is checked before each delayed event, not only at connection time",
    runAsync: async () => {
      const backing = new LogFixture();
      const policy = logPolicy();
      const observed = observerFixture();
      const subscription = new LogHistoryStream(backing).subscribe({
        authorizer: policy.authorizer,
        signal: activeSignal(),
        ...observed,
      });
      await subscription.readyAsync;
      await settleAsync();
      const gate = deferred<void>();
      policy.gate.current = gate.promise;
      backing.emit(stringify(message("queued")));
      policy.deny();
      gate.resolve();
      await settleAsync();
      assert.deepEqual(observed.events, [{ type: "history", messages: [] }]);
      assert.equal(observed.closes[0]?.type, "error");
      assert.equal(backing.listeners.size, 0);
    },
  },
  {
    name: "history failure retains source empty-history fallback; listener and consumer failures close cleanly",
    runAsync: async () => {
      const backing = new LogFixture();
      backing.failHistory = true;
      const observed = observerFixture();
      const stream = new LogHistoryStream(backing);
      const subscription = stream.subscribe({
        authorizer: logPolicy().authorizer,
        signal: activeSignal(),
        ...observed,
      });
      await subscription.readyAsync;
      await settleAsync();
      assert.deepEqual(observed.events, [{ type: "history", messages: [] }]);
      subscription.dispose();
      backing.failSubscribe = true;
      const failed = stream.subscribe({
        authorizer: logPolicy().authorizer,
        signal: activeSignal(),
        ...observerFixture(),
      });
      await assert.rejects(failed.readyAsync, /subscribe unavailable/);
      backing.failSubscribe = false;
      const failedConsumer = observerFixture();
      failedConsumer.observer.nextAsync = async () => {
        throw new Error("delivery failed");
      };
      const consumer = stream.subscribe({
        authorizer: logPolicy().authorizer,
        signal: activeSignal(),
        ...failedConsumer,
      });
      await consumer.readyAsync;
      await settleAsync();
      assert.equal(failedConsumer.closes[0]?.type, "error");
      assert.equal(backing.listeners.size, 0);
    },
  },
  {
    name: "slow-consumer overflow explicitly closes instead of silently losing unbounded messages",
    runAsync: async () => {
      const backing = new LogFixture();
      const observed = observerFixture();
      const delivery = deferred<void>();
      observed.observer.nextAsync = async () => {
        await delivery.promise;
      };
      const subscription = new LogHistoryStream(backing).subscribe({
        authorizer: logPolicy().authorizer,
        signal: activeSignal(),
        ...observed,
      });
      await subscription.readyAsync;
      await settleAsync();
      for (let index = 0; index <= LOG_HISTORY_MAX_ENTRIES; index++) backing.emit(stringify(message(`${index}`)));
      assert.equal(observed.closes[0]?.type, "error");
      const reason = observed.closes[0];
      assert(reason?.type === "error" && reason.error instanceof LogBackpressureError);
      assert.equal(backing.listeners.size, 0);
      delivery.resolve();
      await settleAsync();
      assert.equal(backing.releases, 1);
    },
  },
  {
    name: "sample retention, newest-first inclusive slices, oldest getLast and exact legacy time cutoff",
    runAsync: async () => {
      const backing = new SampleFixture();
      const policy = samplePolicy();
      let now = 1_000;
      const history = new SampleHistoryStore("fixture", {
        backing,
        authorizer: policy.authorizer,
        now: () => new Date(now),
        parseData: (value) => {
          if (typeof value !== "number") throw new TypeError("number required");
          return value;
        },
      });
      for (let value = 0; value < 17; value++) {
        now = 1_000 + value;
        await history.pushAsync(value, activeSignal());
      }
      assert.equal(history.maxElements, 15);
      assert.equal(await history.getLengthAsync(activeSignal()), 15);
      assert.deepEqual(await history.getSliceAsync(0, 1, activeSignal()), [
        { data: 16, timestamp: new Date(1016) },
        { data: 15, timestamp: new Date(1015) },
      ]);
      assert.equal((await history.getLastAsync(activeSignal()))?.data, 2);
      assert.deepEqual(await history.getSliceUntilTimeAsync(new Date(1015), activeSignal()), [16, 15]);
      assert.equal((await history.getSliceUntilTimeAsync(new Date(0), activeSignal())).length, 14);
      assert.deepEqual(
        (await history.getSliceAsync(-2, -1, activeSignal())).map((entry) => entry.data),
        [3, 2],
      );
      await history.publishAndPushAsync(18, activeSignal());
      assert.deepEqual(backing.calls.slice(-2), ["publish", "push"]);
      await history.clearAsync(activeSignal());
      assert.equal(await history.getLastAsync(activeSignal()), null);
    },
  },
  {
    name: "real Dashdot 100-entry CPU windows and OPNsense 15-entry native cumulative-byte payloads",
    runAsync: async () => {
      const backing = new SampleFixture();
      const policy = samplePolicy();
      const now = new Date(2_000_000);
      const resources = { backing, authorizer: policy.authorizer, now: () => now };
      const cpu = createDashdotCpuHistory("synthetic", resources);
      assert.equal(cpu.name, "integration:synthetic:history:cpu");
      for (let value = 0; value < 102; value++) await cpu.pushAsync([{ load: value, temp: 55 }], activeSignal());
      assert.equal(await cpu.getLengthAsync(activeSignal()), 100);
      assert.deepEqual(await getDashdotLoadAveragesAsync(cpu, now, activeSignal()), {
        "1min": 101,
        "5min": 100,
        "15min": 95,
      });
      const network = createOpnsenseInterfaceHistory("synthetic", resources);
      for (let value = 0; value < 17; value++) {
        await network.pushAsync([{ name: "lan", receive: 1_000 + value, transmit: 2_000 + value }], activeSignal());
      }
      assert.equal(await network.getLengthAsync(activeSignal()), 15);
      assert.deepEqual(await network.getSliceAsync(0, 1, activeSignal()), [
        { data: [{ name: "lan", receive: 1016, transmit: 2016 }], timestamp: now },
        { data: [{ name: "lan", receive: 1015, transmit: 2015 }], timestamp: now },
      ]);
      assert(policy.requests.some((request) => request === `${network.name}:read`));
      await network.pushAsync(
        [{ name: "source-nan", receive: Number.NaN, transmit: Number.POSITIVE_INFINITY }],
        activeSignal(),
      );
      const native = (await network.getSliceAsync(0, 0, activeSignal()))[0]?.data[0];
      assert(Number.isNaN(native?.receive));
      assert.equal(native?.transmit, Number.POSITIVE_INFINITY);
    },
  },
  {
    name: "sample direct reads deny late authority changes and async listener abort disposes exactly once",
    runAsync: async () => {
      const backing = new SampleFixture();
      const policy = samplePolicy();
      const history = createOpnsenseInterfaceHistory("synthetic", {
        backing,
        authorizer: policy.authorizer,
        now: () => new Date(0),
      });
      const gate = deferred<readonly string[]>();
      backing.readGate = gate.promise;
      const read = history.getSliceAsync(0, 1, activeSignal());
      await settleAsync();
      policy.deny();
      gate.resolve([stringify({ data: [], timestamp: new Date(0) })]);
      await assert.rejects(read, /sample denied/);
      const otherPolicy = samplePolicy();
      const other = createOpnsenseInterfaceHistory("other", {
        backing,
        authorizer: otherPolicy.authorizer,
        now: () => new Date(0),
      });
      const listener = deferred<void>();
      backing.subscribeGate = listener.promise;
      const events: unknown[] = [];
      const closes: LogStreamClose[] = [];
      const subscription = other.subscribe({
        signal: activeSignal(),
        nextAsync: async (data) => {
          events.push(data);
        },
        closed: (reason) => {
          closes.push(reason);
        },
      });
      await settleAsync();
      otherPolicy.revoked.abort(new Error("resource revoked"));
      await assert.rejects(subscription.readyAsync, /resource revoked/);
      listener.resolve();
      await settleAsync();
      await backing.publishAsync(other.name, stringify([]), { signal: activeSignal() });
      assert.equal(backing.releases, 1);
      assert.deepEqual(events, []);
      assert.equal(closes.length, 1);
      assert.equal(backing.listeners.get(other.name)?.size, 0);
    },
  },
];

for (const check of checks) {
  await check.runAsync();
  console.log(`PASS ${check.name}`);
}
console.log(`${checks.length} focused history/security/cancellation checks passed; memory fixtures only`);
