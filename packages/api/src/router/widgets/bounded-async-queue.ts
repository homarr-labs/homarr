type QueueResult<T> = IteratorResult<T, undefined>;

type PendingRead<T> = {
  resolve: (result: QueueResult<T>) => void;
  reject: (reason?: unknown) => void;
};

/**
 * A small async queue for live streams.
 *
 * Live metrics are snapshots, so retaining every snapshot while a client is
 * slow is both unnecessary and dangerous. When the queue is full, discard
 * the oldest pending snapshot and keep the newest one.
 */
export class BoundedAsyncQueue<T> implements AsyncIterableIterator<T> {
  private readonly values: T[] = [];
  private pendingRead: PendingRead<T> | undefined;
  private closed = false;
  private failed = false;
  private failure: unknown;

  public constructor(private readonly maxSize: number) {
    if (!Number.isInteger(maxSize) || maxSize < 1) {
      throw new Error("A bounded async queue requires a positive integer max size");
    }
  }

  public push(value: T): void {
    if (this.closed) return;

    if (this.pendingRead) {
      const pendingRead = this.pendingRead;
      this.pendingRead = undefined;
      pendingRead.resolve({ value, done: false });
      return;
    }

    if (this.values.length >= this.maxSize) this.values.shift();
    this.values.push(value);
  }

  public close(): void {
    if (this.closed) return;
    this.closed = true;

    if (this.pendingRead) {
      const pendingRead = this.pendingRead;
      this.pendingRead = undefined;
      pendingRead.resolve({ value: undefined, done: true });
    }
  }

  public fail(error: unknown): void {
    if (this.closed) return;
    this.closed = true;
    this.failed = true;
    this.failure = error;
    this.values.length = 0;

    if (this.pendingRead) {
      const pendingRead = this.pendingRead;
      this.pendingRead = undefined;
      pendingRead.reject(error);
    }
  }

  public next(): Promise<QueueResult<T>> {
    if (this.values.length > 0) {
      return Promise.resolve({ value: this.values.shift() as T, done: false });
    }
    if (this.failed) return Promise.reject(this.failure);
    if (this.closed) return Promise.resolve({ value: undefined, done: true });

    return new Promise<QueueResult<T>>((resolve, reject) => {
      this.pendingRead = { resolve, reject };
    });
  }

  public return(): Promise<QueueResult<T>> {
    this.values.length = 0;
    this.close();
    return Promise.resolve({ value: undefined, done: true });
  }

  public [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this;
  }
}
