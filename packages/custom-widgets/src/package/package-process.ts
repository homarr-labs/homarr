import { fork } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";

import type { WidgetChildMessage, WidgetHostMessage, WidgetInvocationContext, WidgetSdkCallback } from "./protocol";

export interface WidgetProcessInvocation extends WidgetInvocationContext {
  handler: string;
  kind: string;
  input: unknown;
  timeoutMs: number;
  signal?: AbortSignal;
  sdk?: WidgetSdkCallback;
  onData?(value: unknown): void;
  onError?(error: Error): void;
  onComplete?(): void;
}

interface PendingInvocation {
  input: WidgetProcessInvocation;
  resolve(value: unknown): void;
  reject(error: Error): void;
  dispose(): void;
  cancelled: boolean;
  controller: AbortController;
}

export class WidgetPackageProcess {
  private readonly child: ChildProcess;
  private readonly pending = new Map<string, PendingInvocation>();
  private heartbeatAt = Date.now();
  private readonly heartbeat: ReturnType<typeof setInterval>;
  private readyResolve!: () => void;
  private readyReject!: (error: Error) => void;
  private readonly ready: Promise<void>;
  private dead = false;
  private reservations = 0;
  private queued = 0;
  private readonly instanceGenerations = new Map<string, number>();
  public lastUsed = Date.now();

  public constructor(runnerPath: string, serverPath: string, handlers: string[], log?: (message: string) => void) {
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    this.child = fork(runnerPath, [serverPath], {
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      serialization: "advanced",
      execArgv: ["--max-old-space-size=256"],
      env: { ...process.env },
    });
    const startupTimeout = setTimeout(() => this.fail(new Error("Widget server startup exceeded 15 seconds")), 15_000);
    void this.ready.finally(() => clearTimeout(startupTimeout)).catch(() => undefined);
    const output = (chunk: Buffer) => log?.(chunk.toString().slice(0, 16_384));
    this.child.stdout?.on("data", output);
    this.child.stderr?.on("data", output);
    this.child.on("message", (message: WidgetChildMessage) => {
      if (message.type === "ready") {
        const missing = handlers.filter((handler) => !message.handlers.includes(handler));
        if (missing.length) this.fail(new Error(`Server does not export declared handlers: ${missing.join(", ")}`));
        else this.readyResolve();
      } else void this.receive(message);
    });
    this.child.on("error", (error) => this.fail(error));
    this.child.on("exit", (code, signal) => this.fail(new Error(`Widget server stopped (${signal ?? code})`)));
    this.heartbeat = setInterval(() => {
      if (Date.now() - this.heartbeatAt > 10_000) this.fail(new Error("Widget server stopped responding"));
    }, 2_000);
    this.heartbeat.unref();
  }

  public get activeCount() {
    return this.pending.size + this.reservations + this.queued;
  }
  public get stopped() {
    return this.dead;
  }
  public inspect() {
    let state: "running" | "stopped" = "running";
    if (this.dead) state = "stopped";
    return {
      state,
      pid: this.child.pid ?? null,
      activeRequests: this.pending.size,
      queuedRequests: this.queued,
      lastUsed: this.lastUsed,
    };
  }
  public waitUntilReady() {
    return this.ready;
  }

  public async invoke(input: WidgetProcessInvocation): Promise<unknown> {
    const generation = this.instanceGenerations.get(input.instanceId) ?? 0;
    await this.ready;
    await this.waitForCapacity(input.signal);
    this.assertCurrentGeneration(input, generation);
    return new Promise((resolve, reject) => {
      this.begin(input, resolve, reject);
    });
  }

  public async subscribe(input: WidgetProcessInvocation): Promise<() => void> {
    const generation = this.instanceGenerations.get(input.instanceId) ?? 0;
    await this.ready;
    await this.waitForCapacity(input.signal);
    this.assertCurrentGeneration(input, generation);
    const id = this.begin(
      input,
      () => input.onComplete?.(),
      (error) => input.onError?.(error),
    );
    return () => this.cancel(id, new Error("Subscription closed"), false);
  }

  public stop() {
    this.fail(new Error("Widget server disabled"));
  }

  public cancelInstances(instanceIds: ReadonlySet<string>, options: { actions?: boolean } = {}) {
    for (const id of instanceIds) this.instanceGenerations.set(id, (this.instanceGenerations.get(id) ?? 0) + 1);
    for (const [id, invocation] of this.pending) {
      if (!instanceIds.has(invocation.input.instanceId)) continue;
      if (options.actions === false && ["action", "migration"].includes(invocation.input.kind)) continue;
      this.cancel(id, new Error("Widget placement was stopped"));
    }
  }

  private assertCurrentGeneration(input: WidgetProcessInvocation, generation: number) {
    if ((this.instanceGenerations.get(input.instanceId) ?? 0) === generation) return;
    this.reservations -= 1;
    throw new Error("Widget placement was stopped while waiting for server capacity");
  }

