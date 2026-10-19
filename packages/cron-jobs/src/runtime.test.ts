import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

const keys = ["analytics", "iconsUpdater", "ping"];
const initialize = mock(async () => {});
const start = mock(async (_name: string) => {});
const stop = mock(() => {});
const enabled = new Set(keys);

mock.module("./index", () => ({
  jobGroup: {
    initializeAsync: initialize,
    startAsync: start,
    stopAll: stop,
    getKeys: () => keys,
    getTask: (name: string) => enabled.has(name),
  },
}));

const { createCronJobRuntime } = await import("./runtime");

function pending() {
  return Promise.withResolvers<void>();
}

beforeEach(() => {
  initialize.mockReset().mockImplementation(async () => {});
  start.mockReset().mockImplementation(async () => {});
  stop.mockClear();
  enabled.clear();
  for (const key of keys) enabled.add(key);
});

afterEach(() => mock.restore());

describe("scheduled job runtime", () => {
  test("eager readiness waits for enabled jobs and skips disabled schedules", async () => {
    enabled.delete("iconsUpdater");
    const analytics = pending();
    start.mockImplementation(async (name) => {
      if (name === "analytics") await analytics.promise;
    });
    const runtime = createCronJobRuntime();
    let ready = false;
    const startup = runtime.startAsync().then(() => {
      ready = true;
    });
    await Promise.resolve();
    expect(ready).toBe(false);
    expect(start.mock.calls.map(([name]) => name)).toEqual(["analytics"]);
    analytics.resolve();
    await startup;
    expect(ready).toBe(true);
    expect(start.mock.calls.map(([name]) => name)).toEqual(["analytics", "ping"]);
  });

  test("concurrent worker requests share initialization and do not await job startup", async () => {
    const initialization = pending();
    const ping = pending();
    initialize.mockImplementation(() => initialization.promise);
    start.mockImplementation(() => ping.promise);
    const runtime = createCronJobRuntime();
    const first = runtime.startWorkerAsync();
    const second = runtime.startWorkerAsync();
    expect(first).toBe(second);
    expect(initialize).toHaveBeenCalledTimes(1);
    initialization.resolve();
    await first;
    expect(start.mock.calls.map(([name]) => name)).toEqual(["ping"]);
    ping.resolve();
  });

  test("worker initialization can retry after failure", async () => {
    initialize.mockRejectedValueOnce(new Error("database unavailable"));
    const runtime = createCronJobRuntime();
    await expect(runtime.startWorkerAsync()).rejects.toThrow("database unavailable");
    await runtime.startWorkerAsync();
    expect(initialize).toHaveBeenCalledTimes(2);
    expect(start.mock.calls.map(([name]) => name)).toEqual(["ping"]);
  });

  test("optional worker job failure does not prevent other jobs or readiness", async () => {
    const error = spyOn(console, "error").mockImplementation(() => {});
    start.mockImplementation(async (name) => {
      if (name === "analytics") throw new Error("network unavailable");
    });
    const runtime = createCronJobRuntime();
    await runtime.startWorkerAsync({ runOptionalJobs: true });
    await Promise.resolve();
    expect(start.mock.calls.map(([name]) => name)).toEqual(keys);
    expect(error).toHaveBeenCalledWith("Worker scheduled job failed to start", "analytics");
  });

  test("shutdown during initialization prevents any schedule from starting", async () => {
    const initialization = pending();
    initialize.mockImplementation(() => initialization.promise);
    const runtime = createCronJobRuntime();
    const startup = runtime.startWorkerAsync();
    runtime.stop();
    initialization.resolve();
    await startup;
    await runtime.startWorkerAsync();
    expect(start).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });

  test("shutdown still pauses a job whose network startup completes afterward", async () => {
    const ping = pending();
    start.mockImplementation(() => ping.promise);
    const runtime = createCronJobRuntime();
    await runtime.startWorkerAsync();
    runtime.stop();
    expect(stop).toHaveBeenCalledTimes(1);
    ping.resolve();
    // Job startup owns a resume after its promise settles; allow its finalizer to run.
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(stop).toHaveBeenCalledTimes(2);
  });
});
