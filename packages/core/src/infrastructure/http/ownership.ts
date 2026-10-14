import type { Socket } from "node:net";
import type { Agent } from "node:http";

import type { ResourceHttpAgent } from "./transport-agent";

interface RetirementResources {
  onRetiring: () => void;
  onRetirement: (completion: Promise<void>) => void;
  onReleased: () => void;
}

type CompletionCallback = (error?: Error | null) => void;

const notifyCallback = (completion: Promise<void>, callback: CompletionCallback) => {
  void completion.then(
    () => callback(),
    (error: unknown) =>
      callback(error instanceof Error ? error : new Error("Agent retirement failed", { cause: error })),
  );
};

export const ownDispatcher = (agent: ResourceHttpAgent, graceMs: number, resources: RetirementResources) => {
  const closeTransport = agent.close.bind(agent);
  const destroyTransport = agent.destroy.bind(agent);
  let state:
    | { kind: "live" }
    | { kind: "retiring"; completion: Promise<void>; resolve: () => void; reject: (error: unknown) => void } = {
    kind: "live",
  };
  let destructionStarted = false;
  let settled = false;
  let graceTimer: ReturnType<typeof setTimeout> | undefined;

  const finish = (error?: Error | null) => {
    if (settled || state.kind === "live") return;
    settled = true;
    clearTimeout(graceTimer);
    if (error) state.reject(error);
    else {
      resources.onReleased();
      state.resolve();
    }
  };

  const destroyNow = (error: Error | null) => {
    if (destructionStarted || settled) return;
    destructionStarted = true;
    clearTimeout(graceTimer);
    try {
      destroyTransport(error, finish);
    } catch (failure) {
      finish(failure instanceof Error ? failure : new Error("Agent destruction failed", { cause: failure }));
    }
  };

  const retireAsync = (kind: "graceful" | "immediate", error: Error | null = null) => {
    if (state.kind === "live") {
      const { promise: completion, resolve, reject } = Promise.withResolvers<void>();
      state = { kind: "retiring", completion, resolve, reject };
      resources.onRetirement(completion);
      resources.onRetiring();
      if (kind === "graceful") {
        graceTimer = setTimeout(() => destroyNow(null), graceMs);
        try {
          closeTransport((failure?: Error | null) => (failure ? destroyNow(failure) : finish()));
        } catch (failure) {
          destroyNow(failure instanceof Error ? failure : new Error("Agent close failed", { cause: failure }));
        }
      }
    }
    if (kind === "immediate") destroyNow(error);
    return state.completion;
  };

  function close(callback: () => void): void;
  function close(): Promise<void>;
  function close(callback?: CompletionCallback): Promise<void> | void {
    const completion = retireAsync("graceful");
    if (callback) notifyCallback(completion, callback);
    else return completion;
  }

  function destroy(error: Error | null, callback: () => void): void;
  function destroy(callback: () => void): void;
  function destroy(error: Error | null): Promise<void>;
  function destroy(): Promise<void>;
  function destroy(
    errorOrCallback?: Error | null | CompletionCallback,
    callback?: CompletionCallback,
  ): Promise<void> | void {
    const error = typeof errorOrCallback === "function" ? null : (errorOrCallback ?? null);
    const notify = typeof errorOrCallback === "function" ? errorOrCallback : callback;
    const completion = retireAsync("immediate", error);
    if (notify) notifyCallback(completion, notify);
    else return completion;
  }

  agent.close = close;
  agent.destroy = destroy;
  return {
    closeAsync: () => retireAsync("graceful"),
    destroyAsync: () => retireAsync("immediate"),
    isLive: () => state.kind === "live",
  };
};

export const ownNodeAgent = (
  agent: Pick<Agent, "sockets" | "freeSockets" | "destroy"> & { waitForConnectionsClosedAsync?: () => Promise<void> },
  resources: RetirementResources,
) => {
  const destroyTransport = agent.destroy.bind(agent);
  let completion: Promise<void> | undefined;

  const destroyAsync = () => {
    if (completion) return completion;
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    completion = promise;
    resources.onRetirement(completion);
    resources.onRetiring();
    const sockets = new Set(
      [...Object.values(agent.sockets).flat(), ...Object.values(agent.freeSockets).flat()].filter(
        (socket): socket is Socket => socket !== undefined,
      ),
    );
    const closed = [...sockets].map((socket) =>
      socket.closed ? Promise.resolve() : new Promise<void>((complete) => socket.once("close", complete)),
    );
    const failures: unknown[] = [];
    try {
      destroyTransport();
    } catch (error) {
      failures.push(error);
    }
    try {
      if (agent.waitForConnectionsClosedAsync) closed.push(agent.waitForConnectionsClosedAsync());
    } catch (error) {
      failures.push(error);
    }
    void Promise.allSettled(closed).then((outcomes) => {
      for (const outcome of outcomes) if (outcome.status === "rejected") failures.push(outcome.reason);
      if (failures.length) {
        reject(new AggregateError(failures, "Native HTTP retirement failed"));
        return;
      }
      resources.onReleased();
      resolve();
    }, reject);
    return completion;
  };

  agent.destroy = () => {
    void destroyAsync();
  };
  return { destroyAsync, isLive: () => completion === undefined };
};
