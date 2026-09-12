import type { PackageLanguageMethod, PackageLanguageMethods, PackageLanguageResponse } from "./types";

interface PendingRequest {
  revision: number;
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

export class PackageLanguageClient {
  private readonly worker: Worker;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly listeners = new Set<() => void>();
  private files: Record<string, string> = {};
  private id = 0;
  private revision = 0;
  private disposed = false;
  private failure: Error | undefined;
  private queuedChanges: Record<string, string | null> = {};
  private flushTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.worker = new Worker("/__widget-editor/worker.js", { type: "module", name: "homarr-widget-typescript" });
    this.worker.addEventListener("message", (event: MessageEvent<PackageLanguageResponse>) => {
      const response = event.data;
      const pending = this.pending.get(response.id);
      if (!pending) return;
      this.pending.delete(response.id);
      clearTimeout(pending.timer);
      if (pending.revision !== this.revision || response.revision !== pending.revision) {
        pending.reject(new DOMException("The editor document changed", "AbortError"));
        return;
      }
      if ("error" in response) pending.reject(new Error(response.error));
      else pending.resolve(response.value);
    });
    this.worker.addEventListener("error", () => {
      this.failure = new Error(
        "The local TypeScript worker could not start. Reopen the editor after rebuilding its assets.",
      );
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(this.failure);
      }
      this.pending.clear();
    });
  }

  update(files: Record<string, string>) {
    if (this.disposed) return;
    let changed = false;
    for (const path of new Set([...Object.keys(files), ...Object.keys(this.files)])) {
      if (files[path] === this.files[path]) continue;
      this.queuedChanges[path] = files[path] ?? null;
      changed = true;
    }
    if (!changed) return;
    this.files = files;
    this.revision += 1;
    clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), 120);
    for (const listener of this.listeners) listener();
  }

  private flush() {
    clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    if (!Object.keys(this.queuedChanges).length || this.disposed) return;
    this.worker.postMessage({ method: "update", revision: this.revision, changes: this.queuedChanges }, []);
    this.queuedChanges = {};
  }

  updateActive(path: string, source: string) {
    if (this.files[path] !== source) this.update({ ...this.files, [path]: source });
  }

  getRevision() {
    return this.revision;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  request<K extends PackageLanguageMethod>(
    method: K,
    input: PackageLanguageMethods[K]["input"],
  ): Promise<PackageLanguageMethods[K]["output"]> {
    if (this.disposed) return Promise.reject(new DOMException("The editor closed", "AbortError"));
    if (this.failure) return Promise.reject(this.failure);
    this.flush();
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("The TypeScript language service did not respond in time"));
      }, 30_000);
      this.pending.set(id, {
        revision: this.revision,
        resolve: (value) => resolve(value as PackageLanguageMethods[K]["output"]),
        reject,
        timer,
      });
      this.worker.postMessage({ id, revision: this.revision, method, input }, []);
    });
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.flushTimer);
    this.worker.terminate();
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new DOMException("The editor closed", "AbortError"));
    }
    this.pending.clear();
    this.listeners.clear();
  }
}
