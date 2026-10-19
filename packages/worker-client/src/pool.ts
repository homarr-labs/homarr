import type { ConnectionInput, SavedWorker, WorkerConnection } from "./connection";
import { matchingSavedWorker, openWorker } from "./connection";
import { forgetWorker, readWorkers, sameWorkerPin, saveWorker } from "./vault";

export interface WorkerVault {
  list(): Promise<SavedWorker[]>;
  save(worker: SavedWorker): Promise<void>;
  forget(workerId: string): Promise<void>;
}

export interface WorkerPoolEntry {
  readonly worker: SavedWorker;
  readonly connected: boolean;
  readonly error?: string;
}

export interface WorkerPoolSnapshot {
  readonly revision: number;
  readonly primaryWorkerId: string | null;
  /** Identity, grant and channel epoch isolate React Query caches after reconnects. */
  readonly primaryScope: string;
  readonly workers: readonly WorkerPoolEntry[];
}

interface PoolOptions {
  /** Expose and connect only one worker; keep other saved credentials untouched. */
  singleWorker?: boolean;
  vault?: WorkerVault;
  open?: typeof openWorker;
}

const primaryStorageKey = "homarr-primary-worker-v1";

function rememberedPrimary(): string | null {
  try {
    return window.localStorage.getItem(primaryStorageKey);
  } catch {
    return null;
  }
}

function rememberPrimary(workerId: string | null, keepEmpty = false): void {
  try {
    if (workerId) window.localStorage.setItem(primaryStorageKey, workerId);
    else if (keepEmpty) window.localStorage.setItem(primaryStorageKey, "");
    else window.localStorage.removeItem(primaryStorageKey);
  } catch {
    /* Browsers may disable nonessential preference storage. */
  }
}

/** Several private channels can be live; a single primary owns the current dashboard. */
export class WorkerConnectionPool {
  private readonly singleWorker: boolean;
  private singleAttempt = 0;
  private vaultWrite: Promise<void> = Promise.resolve();
  private readonly rememberedWorkers = new Map<string, SavedWorker>();
  private readonly vault: WorkerVault;
  private readonly open: typeof openWorker;
  private readonly workers = new Map<string, SavedWorker>();
  private readonly connections = new Map<string, { connection: WorkerConnection; epoch: number }>();
  private readonly generations = new Map<string, number>();
  private readonly pendingPins = new Map<string, JsonWebKey>();
  private readonly errors = new Map<string, string>();
  private readonly listeners = new Set<() => void>();
  private hydration: Promise<void> | undefined;
  private primaryWorkerId: string | null = null;
  private snapshot: WorkerPoolSnapshot = { revision: 0, primaryWorkerId: null, primaryScope: "none", workers: [] };

  constructor(options: PoolOptions = {}) {
    this.singleWorker = options.singleWorker ?? false;
    this.vault = options.vault ?? { list: readWorkers<SavedWorker>, save: saveWorker, forget: forgetWorker };
    this.open = options.open ?? openWorker;
  }

  getSnapshot = (): WorkerPoolSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  hydrate(): Promise<void> {
    this.hydration ??= this.vault
      .list()
      .then((workers) => {
        for (const worker of workers) this.rememberedWorkers.set(worker.workerId, worker);
        const preferred = rememberedPrimary();
        let visibleWorkers = workers;
        if (this.singleWorker) {
          const primary = workers.find((worker) => worker.workerId === preferred) ?? workers[0];
          visibleWorkers = [];
          if (primary && preferred !== "") visibleWorkers.push(primary);
        }
        for (const worker of visibleWorkers) this.workers.set(worker.workerId, worker);
        if (preferred && this.workers.has(preferred)) this.primaryWorkerId = preferred;
        else this.primaryWorkerId = visibleWorkers[0]?.workerId ?? null;
        this.publish();
      })
      .catch((error: unknown) => {
        this.hydration = undefined;
        throw error;
      });
    return this.hydration;
  }

