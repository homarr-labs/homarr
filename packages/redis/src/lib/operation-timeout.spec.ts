// @vitest-environment node

import net from "node:net";
import { Worker } from "node:worker_threads";

import { describe, expect, test } from "vitest";

import { redisOperationTimeoutSliceMs, withRedisOperationTimeoutAsync } from "./operation-timeout";

const blockEventLoop = (durationMs: number) => {
  const deadline = performance.now() + durationMs;
  while (performance.now() < deadline) {
    // Hold the loop long enough that a wall-clock deadline would already be due.
  }
};

describe("withRedisOperationTimeoutAsync", () => {
  test("returns the operation result", async () => {
    await expect(withRedisOperationTimeoutAsync(Promise.resolve("cached"), 750)).resolves.toBe("cached");
  });

  test("propagates the operation failure", async () => {
    const failure = new Error("connection closed");
    await expect(withRedisOperationTimeoutAsync(Promise.reject(failure), 750)).rejects.toBe(failure);
  });

  test("rejects an operation that never settles", async () => {
    const pending = new Promise<string>(() => undefined);
    await expect(
      withRedisOperationTimeoutAsync(pending, redisOperationTimeoutSliceMs * 2, "Redis operation timed out"),
    ).rejects.toThrow("Redis operation timed out");
  });

  test("does not treat an event-loop stall as the deadline elapsing", async () => {
    let resolveOperation: ((value: string) => void) | undefined;
    const operation = new Promise<string>((resolve) => {
      resolveOperation = resolve;
    });
    const result = withRedisOperationTimeoutAsync(operation, redisOperationTimeoutSliceMs + 30);

    blockEventLoop(redisOperationTimeoutSliceMs * 4);
    setImmediate(() => resolveOperation?.("ok"));

    await expect(result).resolves.toBe("ok");
  });

  test("accepts a reply that was buffered during an event-loop stall", async () => {
    const written = new Int32Array(new SharedArrayBuffer(4));
    const releaseReply = new Int32Array(new SharedArrayBuffer(4));
    const worker = new Worker(
      `
        const net = require("node:net");
        const { parentPort, workerData } = require("node:worker_threads");
        const server = net.createServer((socket) => {
          Atomics.wait(workerData.releaseReply, 0, 0);
          socket.write("ok", () => {
            Atomics.store(workerData.written, 0, 1);
            Atomics.notify(workerData.written, 0);
          });
        });
        server.listen(0, "127.0.0.1", () => {
          const address = server.address();
          parentPort.postMessage(String(address.port));
        });
      `,
      { eval: true, workerData: { written, releaseReply } },
    );

    const portMessage = await new Promise<string>((resolve, reject) => {
      worker.once("message", (value: unknown) => {
        if (typeof value === "string") resolve(value);
        else reject(new Error("Expected the worker port"));
      });
      worker.once("error", reject);
    });
    const port = Number(portMessage);
    const socket = net.connect(port, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("error", reject);
    });

    const operation = new Promise<string>((resolve) => {
      socket.on("data", () => resolve("ok"));
    });
    const result = withRedisOperationTimeoutAsync(operation, redisOperationTimeoutSliceMs);
    Atomics.store(releaseReply, 0, 1);
    Atomics.notify(releaseReply, 0);
    const writeDeadline = performance.now() + 2_000;
    while (Atomics.load(written, 0) === 0) {
      if (performance.now() > writeDeadline) throw new Error("Timed out waiting for the buffered reply");
      // Block this thread without turning the event loop, so the worker can
      // write while the socket stays unread.
      Atomics.wait(written, 0, 0, 20);
    }
    // The bytes are in the kernel buffer. Stay on CPU so the event loop cannot
    // read them until the wall-clock deadline is already due.
    blockEventLoop(redisOperationTimeoutSliceMs * 3);

    await expect(result).resolves.toBe("ok");
    socket.destroy();
    await worker.terminate();
  });
});