  private async waitForCapacity(signal?: AbortSignal) {
    if (this.queued >= 64) throw Object.assign(new Error("Widget server queue is full"), { code: "TOO_MANY_REQUESTS" });
    this.queued += 1;
    const startedAt = Date.now();
    try {
      while (this.pending.size + this.reservations >= 8) {
        signal?.throwIfAborted();
        if (this.dead) throw new Error("Widget server is unavailable");
        if (Date.now() - startedAt > 30_000) throw new Error("Widget server queue wait exceeded 30 seconds");
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      signal?.throwIfAborted();
      if (this.dead) throw new Error("Widget invocation unavailable");
      this.reservations += 1;
    } finally {
      this.queued -= 1;
    }
  }

  private begin(
    input: WidgetProcessInvocation,
    resolve: PendingInvocation["resolve"],
    reject: PendingInvocation["reject"],
  ) {
    const id = randomUUID();
    this.reservations -= 1;
    if (this.dead || input.signal?.aborted) {
      reject(
        input.signal?.reason instanceof Error ? input.signal.reason : new Error("Widget server invocation unavailable"),
      );
      return id;
    }
    this.lastUsed = Date.now();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (input.kind !== "subscription")
      timeout = setTimeout(() => this.cancel(id, new Error("Widget handler exceeded its deadline")), input.timeoutMs);
    const abort = () =>
      this.cancel(
        id,
        input.signal?.reason instanceof Error ? input.signal.reason : new Error("Widget invocation cancelled"),
      );
    const controller = new AbortController();
    input.signal?.addEventListener("abort", abort, { once: true });
    this.pending.set(id, {
      input,
      resolve,
      reject,
      cancelled: false,
      controller,
      dispose: () => {
        controller.abort();
        clearTimeout(timeout);
        input.signal?.removeEventListener("abort", abort);
      },
    });
    this.send({
      type: "invoke",
      id,
      handler: input.handler,
      kind: input.kind,
      input: input.input,
      context: { instanceId: input.instanceId, boardId: input.boardId, userId: input.userId },
    });
    return id;
  }

  private cancel(id: string, error: Error, notify = true) {
    const request = this.pending.get(id);
    if (!request) return;
    if (request.cancelled) return;
    request.cancelled = true;
    request.dispose();
    if (notify) request.reject(error);
    // Keep capacity reserved until the child acknowledges cancellation or is terminated.
    request.resolve = () => undefined;
    request.reject = () => undefined;
    this.send({ type: "cancel", id });
    const grace = setTimeout(() => {
      if (this.pending.has(id)) this.fail(new Error("Widget ignored cancellation"));
    }, 2_000);
    grace.unref();
  }

  private async receive(message: Exclude<WidgetChildMessage, { type: "ready" }>) {
    this.heartbeatAt = Date.now();
    if (message.type === "heartbeat") return;
    if (message.type === "fatal") {
      this.fail(new Error(message.error));
      return;
    }
    if (message.type === "sdk") {
      const invocation = this.pending.get(message.invocationId);
      if (!invocation?.input.sdk || invocation.cancelled) {
        this.send({ type: "sdk-result", id: message.id, error: "Widget SDK invocation unavailable" });
        return;
      }
      try {
        const input = invocation.input;
        const value = await input.sdk?.({
          operation: message.operation,
          input: message.input,
          signal: invocation.controller.signal,
          context: { instanceId: input.instanceId, boardId: input.boardId, userId: input.userId },
        });
        this.send({ type: "sdk-result", id: message.id, value });
      } catch (error) {
        this.send({
          type: "sdk-result",
          id: message.id,
          error: error instanceof Error ? error.message : "Widget SDK call failed",
          errorCode:
            error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : undefined,
        });
      }
      return;
    }
    const invocation = this.pending.get(message.id);
    if (!invocation) return;
    if (message.type === "event") {
      if (invocation.cancelled) return;
      try {
        invocation.input.onData?.(message.value);
      } catch (error) {
        this.cancel(message.id, error instanceof Error ? error : new Error("Subscription consumer failed"));
      }
      return;
    }
    this.pending.delete(message.id);
    invocation.dispose();
    this.lastUsed = Date.now();
    if (message.error) invocation.reject(Object.assign(new Error(message.error), { code: message.errorCode }));
    else invocation.resolve(message.value);
  }

  private send(message: WidgetHostMessage) {
    if (this.dead || !this.child.connected) return;
    try {
      if (Buffer.byteLength(JSON.stringify(message), "utf8") > 8 * 1024 * 1024)
        throw new Error("Widget IPC payload exceeds 8 MiB");
      this.child.send(message, (error) => {
        if (error) this.fail(error);
      });
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error("Widget IPC send failed"));
    }
  }

  private fail(error: Error) {
    if (this.dead) return;
    this.dead = true;
    clearInterval(this.heartbeat);
    this.readyReject(error);
    for (const invocation of this.pending.values()) {
      invocation.dispose();
      invocation.reject(error);
    }
    this.pending.clear();
    this.child.kill("SIGKILL");
  }
}
