import { describe, expect, test, vi } from "vitest";
import { ORPCError, os } from "@orpc/server";
import type { AnyRouter } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { RPCLink } from "@orpc/client/fetch";
import { createNativeApiClient, getNativeClient } from "../native-client";
import type { ApiClientContext } from "../native-client";
import type { ClientLink } from "@orpc/client";
import { z } from "zod/v4";

import { mediaUploadSchema } from "@homarr/validation/media";

import { fetchApi } from "../client";
import { configureWorkerTransport, createWorkerLink } from "../worker-link";

function createTestClient(options: { link: ClientLink<ApiClientContext> }) {
  return getNativeClient(createNativeApiClient(options));
}

function client(router: AnyRouter, transport: "worker" | "hosted" = "worker") {
  const requests: Request[] = [];
  const handler = new RPCHandler(router);
  const connection = {
    async fetch(input: string | URL | Request, init?: RequestInit) {
      const request = new Request(new URL(String(input), "https://worker.test"), init);
      requests.push(request);
      const result = await handler.handle(request, { prefix: "/rpc", context: {} });
      if (!result.matched) return new Response(null, { status: 404 });
      return result.response;
    },
  };
  let link: ClientLink<ApiClientContext> = createWorkerLink(connection);
  if (transport === "hosted") link = new RPCLink({ url: "/rpc", method: "POST", fetch: connection.fetch });
  return {
    client: createTestClient({ link }),
    requests,
    connection,
  };
}