  getWorker(workerId = this.primaryWorkerId): SavedWorker | undefined {
    if (!workerId) return undefined;
    return this.workers.get(workerId);
  }

  getConnection(workerId = this.primaryWorkerId): WorkerConnection {
    if (!workerId) throw new Error("Select a worker first.");
    const active = this.connections.get(workerId);
    if (!active) throw new Error("This worker is offline. Reconnect it before continuing.");
    return active.connection;
  }

  setPrimary(workerId: string): void {
    if (!this.workers.has(workerId)) throw new Error("This worker has not been connected in this browser.");
    this.primaryWorkerId = workerId;
    rememberPrimary(workerId);
    this.publish();
  }

  async restore(workerId: string): Promise<SavedWorker> {
    const attempt = this.singleAttempt;
    await this.hydrate();
    this.assertSingleAttempt(attempt);
    const worker = this.workers.get(workerId);
    if (!worker) throw new Error("This browser has no saved access for that worker.");
    if (this.connections.has(workerId)) return worker;
    return this.connectInput(worker);
  }

  async connectInput(input: ConnectionInput): Promise<SavedWorker> {
    let attempt = this.singleAttempt;
    if (this.singleWorker) attempt = ++this.singleAttempt;
    await this.hydrate();
    this.assertSingleAttempt(attempt);
    let previous = this.workers.get(input.workerId);
    if (this.singleWorker) previous = this.rememberedWorkers.get(input.workerId) ?? previous;
    const existingPin = previous?.pinnedIdentity ?? this.pendingPins.get(input.workerId);
    if (existingPin && !sameWorkerPin(existingPin, input.pinnedIdentity))
      throw new Error("The worker identity changed. Remove the saved worker only after verifying its new identity.");
    let connectionInput = input;
    if (
      this.singleWorker &&
      (input.credential.kind === "claim" || input.credential.kind === "invite" || input.credential.kind === "grant")
    ) {
      const saved = matchingSavedWorker([...this.rememberedWorkers.values()], input);
      if (saved) connectionInput = { ...input, credential: saved.credential, deviceIdentity: saved.deviceIdentity };
    }
    const epoch = this.nextGeneration(input.workerId);
    this.pendingPins.set(input.workerId, input.pinnedIdentity);
    let result: Awaited<ReturnType<typeof openWorker>> | undefined;
    let closedDuringConnect = false;
    try {
      result = await this.open(
        { ...connectionInput, deviceIdentity: connectionInput.deviceIdentity ?? previous?.deviceIdentity },
        () => {
          closedDuringConnect = true;
          if (this.connections.get(input.workerId)?.epoch !== epoch) return;
          this.connections.delete(input.workerId);
          this.errors.set(input.workerId, "Connection closed. Reconnect this worker.");
          this.publish();
        },
      );
      this.assertAttempt(input.workerId, epoch);
      this.assertSingleAttempt(attempt);
      if (closedDuringConnect) throw new Error("The worker connection closed during setup. Please reconnect.");
      if (
        result.worker.workerId !== input.workerId ||
        !sameWorkerPin(result.worker.pinnedIdentity, input.pinnedIdentity)
      )
        throw new Error("The connected worker identity does not match the selected worker.");
      // Sharing links stay in this tab. They must never replace a remembered owner's access.
      if (input.credential.kind !== "share") {
        const worker = result.worker;
        const save = async () => {
          this.assertAttempt(input.workerId, epoch);
          this.assertSingleAttempt(attempt);
          await this.vault.save(worker);
        };
        if (this.singleWorker) {
          const write = this.vaultWrite.then(save);
          this.vaultWrite = write.catch(() => {});
          await write;
        } else await save();
      }
      this.assertAttempt(input.workerId, epoch);
      this.assertSingleAttempt(attempt);
      if (closedDuringConnect) throw new Error("The worker connection closed during setup. Please reconnect.");
      if (input.credential.kind !== "share") this.rememberedWorkers.set(input.workerId, result.worker);
      const previousConnection = this.connections.get(input.workerId);
      const replacedConnections: WorkerConnection[] = [];
      if (this.singleWorker) {
        for (const active of this.connections.values()) replacedConnections.push(active.connection);
        this.connections.clear();
        this.workers.clear();
        this.errors.clear();
        this.primaryWorkerId = input.workerId;
      }
      this.connections.set(input.workerId, { connection: result.connection, epoch });
      this.workers.set(input.workerId, result.worker);
      this.errors.delete(input.workerId);
      if (this.singleWorker) {
        for (const connection of replacedConnections) connection.close();
      } else previousConnection?.connection.close();
      if (!this.primaryWorkerId) this.primaryWorkerId = input.workerId;
      rememberPrimary(this.primaryWorkerId);
      this.publish();
      return result.worker;
    } catch (error) {
      result?.connection.close();
      if (this.generations.get(input.workerId) === epoch && (!this.singleWorker || this.singleAttempt === attempt)) {
        this.errors.set(input.workerId, error instanceof Error ? error.message : "Unable to connect this worker.");
        this.publish();
      }
      throw error;
    } finally {
      if (this.generations.get(input.workerId) === epoch) this.pendingPins.delete(input.workerId);
    }
  }

