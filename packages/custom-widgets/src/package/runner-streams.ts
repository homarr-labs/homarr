import { randomUUID } from "node:crypto";

interface RunnerStream {
  values: unknown[];
  bytes: number;
  done: boolean;
  error?: string;
  updatedAt: number;
  wake?: () => void;
  cancel: () => void;
}

/** A pull transport keeps slow remote viewers from creating an unbounded IPC or HTTP queue. */
export class WidgetRunnerStreams {
  private readonly streams = new Map<string, RunnerStream>();
  private readonly cleanup = setInterval(() => {
    for (const [id, stream] of this.streams) if (Date.now() - stream.updatedAt > 60_000) this.cancel(id);
  }, 15_000);

  public create() {
    if (this.streams.size >= 32) throw new Error("Runner subscription capacity is full");
    const id = randomUUID();
    const stream: RunnerStream = { values: [], bytes: 0, done: false, updatedAt: Date.now(), cancel: () => undefined };
    this.streams.set(id, stream);
    return {
      id,
      setCancel: (cancel: () => void) => {
        stream.cancel = cancel;
        if (stream.done) cancel();
      },
      onData: (value: unknown) => {
        if (stream.done) return;
        const bytes = Buffer.byteLength(JSON.stringify(value) ?? "null");
        if (stream.values.length >= 32 || stream.bytes + bytes > 8_388_608) {
          stream.error = "Remote subscription exceeded its buffer limit";
          stream.done = true;
          stream.cancel();
        } else {
          stream.values.push(value);
          stream.bytes += bytes;
        }
        stream.wake?.();
      },
      onError: (error: Error) => {
        stream.error = error.message;
        stream.done = true;
        stream.wake?.();
      },
      onComplete: () => {
        stream.done = true;
        stream.wake?.();
      },
    };
  }

  public async next(id: string, signal: AbortSignal) {
    const stream = this.streams.get(id);
    if (!stream) throw new Error("Runner subscription expired");
    if (stream.wake) throw new Error("Only one subscription read may be active");
    stream.updatedAt = Date.now();
    if (stream.values.length === 0 && !stream.done && !signal.aborted) {
      await new Promise<void>((resolve) => {
        const wake = () => {
          clearTimeout(timeout);
          signal.removeEventListener("abort", wake);
          stream.wake = undefined;
          resolve();
        };
        const timeout = setTimeout(wake, 10_000);
        stream.wake = wake;
        signal.addEventListener("abort", wake, { once: true });
      });
    }
    if (stream.error) {
      this.cancel(id);
      throw new Error(stream.error);
    }
    const values = stream.values.splice(0);
    stream.bytes = 0;
    if (stream.done) this.cancel(id);
    return { done: stream.done, values };
  }

  public cancel(id: string) {
    const stream = this.streams.get(id);
    if (!stream) return;
    this.streams.delete(id);
    stream.done = true;
    stream.cancel();
    stream.wake?.();
  }

  public close() {
    clearInterval(this.cleanup);
    for (const id of this.streams.keys()) this.cancel(id);
  }
}
