import { describe, expect, test } from "bun:test";

import { createBrowserConnection, createWorkerConnection, generateWorkerIdentity } from "@homarr/remote-protocol";
import type { RemoteTransport } from "@homarr/remote-protocol";

import { createWorkerRequestScheduler } from "./scheduler";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("shared encrypted worker request scheduling", () => {
  test.each(["body", "bodyless", "HEAD"])(
    "40 %s replies complete through the real encrypted protocol",
    async (mode) => {
      const incoming = [new Set<(frame: string) => void>(), new Set<(frame: string) => void>()];
      const closers = new Set<() => void>();
      let closed = false;
      let delayed = Promise.resolve();
      function transport(index: number): RemoteTransport {
        return {
          send(frame) {
            if (index === 1) {
              delayed = delayed
                .then(() => new Promise<void>((resolve) => setTimeout(resolve, 2)))
                .then(() => {
                  if (!closed) for (const listener of incoming[1 - index] ?? []) listener(frame);
                });
            } else
              queueMicrotask(() => {
                if (!closed) for (const listener of incoming[1 - index] ?? []) listener(frame);
              });
          },
          subscribe(listener) {
            incoming[index]?.add(listener);
            return () => {
              incoming[index]?.delete(listener);
            };
          },
          onClose(listener) {
            closers.add(listener);
            return () => {
              closers.delete(listener);
            };
          },
          close() {
            if (closed) return;
            closed = true;
            for (const listener of Array.from(closers)) listener();
          },
        };
      }
      const identity = await generateWorkerIdentity();
      const workerReady = createWorkerConnection({
        identity,
        transport: transport(1),
        authorize: async () => ({ role: "owner" }),
        onRequest: async (request) => {
          if (mode === "bodyless") return new Response(null, { status: 204 });
          return new Response(new URL(request.url).pathname);
        },
      });
      const browser = await createBrowserConnection({
        pinnedIdentity: identity.publicJwk,
        transport: transport(0),
        credential: "test credential",
      });
      const worker = await workerReady;
      const scheduler = createWorkerRequestScheduler(browser.fetch.bind(browser));
      try {
        const results = await Promise.all(
          Array.from({ length: 40 }, async (_, index) => {
            let method = "GET";
            if (mode === "HEAD") method = "HEAD";
            const response = await scheduler.fetch(`/widget/${index}`, { method });
            return response.text();
          }),
        );
        let expected = Array<string>(40).fill("");
        if (mode === "body") expected = Array.from({ length: 40 }, (_, index) => `/widget/${index}`);
        expect(results).toEqual(expected);
      } finally {
        scheduler.close();
        browser.close();
        worker.close();
      }
    },
  );

  test("40 simultaneous reads finish while at most 12 response streams are active", async () => {
    let active = 0;
    let maximum = 0;
    let requests = 0;
    const scheduler = createWorkerRequestScheduler(async () => {
      requests++;
      active++;
      maximum = Math.max(maximum, active);
      await tick();
      return new Response(
        new ReadableStream<Uint8Array>(
          {
            pull(controller) {
              controller.enqueue(new TextEncoder().encode("widget data"));
              controller.close();
              active--;
            },
          },
          { highWaterMark: 0 },
        ),
      );
    });
    const results = await Promise.all(
      Array.from({ length: 40 }, async () => {
        const response = await scheduler.fetch("/rpc/widget/read");
        return response.text();
      }),
    );
    expect(results).toEqual(Array(40).fill("widget data"));
    expect(requests).toBe(40);
    expect(maximum).toBe(12);
    expect(active).toBe(0);
    scheduler.close();
  });

  test("headers do not release a slot; consuming or cancelling the response does", async () => {
    let requests = 0;
    const scheduler = createWorkerRequestScheduler(
      async () => {
        requests++;
        return new Response("data");
      },
      { maxActive: 1 },
    );
    const first = await scheduler.fetch("/first");
    const second = scheduler.fetch("/second");
    await tick();
    expect(requests).toBe(1);
    await first.body?.cancel();
    const response = await second;
    expect(requests).toBe(2);
    expect(await response.text()).toBe("data");
    scheduler.close();
  });

  test("aborted queued requests never reach the worker, including mutations", async () => {
    const paths: string[] = [];
    const scheduler = createWorkerRequestScheduler(
      async (input) => {
        paths.push(String(input));
        return new Response("data");
      },
      { maxActive: 1 },
    );
    const first = await scheduler.fetch("/first");
    const abort = new AbortController();
    const queued = scheduler.fetch("/mutation", { method: "POST", body: "private input", signal: abort.signal });
    abort.abort();
    await expect(queued).rejects.toMatchObject({ name: "AbortError" });
    await first.body?.cancel();
    await tick();
    expect(paths).toEqual(["/first"]);
    scheduler.close();
  });

  test("disconnect rejects the queue and interrupts active body reads", async () => {
    let requests = 0;
    let cancelled = 0;
    const scheduler = createWorkerRequestScheduler(
      async () => {
        requests++;
        return new Response(
          new ReadableStream({
            cancel() {
              cancelled++;
            },
          }),
        );
      },
      { maxActive: 1 },
    );
    const first = await scheduler.fetch("/stream");
    const pendingBody = first.body?.getReader().read();
    const queued = scheduler.fetch("/queued");
    const outcome = Promise.allSettled([pendingBody, queued]);
    scheduler.close();
    expect((await outcome).map((result) => result.status)).toEqual(["rejected", "rejected"]);
    expect(requests).toBe(1);
    expect(cancelled).toBe(1);
    await expect(scheduler.fetch("/later")).rejects.toThrow("closed");
  });

  test("an active request cancelled before headers frees its slot and rejects immediately", async () => {
    let requests = 0;
    const scheduler = createWorkerRequestScheduler(
      async () => {
        requests++;
        if (requests === 1) return new Promise<Response>(() => {});
        return new Response("next request");
      },
      { maxActive: 1 },
    );
    const abort = new AbortController();
    const active = scheduler.fetch("/active", { signal: abort.signal });
    const queued = scheduler.fetch("/queued");
    abort.abort();
    await expect(active).rejects.toMatchObject({ name: "AbortError" });
    expect(await (await queued).text()).toBe("next request");
    expect(requests).toBe(2);
    scheduler.close();
  });

  test("queue overflow is explicit and never retries a request", async () => {
    let requests = 0;
    const scheduler = createWorkerRequestScheduler(
      async () => {
        requests++;
        return new Response("data");
      },
      { maxActive: 1, maxQueued: 1 },
    );
    const first = await scheduler.fetch("/first");
    const queued = scheduler.fetch("/queued");
    await expect(scheduler.fetch("/overflow", { method: "POST" })).rejects.toThrow("queue is full");
    await first.body?.cancel();
    await (await queued).body?.cancel();
    expect(requests).toBe(2);
    scheduler.close();
  });

  test("eight persistent subscriptions leave ordinary queries and control calls usable", async () => {
    const paths: string[] = [];
    const scheduler = createWorkerRequestScheduler(async (input) => {
      const path = String(input);
      paths.push(path);
      if (path.startsWith("/subscription/")) return new Response(new ReadableStream());
      return new Response(path);
    });
    const subscriptions = await Promise.all(
      Array.from({ length: 8 }, (_, index) => scheduler.fetchSubscription(`/subscription/${index}`)),
    );
    const abort = new AbortController();
    const queued = scheduler.fetchSubscription("/subscription/queued", { signal: abort.signal });
    expect(await (await scheduler.fetch("/rpc/board/read")).text()).toBe("/rpc/board/read");
    expect(await (await scheduler.fetch("/remote/access/grants")).text()).toBe("/remote/access/grants");
    expect(paths).not.toContain("/subscription/queued");
    abort.abort();
    await expect(queued).rejects.toMatchObject({ name: "AbortError" });
    await subscriptions[0]?.body?.cancel();
    await tick();
    expect(paths).not.toContain("/subscription/queued");
    scheduler.close();
  });
});