  disconnect(workerId: string): void {
    if (this.singleWorker) this.singleAttempt++;
    this.nextGeneration(workerId);
    this.pendingPins.delete(workerId);
    const active = this.connections.get(workerId);
    this.connections.delete(workerId);
    active?.connection.close();
    this.publish();
  }

  async forget(workerId: string): Promise<void> {
    this.disconnect(workerId);
    if (this.singleWorker) {
      const write = this.vaultWrite.then(() => this.vault.forget(workerId));
      this.vaultWrite = write.catch(() => {});
      await write;
    } else await this.vault.forget(workerId);
    this.workers.delete(workerId);
    this.rememberedWorkers.delete(workerId);
    this.errors.delete(workerId);
    if (this.primaryWorkerId === workerId) {
      this.primaryWorkerId = this.workers.keys().next().value ?? null;
      rememberPrimary(this.primaryWorkerId, this.singleWorker);
    }
    this.publish();
  }

  close(): void {
    if (this.singleWorker) this.singleAttempt++;
    for (const workerId of new Set([...this.connections.keys(), ...this.pendingPins.keys()])) this.disconnect(workerId);
  }

  private assertSingleAttempt(attempt: number): void {
    if (this.singleWorker && this.singleAttempt !== attempt) throw new Error("This connection attempt was cancelled.");
  }

  private nextGeneration(workerId: string): number {
    const epoch = (this.generations.get(workerId) ?? 0) + 1;
    this.generations.set(workerId, epoch);
    return epoch;
  }

  private assertAttempt(workerId: string, epoch: number): void {
    if (this.generations.get(workerId) !== epoch) throw new Error("This connection attempt was cancelled.");
  }

  private publish(): void {
    let primaryScope = "none";
    const primary = this.getWorker();
    if (primary) {
      const epoch = this.connections.get(primary.workerId)?.epoch ?? this.generations.get(primary.workerId) ?? 0;
      let status = "offline";
      if (this.connections.has(primary.workerId)) status = "connected";
      primaryScope = `${primary.workerId}:${primary.grant.id}:${epoch}:${status}`;
    }
    this.snapshot = {
      revision: this.snapshot.revision + 1,
      primaryWorkerId: this.primaryWorkerId,
      primaryScope,
      workers: [...this.workers.values()].map((worker) => ({
        worker,
        connected: this.connections.has(worker.workerId),
        error: this.errors.get(worker.workerId),
      })),
    };
    for (const listener of this.listeners) listener();
  }
}
