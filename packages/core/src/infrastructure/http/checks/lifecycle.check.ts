import assert from "node:assert/strict";
import type { AgentOptions } from "node:https";
import { Response } from "undici/index.js";

import { ResourceHttpsAgent } from "../https-agent";
import { createCertificateHttpRuntime } from "../runtime";
import type { CertificateHttpResources } from "../runtime";
import { ResourceHttpAgent } from "../transport-agent";
import type { HttpAgentOptions } from "../transport-agent";

const deferred = <T>() => {
  const { promise, resolve } = Promise.withResolvers<T>();
  return { promise, resolve };
};

const withinAsync = async <T>(operation: Promise<T>, milliseconds = 150) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Disposable lifecycle deadline exceeded")), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

type CompletionCallback = (error?: Error | null) => void;

class DeferredAgent extends ResourceHttpAgent {
  readonly closeGate = deferred<void>();
  readonly destroyGate = deferred<void>();
  closeStarted = false;
  destroyStarted = false;
  closeCalls = 0;
  destroyCalls = 0;

  constructor(options: HttpAgentOptions, deferDestroy = false) {
    super(options);
    if (!deferDestroy) this.destroyGate.resolve();
  }

  close(callback: () => void): void;
  close(): Promise<void>;
  close(callback?: CompletionCallback): Promise<void> | void {
    this.closeStarted = true;
    this.closeCalls++;
    const operation = this.closeGate.promise.then(
      () =>
        new Promise<void>((resolve, reject) => {
          super.close((error?: Error | null) => (error ? reject(error) : resolve()));
        }),
    );
    if (!callback) return operation;
    void operation.then(
      () => callback(),
      (error: unknown) =>
        callback(error instanceof Error ? error : new Error("Deferred close failed", { cause: error })),
    );
  }

  destroy(error: Error | null, callback: () => void): void;
  destroy(callback: () => void): void;
  destroy(error: Error | null): Promise<void>;
  destroy(): Promise<void>;
  destroy(errorOrCallback?: Error | null | CompletionCallback, callback?: CompletionCallback): Promise<void> | void {
    this.destroyStarted = true;
    this.destroyCalls++;
    const error = typeof errorOrCallback === "function" ? null : (errorOrCallback ?? null);
    const completion = typeof errorOrCallback === "function" ? errorOrCallback : callback;
    const operation = this.destroyGate.promise.then(
      () =>
        new Promise<void>((resolve, reject) => {
          super.destroy(error, (failure?: Error | null) => (failure ? reject(failure) : resolve()));
        }),
    );
    if (!completion) return operation;
    void operation.then(
      () => completion(),
      (failure: unknown) =>
        completion(failure instanceof Error ? failure : new Error("Deferred destruction failed", { cause: failure })),
    );
  }
}

const resources = (overrides: Partial<CertificateHttpResources> = {}): CertificateHttpResources => ({
  readTrustMaterialAsync: async () => ({ ca: [], trustedHostnames: [], version: "disposable-material" }),
  fetch: async () => new Response("fixture"),
  proxy: { httpProxy: "", httpsProxy: "", noProxy: "*" },
  retirementGraceMs: 5,
  ...overrides,
});

const cleanupAsync = async (
  runtime: ReturnType<typeof createCertificateHttpRuntime>,
  agents: DeferredAgent[],
  operations: Promise<unknown>[] = [],
) => {
  for (const agent of agents) {
    agent.closeGate.resolve();
    agent.destroyGate.resolve();
  }
  await Promise.allSettled(operations);
  await runtime.disposeAsync();
  await Promise.allSettled(agents.map((agent) => agent.destroy()));
};

