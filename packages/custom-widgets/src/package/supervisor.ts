import { mkdir, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

import type { CustomWidgetArtifact } from "./artifact";
import { getWidgetChildEntrypoint } from "./child-runner";
import { WidgetPackageProcess } from "./package-process";
import { assertWidgetArtifactIntegrity } from "./integrity";
import type { WidgetInvocationContext, WidgetSdkCallback } from "./protocol";

export interface WidgetPackageInvocation extends WidgetInvocationContext {
  artifact: CustomWidgetArtifact;
  handler: string;
  input: unknown;
  signal?: AbortSignal;
  sdk?: WidgetSdkCallback;
}

export interface WidgetPackageSupervisorOptions {
  rootDirectory: string;
  sdk?: WidgetSdkCallback;
  log?(message: string): void;
  maximumProcesses?: number;
}

export class CustomWidgetPackageSupervisor {
  private readonly processes = new Map<string, Promise<WidgetPackageProcess>>();
  private readonly failures = new Map<string, number[]>();
  private readonly recordedFailures = new WeakSet<WidgetPackageProcess>();
  private readonly instanceGenerations = new Map<string, number>();
  private readonly reservations = new Map<string, number>();
  private readonly cleanup: ReturnType<typeof setInterval>;

  public constructor(private readonly options: WidgetPackageSupervisorOptions) {
    this.cleanup = setInterval(() => void this.removeIdle(), 30_000);
    this.cleanup.unref();
  }

  public async invoke(input: WidgetPackageInvocation): Promise<unknown> {
    const descriptor = input.artifact.manifest.handlers[input.handler];
    if (!descriptor || descriptor.kind === "subscription") throw new Error("Unknown query or action handler");
    const generation = this.instanceGenerations.get(input.instanceId) ?? 0;
    const release = this.reserveProcess(input.artifact.digest);
    let worker: WidgetPackageProcess | undefined;
    try {
      worker = await this.getProcess(input.artifact);
      this.assertCurrentInstance(input.instanceId, generation);
      return await worker.invoke({
        ...input,
        kind: descriptor.kind,
        timeoutMs: descriptor.timeoutMs,
        sdk: input.sdk ?? this.options.sdk,
      });
    } catch (error) {
      if (worker?.stopped && !this.recordedFailures.has(worker)) {
        this.recordedFailures.add(worker);
        this.recordFailure(input.artifact.digest);
      }
      throw error;
    } finally {
      release();
    }
  }

  public async preflight(input: { artifact: CustomWidgetArtifact }): Promise<void> {
    assertWidgetArtifactIntegrity(input.artifact);
    if (!input.artifact.server) return;
    const release = this.reserveProcess(input.artifact.digest);
    try {
      await this.getProcess(input.artifact);
    } finally {
      release();
    }
  }

  public async subscribe(
    input: WidgetPackageInvocation & { onData(value: unknown): void; onError(error: Error): void; onComplete?(): void },
  ): Promise<() => void> {
    const descriptor = input.artifact.manifest.handlers[input.handler];
    if (descriptor?.kind !== "subscription") throw new Error("Unknown subscription handler");
    const generation = this.instanceGenerations.get(input.instanceId) ?? 0;
    const release = this.reserveProcess(input.artifact.digest);
    try {
      const worker = await this.getProcess(input.artifact);
      this.assertCurrentInstance(input.instanceId, generation);
      return await worker.subscribe({
        ...input,
        kind: "subscription",
        timeoutMs: descriptor.timeoutMs,
        sdk: input.sdk ?? this.options.sdk,
      });
    } finally {
      release();
    }
  }

  public async disable(digest: string) {
    const pending = this.processes.get(digest);
    this.processes.delete(digest);
    if (pending) (await pending.catch(() => undefined))?.stop();
  }

  public async cancelInstances(instanceIds: string[], options: { actions?: boolean } = {}): Promise<void> {
    for (const id of instanceIds) this.instanceGenerations.set(id, (this.instanceGenerations.get(id) ?? 0) + 1);
    const ids = new Set(instanceIds);
    await Promise.all(
      [...this.processes.values()].map(async (pending) => {
        const worker = await pending.catch(() => undefined);
        worker?.cancelInstances(ids, options);
      }),
    );
  }

  public async retry(digest: string) {
    await this.disable(digest);
    this.failures.delete(digest);
  }

  public resetFailures(digest: string) {
    this.failures.delete(digest);
  }

  public async shutdown(): Promise<void> {
    clearInterval(this.cleanup);
    await Promise.all([...this.processes.keys()].map((digest) => this.disable(digest)));
  }

  private async getProcess(input: CustomWidgetArtifact): Promise<WidgetPackageProcess> {
    const artifact = assertWidgetArtifactIntegrity(input);
    if (!artifact.server) throw new Error("This widget has no server module");
    const existing = this.processes.get(artifact.digest);
    if (existing) {
      const worker = await existing.catch(() => undefined);
      if (this.processes.get(artifact.digest) !== existing) return this.getProcess(artifact);
      if (worker && !worker.stopped) return worker;
      this.processes.delete(artifact.digest);
    }
    const failures = (this.failures.get(artifact.digest) ?? []).filter((time) => Date.now() - time < 60_000);
    if (failures.length >= 3) throw new Error("Widget server repeatedly failed; retry it from widget management");
    if (this.processes.size >= (this.options.maximumProcesses ?? 8)) {
      await this.removeIdle(true);
      // Another caller may have started this artifact while idle eviction yielded.
      if (this.processes.has(artifact.digest)) return this.getProcess(artifact);
      if (this.processes.size >= (this.options.maximumProcesses ?? 8))
        throw new Error("Custom widget server capacity is full");
    }
    const worker = this.startAfterBackoff(artifact, failures.length).catch((error: unknown) => {
      this.recordFailure(artifact.digest);
      throw error;
    });
    this.processes.set(artifact.digest, worker);
    return worker;
  }

  private async startAfterBackoff(artifact: CustomWidgetArtifact, failureCount: number) {
    if (failureCount > 0)
      await new Promise((resolve) => setTimeout(resolve, Math.min(1_000 * 2 ** (failureCount - 1), 10_000)));
    return this.startProcess(artifact);
  }

  private async startProcess(artifact: CustomWidgetArtifact) {
    const directory = join(this.options.rootDirectory, "runtime", artifact.digest);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const runnerPath = join(directory, "runner.cjs");
    const serverPath = join(directory, "server.cjs");
    await this.writeRuntimeFile(runnerPath, getWidgetChildEntrypoint());
    await this.writeRuntimeFile(serverPath, artifact.server ?? "");
    const worker = new WidgetPackageProcess(
      runnerPath,
      serverPath,
      Object.keys(artifact.manifest.handlers),
      this.options.log,
    );
    await worker.waitUntilReady();
    return worker;
  }

  private recordFailure(digest: string) {
    const failures = (this.failures.get(digest) ?? []).filter((time) => Date.now() - time < 60_000);
    failures.push(Date.now());
    this.failures.set(digest, failures);
  }

  private assertCurrentInstance(id: string, generation: number) {
    if ((this.instanceGenerations.get(id) ?? 0) !== generation)
      throw new Error("Widget placement stopped during server startup");
  }

  private async writeRuntimeFile(path: string, content: string) {
    const temporary = `${path}.${randomUUID()}.tmp`;
    await writeFile(temporary, content, { mode: 0o600 });
    await rename(temporary, path);
  }

  /** Reserve before asynchronous startup so eviction cannot overtake an accepted caller. */
  private reserveProcess(digest: string) {
    this.reservations.set(digest, (this.reservations.get(digest) ?? 0) + 1);
    return () => {
      const remaining = (this.reservations.get(digest) ?? 1) - 1;
      if (remaining > 0) this.reservations.set(digest, remaining);
      else this.reservations.delete(digest);
    };
  }

  private async removeIdle(force = false) {
    for (const [digest, pending] of this.processes) {
      if (this.reservations.has(digest)) continue;
      const worker = await pending.catch(() => undefined);
      if (this.processes.get(digest) !== pending || this.reservations.has(digest)) continue;
      if (!worker || worker.stopped || (worker.activeCount === 0 && (force || Date.now() - worker.lastUsed > 60_000))) {
        this.processes.delete(digest);
        worker?.stop();
        if (force) return;
      }
    }
  }
}