describe("native Homarr client over worker RPC", () => {
  test("browser weather requires opt-in, a null worker result, and successful authorization", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    try {
      let allowed = true;
      let result: unknown = null;
      const worker = client({
        widget: {
          weather: {
            atLocation: os.handler(() => {
              if (!allowed) throw new ORPCError("FORBIDDEN");
              return result;
            }),
          },
        },
        unrelated: os.handler(() => null),
      });
      const api = createTestClient({
        link: createWorkerLink({ ...worker.connection, browserWeather: true }),
      });
      const input = { latitude: 48.85, longitude: 2.35, url: "https://private.invalid" };
      expect(await worker.client.query("widget.weather.atLocation", input)).toBeNull();
      expect(await api.query("unrelated")).toBeNull();
      allowed = false;
      await expect(api.query("widget.weather.atLocation", input)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(fetch).not.toHaveBeenCalled();
      allowed = true;
      result = { current: "worker data" };
      expect(await api.query("widget.weather.atLocation", input)).toEqual(result);
      expect(fetch).not.toHaveBeenCalled();
      result = null;
      await expect(api.query("widget.weather.atLocation", input)).rejects.toThrow("Open-Meteo returned 503");
      expect(fetch).toHaveBeenCalledTimes(1);
      const call = fetch.mock.calls[0];
      if (!call) throw new Error("Expected a browser weather request");
      const [url, options] = call;
      expect(url.origin).toBe("https://api.open-meteo.com");
      expect(url.pathname).toBe("/v1/forecast");
      expect(url.searchParams.has("url")).toBe(false);
      expect(options).toMatchObject({ credentials: "omit", redirect: "error", referrerPolicy: "no-referrer" });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test.each(["worker", "hosted"] as const)(
    "%s media uploads preserve repeated FormData files and all bytes",
    async (transport) => {
      const bytes = new Uint8Array(3 * 1024 * 1024).fill(19);
      const form = new FormData();
      form.append("files", new File([bytes], "large.png", { type: "image/png" }));
      form.append("files", new File(["second file"], "small.png", { type: "image/png" }));
      const { client: api } = client(
        {
          upload: os.input(mediaUploadSchema).handler(async ({ input }) =>
            Promise.all(
              input.files.map(async (file) => ({
                name: file.name,
                type: file.type,
                size: file.size,
                digest: Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))),
              })),
            ),
          ),
        },
        transport,
      );
      const result = await api.mutation("upload", form);
      expect(result).toEqual(
        await Promise.all(
          [form.getAll("files")[0], form.getAll("files")[1]].map(async (file) => {
            if (!(file instanceof File)) throw new Error("Expected upload file");
            return {
              name: file.name,
              type: file.type,
              size: file.size,
              digest: Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))),
            };
          }),
        ),
      );
    },
  );

  test.each(["worker", "hosted"] as const)(
    "%s top-level forms preserve repeated fields and reject unsafe prototype fields",
    async (transport) => {
      const { client: api, requests } = client(
        {
          upload: os.input(z.object({ labels: z.array(z.string()) })).handler(({ input }) => input),
          certificate: os.input(z.object({ file: z.file() })).handler(async ({ input }) => ({
            name: input.file.name,
            text: await input.file.text(),
          })),
        },
        transport,
      );
      const form = new FormData();
      form.append("labels", "first");
      form.append("labels", "second");
      expect(await api.mutation("upload", form)).toEqual({ labels: ["first", "second"] });
      form.append("__proto__", "unsafe");
      await expect(api.mutation("upload", form)).rejects.toThrow("Unsafe form field");
      expect(requests).toHaveLength(1);
      const certificate = new FormData();
      certificate.append("file", new File(["certificate bytes"], "server.crt"));
      expect(await api.mutation("certificate", certificate)).toEqual({ name: "server.crt", text: "certificate bytes" });
    },
  );

  test("queries and mutations retain native values and input validation without tRPC HTTP", async () => {
    let saved = "";
    const { client: api, requests } = client({
      board: {
        read: os.handler(() => ({ date: new Date("2026-10-16T00:00:00Z"), count: 9n })),
        save: os.input(z.object({ name: z.string().min(1) })).handler(({ input }) => {
          saved = input.name;
          return saved;
        }),
      },
    });
    expect(await api.query("board.read")).toEqual({ date: new Date("2026-10-16T00:00:00Z"), count: 9n });
    expect(await api.mutation("board.save", { name: "My board" })).toBe("My board");
    expect(saved).toBe("My board");
    expect(
      requests.every((request) => request.method === "POST" && new URL(request.url).pathname.startsWith("/rpc/")),
    ).toBe(true);
    await expect(api.mutation("board.save", { name: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(saved).toBe("My board");
  });

  test("native authorization errors retain the code consumed by existing widgets", async () => {
    const { client: api } = client({
      denied: os.handler(() => {
        throw new ORPCError("FORBIDDEN", { message: "Access removed" });
      }),
    });
    await expect(api.query("denied")).rejects.toMatchObject({
      name: "ORPCError",
      message: "Access removed",
      code: "FORBIDDEN",
    });
  });

  test("native streamed subscriptions reach the existing subscription callbacks", async () => {
    const { client: api } = client({
      live: os.handler(async function* () {
        yield { value: 1 };
        yield { value: 2 };
      }),
    });
    const values: unknown[] = [];
    let started = false;
    await new Promise<void>((resolve, reject) => {
      api.subscription("live", undefined, {
        onStarted: () => {
          started = true;
        },
        onData: (value) => values.push(value),
        onComplete: resolve,
        onError: reject,
      });
    });
    expect(started).toBe(true);
    expect(values).toEqual([{ value: 1 }, { value: 2 }]);
  });

  test("classifies persistent subscriptions locally so they cannot occupy control slots", async () => {
    const { connection } = client({
      live: os.handler(async function* () {
        yield 1;
      }),
    });
    const finiteFetch = vi.fn().mockRejectedValue(new Error("Persistent stream used finite request slots"));
    const api = createTestClient({
      link: createWorkerLink({ fetch: finiteFetch, fetchSubscription: connection.fetch }),
    });
    const values: unknown[] = [];
    await new Promise<void>((resolve, reject) =>
      api.subscription("live", undefined, {
        onData: (value) => values.push(value),
        onComplete: resolve,
        onError: reject,
      }),
    );
    expect(values).toEqual([1]);
    expect(finiteFetch).not.toHaveBeenCalled();
  });

  test("query cancellation aborts the bound worker request", async () => {
    let signal: AbortSignal | undefined;
    const api = createTestClient({
      link: createWorkerLink({
        fetch(_url, init) {
          signal = init?.signal ?? undefined;
          return new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(signal?.reason)));
        },
      }),
    });
    const abort = new AbortController();
    const pending = api.query("board.read", undefined, { signal: abort.signal });
    await new Promise((resolve) => setTimeout(resolve, 0));
    abort.abort();
    await expect(pending).rejects.toBeDefined();
    expect(signal?.aborted).toBe(true);
  });

  test("unsubscribing aborts the native subscription and releases its source", async () => {
    let finish!: () => void;
    const cancelled = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const { client: api } = client({
      live: os.handler(async function* ({ signal }) {
        try {
          yield 1;
          await new Promise<void>((resolve) => signal?.addEventListener("abort", () => resolve(), { once: true }));
        } finally {
          finish();
        }
      }),
    });
    const subscription = api.subscription("live", undefined, { onData: () => subscription.unsubscribe() });
    await cancelled;
  });

  test("identical subscriptions share a stream, replay isolated latest data, and release on last unsubscribe", async () => {
    let publish!: (value: { value: number }) => void;
    let stopped = false;
    const { client: api, requests } = client({
      live: os.input(z.object({ host: z.string(), details: z.boolean() })).handler(async function* ({ signal }) {
        try {
          yield { value: 1 };
          while (!signal?.aborted) {
            const value = await new Promise<{ value: number } | undefined>((resolve) => {
              publish = resolve;
              signal?.addEventListener("abort", () => resolve(undefined), { once: true });
            });
            if (value) yield value;
          }
        } finally {
          stopped = true;
        }
      }),
    });
    const first: unknown[] = [];
    const second: unknown[] = [];
    const a = api.subscription("live", { host: "beszel", details: true }, { onData: (value) => first.push(value) });
    await vi.waitFor(() => expect(first).toEqual([{ value: 1 }]));
    (first[0] as { value: number }).value = 99;
    const b = api.subscription("live", { details: true, host: "beszel" }, { onData: (value) => second.push(value) });
    await vi.waitFor(() => expect(second).toEqual([{ value: 1 }]));
    expect(requests).toHaveLength(1);
    a.unsubscribe();
    expect(stopped).toBe(false);
    publish({ value: 2 });
    await vi.waitFor(() => expect(second).toEqual([{ value: 1 }, { value: 2 }]));
    expect(first).toEqual([{ value: 99 }]);
    b.unsubscribe();
    await vi.waitFor(() => expect(stopped).toBe(true));
    expect(requests[0]?.signal.aborted).toBe(true);
  });

  test("aborting one listener preserves peers and a released stream can restart", async () => {
    let stopped = 0;
    const {
      client: api,
      connection,
      requests,
    } = client({
      live: os.handler(async function* ({ signal }) {
        try {
          yield 1;
          await new Promise<void>((resolve) => signal?.addEventListener("abort", () => resolve(), { once: true }));
        } finally {
          stopped++;
        }
      }),
    });
    const values: unknown[] = [];
    const errors: unknown[] = [];
    const abort = new AbortController();
    const a = api.subscription("live", undefined, { signal: abort.signal, onError: (error) => errors.push(error) });
    const b = api.subscription("live", undefined, { onData: (value) => values.push(value) });
    await vi.waitFor(() => expect(values).toEqual([1]));
    abort.abort(new Error("Listener closed"));
    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(stopped).toBe(0);
    expect(requests).toHaveLength(1);
    b.unsubscribe();
    await vi.waitFor(() => expect(stopped).toBe(1));
    const c = api.subscription("live", undefined, { onData: (value) => values.push(value) });
    await vi.waitFor(() => expect(values).toEqual([1, 1]));
    expect(requests).toHaveLength(2);
    const independent = createTestClient({ link: createWorkerLink(connection) });
    const d = independent.subscription("live", undefined, { onData: (value) => values.push(value) });
    await vi.waitFor(() => expect(values).toEqual([1, 1, 1]));
    expect(requests).toHaveLength(3);
    a.unsubscribe();
    c.unsubscribe();
    d.unsubscribe();
    await vi.waitFor(() => expect(stopped).toBe(3));
  });

  test("different subscription inputs and workers keep separate streams", async () => {
    const router = {
      live: os.input(z.object({ host: z.string() })).handler(async function* ({ input, signal }) {
        yield input.host;
        await new Promise<void>((resolve) => signal?.addEventListener("abort", () => resolve(), { once: true }));
      }),
    };
    const first = client(router);
    const second = client(router);
    let active = first.connection;
    const api = createTestClient({ link: createWorkerLink(() => active) });
    const values: unknown[] = [];
    const a = api.subscription("live", { host: "one" }, { onData: (value) => values.push(value) });
    const b = api.subscription("live", { host: "two" }, { onData: (value) => values.push(value) });
    await vi.waitFor(() => expect(values).toHaveLength(2));
    active = second.connection;
    const c = api.subscription("live", { host: "one" }, { onData: (value) => values.push(value) });
    await vi.waitFor(() => expect(values).toHaveLength(3));
    expect(first.requests).toHaveLength(2);
    expect(second.requests).toHaveLength(1);
    a.unsubscribe();
    b.unsubscribe();
    c.unsubscribe();
  });

  test("offline worker selection fails without falling back to hosted HTTP", async () => {
    const api = createTestClient({
      link: createWorkerLink(() => {
        throw new Error("Worker offline");
      }),
    });
    await expect(api.query("board.read")).rejects.toMatchObject({ message: "Worker offline" });
  });

  test("existing fetchApi helpers use the configured worker and fail closed offline", async () => {
    const { connection } = client({ read: os.handler(() => "private worker data") });
    const hostedFetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Hosted HTTP must not be used"));
    const release = configureWorkerTransport(() => connection);
    let releaseOffline: (() => void) | undefined;
    try {
      const api = getNativeClient(fetchApi);
      expect(await api.query("read")).toBe("private worker data");
      releaseOffline = configureWorkerTransport(() => {
        throw new Error("Worker offline");
      });
      await expect(api.query("read")).rejects.toMatchObject({ message: "Worker offline" });
      expect(hostedFetch).not.toHaveBeenCalled();
    } finally {
      releaseOffline?.();
      release();
      hostedFetch.mockRestore();
    }
  });

  test("one request stays bound to its selected worker during a primary switch", async () => {
    let active = "first";
    const handler = new RPCHandler({
      read: os.$context<{ worker: string }>().handler(({ context }) => context.worker),
    });
    const connection = (worker: string) => ({
      async fetch(input: string | URL | Request, init?: RequestInit) {
        const result = await handler.handle(new Request(new URL(String(input), "https://worker.test"), init), {
          prefix: "/rpc",
          context: { worker },
        });
        if (!result.matched) return new Response(null, { status: 404 });
        return result.response;
      },
    });
    const api = createTestClient({ link: createWorkerLink(() => connection(active)) });
    const pending = api.query("read");
    active = "second";
    expect(await pending).toBe("first");
    expect(await api.query("read")).toBe("second");
  });

  test("hosted subscriptions reconnect after a transient transport error and stop on unsubscribe", async () => {
    vi.useFakeTimers();
    try {
      const worker = client({
        live: os.handler(async function* ({ signal }) {
          yield 7;
          await new Promise<void>((resolve) => signal?.addEventListener("abort", () => resolve(), { once: true }));
        }),
      });
      const fetch = vi
        .fn()
        .mockRejectedValueOnce(new TypeError("Network disconnected"))
        .mockImplementation(worker.connection.fetch);
      const api = createTestClient({ link: new RPCLink({ url: "/rpc", fetch }) });
      const values: unknown[] = [];
      const errors: unknown[] = [];
      const subscription = api.subscription("live", undefined, {
        onData: (value) => values.push(value),
        onError: (error) => errors.push(error),
      });
      await vi.advanceTimersByTimeAsync(250);
      expect(values).toEqual([7]);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(errors).toEqual([]);
      subscription.unsubscribe();
      await vi.advanceTimersByTimeAsync(20_000);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(worker.requests[0]?.signal.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  test("subscription retries are bounded and caller cancellation clears pending reconnects", async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn().mockRejectedValue(new TypeError("Network disconnected"));
      const api = createTestClient({ link: new RPCLink({ url: "/rpc", fetch }) });
      const errors: unknown[] = [];
      api.subscription("live", undefined, { onError: (error) => errors.push(error) });
      await vi.advanceTimersByTimeAsync(20_000);
      expect(fetch).toHaveBeenCalledTimes(6);
      expect(errors).toHaveLength(1);
      fetch.mockClear();
      const abort = new AbortController();
      api.subscription("live", undefined, { signal: abort.signal });
      await vi.advanceTimersByTimeAsync(0);
      expect(fetch).toHaveBeenCalledTimes(1);
      abort.abort();
      await vi.advanceTimersByTimeAsync(20_000);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  test.each(["UNAUTHORIZED", "FORBIDDEN", "BAD_REQUEST"] as const)(
    "%s subscription failures never reconnect",
    async (code) => {
      vi.useFakeTimers();
      try {
        const worker = client({
          live: os.handler(() => {
            throw new ORPCError(code);
          }),
        });
        const fetch = vi.fn(worker.connection.fetch);
        const api = createTestClient({ link: new RPCLink({ url: "/rpc", fetch }) });
        const errors: unknown[] = [];
        api.subscription("live", undefined, { onError: (error) => errors.push(error) });
        await vi.advanceTimersByTimeAsync(20_000);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({ code });
        expect(fetch).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    },
  );
});