const cases: Record<string, () => Promise<void>> = {
  eviction: async () => {
    const agents: DeferredAgent[] = [];
    const runtime = createCertificateHttpRuntime(
      resources({
        createDispatcher: (options) => {
          const agent = new DeferredAgent(options);
          agents.push(agent);
          return agent;
        },
        fetch: async (_url, options) => {
          if (agents.length <= 8) return new Response("fixture");
          const signal = options?.signal;
          assert.ok(signal);
          signal.throwIfAborted();
          return new Promise<never>((_resolve, reject) =>
            signal.addEventListener("abort", () => reject(signal.reason), { once: true }),
          );
        },
      }),
    );
    const operations: Promise<unknown>[] = [];
    try {
      for (let key = 0; key < 8; key++)
        await runtime.fetchWithTrustedCertificatesAsync("https://fixture.invalid/", { bodyTimeout: key });
      const ninth = runtime.fetchWithTrustedCertificatesAsync("https://fixture.invalid/", {
        bodyTimeout: 9,
        timeout: 15,
      });
      operations.push(ninth);
      await withinAsync(
        assert.rejects(ninth, (error: unknown) => error instanceof Error && error.name === "AbortError"),
      );
      assert.equal(
        agents.length,
        9,
        "The ninth request must enter injected Fetch without waiting for the old SSE to close",
      );
      assert.ok(agents[0]?.destroyStarted, "Grace expiration must force destruction");
    } finally {
      await cleanupAsync(runtime, agents, operations);
    }
  },
  capacity: async () => {
    const agents: DeferredAgent[] = [];
    const keys: number[] = [];
    let maximumLive = 0;
    const runtime = createCertificateHttpRuntime(
      resources({
        createDispatcher: (options) => {
          const agent = new DeferredAgent(options);
          agents.push(agent);
          keys.push(options.bodyTimeout ?? -1);
          maximumLive = Math.max(
            maximumLive,
            agents.filter((value) => !value.closeStarted && !value.destroyStarted).length,
          );
          return agent;
        },
      }),
    );
    const operations: Promise<unknown>[] = [];
    try {
      for (let key = 0; key < 8; key++)
        await runtime.fetchWithTrustedCertificatesAsync("https://fixture.invalid/", { bodyTimeout: key });
      for (const key of [9, 9, 10, 11, 12, 13, 14, 15, 16]) {
        operations.push(runtime.fetchWithTrustedCertificatesAsync("https://fixture.invalid/", { bodyTimeout: key }));
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      for (const agent of agents) agent.closeGate.resolve();
      await withinAsync(Promise.all(operations));
      assert.ok(maximumLive <= 8, `Active cache grew to ${maximumLive} configurations`);
      assert.equal(
        keys.filter((key) => key === 9).length,
        1,
        "Concurrent requests for the same key must coalesce without overwriting an owned dispatcher",
      );
    } finally {
      await cleanupAsync(runtime, agents, operations);
    }
  },
  disposal: async () => {
    const agents: DeferredAgent[] = [];
    const runtime = createCertificateHttpRuntime(
      resources({
        createDispatcher: (options) => {
          const agent = new DeferredAgent(options, true);
          agents.push(agent);
          return agent;
        },
      }),
    );
    const operations: Promise<unknown>[] = [];
    try {
      await runtime.createCertificateAgentAsync();
      const invalidation = runtime.invalidateAsync();
      operations.push(invalidation);
      let disposed = false;
      const disposal = runtime.disposeAsync().then(() => {
        disposed = true;
      });
      operations.push(disposal);
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      assert.equal(disposed, false, "Shutdown must join destruction already started by invalidation");
      for (const agent of agents) agent.destroyGate.resolve();
      await withinAsync(Promise.all(operations));
      assert.ok(disposed);
    } finally {
      await cleanupAsync(runtime, agents, operations);
    }
  },
  release: async () => {
    let dispatcherDestructions = 0;
    let httpsDestructions = 0;
    class CountingDispatcher extends ResourceHttpAgent {
      destroy(error: Error | null, callback: () => void): void;
      destroy(callback: () => void): void;
      destroy(error: Error | null): Promise<void>;
      destroy(): Promise<void>;
      destroy(errorOrCallback?: Error | null | (() => void), callback?: () => void): void | Promise<void> {
        dispatcherDestructions++;
        if (typeof errorOrCallback === "function") return super.destroy(errorOrCallback);
        if (callback) return super.destroy(errorOrCallback ?? null, callback);
        return super.destroy(errorOrCallback ?? null);
      }
    }
    class CountingHttps extends ResourceHttpsAgent {
      destroy() {
        httpsDestructions++;
        super.destroy();
      }
    }
    const runtime = createCertificateHttpRuntime(
      resources({
        createDispatcher: (options) => new CountingDispatcher(options),
        createHttpsAgent: (options: AgentOptions) => new CountingHttps(options),
      }),
    );
    try {
      const dispatcher = await runtime.createCertificateAgentAsync();
      const https = await runtime.createHttpsAgentAsync();
      await dispatcher.close();
      https.destroy();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const previousDispatcherCount = dispatcherDestructions;
      const previousHttpsCount = httpsDestructions;
      await runtime.invalidateAsync();
      assert.equal(
        dispatcherDestructions,
        previousDispatcherCount,
        "Caller-closed dispatchers must no longer be owned",
      );
      assert.equal(httpsDestructions, previousHttpsCount, "Caller-destroyed HTTPS agents must no longer be owned");
    } finally {
      await runtime.disposeAsync();
    }
  },
  "abort-wait": async () => {
    const material = deferred<Awaited<ReturnType<CertificateHttpResources["readTrustMaterialAsync"]>>>();
    let fetchCalls = 0;
    const runtime = createCertificateHttpRuntime(
      resources({
        readTrustMaterialAsync: () => material.promise,
        fetch: async () => {
          fetchCalls++;
          return new Response("fixture");
        },
      }),
    );
    try {
      await withinAsync(
        assert.rejects(
          runtime.fetchWithTrustedCertificatesAsync("https://fixture.invalid/", { timeout: 15 }),
          (error: unknown) => error instanceof Error && error.name === "AbortError",
        ),
      );
      const controller = new AbortController();
      const request = runtime.fetchWithTrustedCertificatesAsync("https://fixture.invalid/", {
        signal: controller.signal,
      });
      controller.abort();
      await withinAsync(
        assert.rejects(request, (error: unknown) => error instanceof Error && error.name === "AbortError"),
      );
      assert.equal(fetchCalls, 0, "Cancelled material wait must not proceed to Fetch");
    } finally {
      await runtime.disposeAsync();
      material.resolve({ ca: [], trustedHostnames: [], version: "late-disposable-material" });
    }
  },
  "failure-honesty": async () => {
    let failureCalls = 0;
    class FailedAgent extends ResourceHttpAgent {
      destroy(error: Error | null, callback: () => void): void;
      destroy(callback: () => void): void;
      destroy(error: Error | null): Promise<void>;
      destroy(): Promise<void>;
      destroy(
        errorOrCallback?: Error | null | CompletionCallback,
        callback?: CompletionCallback,
      ): Promise<void> | void {
        failureCalls++;
        const failure = new Error("Disposable destruction failure");
        const notify = typeof errorOrCallback === "function" ? errorOrCallback : callback;
        if (notify) {
          queueMicrotask(() => notify(failure));
          return;
        }
        return Promise.reject(failure);
      }

      cleanupNativeAsync() {
        return new Promise<void>((resolve, reject) =>
          super.destroy(null, (error?: Error | null) => (error ? reject(error) : resolve())),
        );
      }
    }
    let failedAgent: FailedAgent | undefined;
    let delayedAgent: DeferredAgent | undefined;
    let nativeWaitCalls = 0;
    class FailedNativeAgent extends ResourceHttpsAgent {
      async waitForConnectionsClosedAsync() {
        nativeWaitCalls++;
        await super.waitForConnectionsClosedAsync();
        throw new Error("Disposable native close failure");
      }
    }
    const runtime = createCertificateHttpRuntime(
      resources({
        createHttpsAgent: (options) => new FailedNativeAgent(options),
        createDispatcher: (options) => {
          if (!failedAgent) {
            failedAgent = new FailedAgent(options);
            return failedAgent;
          }
          delayedAgent = new DeferredAgent(options, true);
          return delayedAgent;
        },
      }),
    );
    try {
      await runtime.createCertificateAgentAsync();
      await runtime.createCertificateAgentAsync();
      await runtime.createHttpsAgentAsync();
      const disposal = runtime.disposeAsync();
      let reported = false;
      const outcome = disposal.then(
        () => {
          reported = true;
          return "unexpected success";
        },
        (error: unknown) => {
          reported = true;
          return error;
        },
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      assert.equal(reported, false, "A failing retirement must not skip awaiting another owned destruction");
      assert.ok(delayedAgent);
      delayedAgent.destroyGate.resolve();
      const error = await withinAsync(outcome);
      assert.ok(error instanceof AggregateError);
      assert.ok(
        error.errors.some(
          (failure: unknown) => failure instanceof Error && failure.message === "Disposable destruction failure",
        ),
      );
      assert.strictEqual(
        runtime.disposeAsync(),
        disposal,
        "Repeated disposal must not turn a failed shutdown into success",
      );
      assert.ok(
        error.errors.some(
          (failure: unknown) =>
            failure instanceof AggregateError &&
            failure.errors.some(
              (cause: unknown) => cause instanceof Error && cause.message === "Disposable native close failure",
            ),
        ),
      );
      await assert.rejects(runtime.disposeAsync(), AggregateError);
      assert.equal(failureCalls, 1, "Already-running or failed retirement must not launch duplicate destruction");
      assert.equal(nativeWaitCalls, 1, "Failed native close must remain rejected and joined only once");
    } finally {
      delayedAgent?.closeGate.resolve();
      delayedAgent?.destroyGate.resolve();
      await failedAgent?.cleanupNativeAsync();
      await delayedAgent?.destroy();
      await assert.rejects(runtime.disposeAsync(), AggregateError);
    }
  },
};

const selected = process.argv[2];
let passed = 0;
const failures: unknown[] = [];
for (const [name, check] of Object.entries(cases)) {
  if (selected && selected !== name) continue;
  try {
    await check();
    passed++;
    console.log(`PASS: lifecycle ${name}`);
  } catch (error) {
    failures.push(error);
    console.error(`FAIL: lifecycle ${name}`, error);
  }
}
if (failures.length) throw new AggregateError(failures, `${failures.length} lifecycle regressions failed`);
assert.ok(passed > 0, "No lifecycle check selected");
console.log(`PASS: ${passed} public lifecycle regressions`);
