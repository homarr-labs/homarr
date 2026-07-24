import { describe, expect, test } from "vitest";

import { BoundedAsyncQueue } from "../bounded-async-queue";

describe("BoundedAsyncQueue", () => {
  test("keeps only the newest values when the queue is full", async () => {
    const queue = new BoundedAsyncQueue<number>(2);
    queue.push(1);
    queue.push(2);
    queue.push(3);
    queue.close();

    await expect(queue.next()).resolves.toEqual({ value: 2, done: false });
    await expect(queue.next()).resolves.toEqual({ value: 3, done: false });
    await expect(queue.next()).resolves.toEqual({ value: undefined, done: true });
  });

  test("resolves a pending read as soon as a value arrives", async () => {
    const queue = new BoundedAsyncQueue<string>(1);
    const next = queue.next();

    queue.push("latest");

    await expect(next).resolves.toEqual({ value: "latest", done: false });
  });

  test("resolves a pending read when the producer closes", async () => {
    const queue = new BoundedAsyncQueue<number>(1);
    const next = queue.next();

    queue.close();

    await expect(next).resolves.toEqual({ value: undefined, done: true });
  });

  test("rejects a pending read when the producer fails", async () => {
    const queue = new BoundedAsyncQueue<number>(1);
    const next = queue.next();
    const error = new Error("upstream failed");

    queue.fail(error);

    await expect(next).rejects.toBe(error);
  });
});
