import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ReadableStream as NodeReadableStream } from "node:stream/web";
import { setImmediate } from "node:timers/promises";
import { TRPCError } from "@trpc/server";
import { Response as UndiciResponse } from "undici";
import { z } from "zod/v4";

import { benchmarkPair } from "../lib.mts";
import type { BenchmarkContext, Side } from "../lib.mts";

const imageFile = "packages/image-proxy/src/index.ts";
const imageRouteFile = "apps/nextjs/src/app/api/image-proxy/[id]/route.ts";
const assistantFile = "apps/nextjs/src/app/api/assistant/chat/route.ts";
const assistantBodyFile = "apps/nextjs/src/app/api/assistant/chat/assistant-request-body.ts";
const dockerFile = "apps/nextjs/src/app/[locale]/manage/tools/docker/logs/[containerId]/page.tsx";
const encryptionFile = "packages/common/src/encryption.ts";
const limit = 12_000_000;
const chunkSize = 64 * 1024;
const imageBytes = 32 * 1024 * 1024;
const requestBytes = 64 * 1024 * 1024;

class FixtureError extends Error {}

interface StreamFixture {
  body: ReadableStream<Uint8Array>;
  bytes: number;
  chunks: number;
  canceled: number;
  materializations: number;
  sample: () => void;
  memory: () => Record<string, number>;
}

// Allocate on demand. The memory workload never preallocates the complete upstream body.
const lazyStream = (totalBytes: number, size = chunkSize, failAtChunk = -1): StreamFixture => {
  const start = process.memoryUsage();
  const peak = { rss: start.rss, external: start.external, arrayBuffers: start.arrayBuffers };
  const fixture: StreamFixture = {
    body: undefined as unknown as ReadableStream<Uint8Array>,
    bytes: 0,
    chunks: 0,
    canceled: 0,
    materializations: 0,
    sample() {
      const current = process.memoryUsage();
      peak.rss = Math.max(peak.rss, current.rss);
      peak.external = Math.max(peak.external, current.external);
      peak.arrayBuffers = Math.max(peak.arrayBuffers, current.arrayBuffers);
    },
    memory() {
      return {
        peakRssGrowthBytes: peak.rss - start.rss,
        peakExternalGrowthBytes: peak.external - start.external,
        peakArrayBuffersGrowthBytes: peak.arrayBuffers - start.arrayBuffers,
      };
    },
  };
  fixture.body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (fixture.chunks === failAtChunk) {
          controller.error(new FixtureError("upstream body failed"));
          return;
        }
        if (fixture.bytes === totalBytes) {
          controller.close();
          fixture.sample();
          return;
        }
        const bytes = Math.min(size, totalBytes - fixture.bytes);
        const value = new Uint8Array(bytes).fill(97);
        fixture.bytes += bytes;
        fixture.chunks++;
        controller.enqueue(value);
        if (fixture.chunks % 16 === 0) fixture.sample();
      },
      cancel() {
        fixture.canceled++;
      },
    },
    { highWaterMark: 0 },
  );
  return fixture;
};

const smallTextStream = (text: string, size = chunkSize, cancelRejects = false) => {
  const bytes = new TextEncoder().encode(text);
  let readBytes = 0;
  let canceled = 0;
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (readBytes === bytes.byteLength) {
          controller.close();
          return;
        }
        const end = Math.min(bytes.byteLength, readBytes + size);
        controller.enqueue(bytes.subarray(readBytes, end));
        readBytes = end;
      },
      cancel() {
        canceled++;
        if (cancelRejects) throw new FixtureError("cancellation failed");
      },
    },
    { highWaterMark: 0 },
  );
  return { body, stats: () => ({ readBytes, canceled }) };
};

const consume = async (response: Response, fixture: StreamFixture) => {
  const reader = response.body?.getReader();
  let bytes = 0;
  const checksum = crypto.createHash("sha256");
  if (!reader) return { bytes, checksum: checksum.digest("hex") };
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      checksum.update(part.value);
      if (fixture.chunks % 16 === 0) fixture.sample();
    }
    fixture.sample();
    return { bytes, checksum: checksum.digest("hex") };
  } finally {
    reader.releaseLock();
  }
};

const prepareImage = (ctx: BenchmarkContext, side: Side) => {
  const env = { SECRET_ENCRYPTION_KEY: "01".repeat(32) };
  const secrets = ctx.evaluate<{ encryptSecret: (value: string) => string; decryptSecret: (value: string) => string }>(
    side,
    encryptionFile,
    ["algorithm", "key", "encryptSecret", "decryptSecret", "decryptSecretWithKey"],
    { crypto, env, Buffer },
    { returnExpression: "({encryptSecret,decryptSecret})" },
  );
  const storage = new Map<string, unknown>();
  let upstream: UndiciResponse | null = null;
  let fetchError = false;
  let lastFetch: { url: string; options: { headers: Record<string, string> } } | null = null;
  const ImageProxy = ctx.evaluate<
    new () => { createImageAsync: (url: string, headers: Record<string, string>) => Promise<string> }
  >(side, imageFile, ["IMAGE_PROXY_REDIS_TTL_SECONDS", "createHmacChannel", "createUrlByIdChannel", "ImageProxy"], {
    env,
    ...secrets,
    ...crypto,
    Buffer,
    setImmediate,
    createId: () => "registered-fixture",
    formatBytes: (value: number) => `${value} bytes`,
    logger: { debug() {}, warn() {}, error() {} },
    ErrorWithMetadata: Error,
    createGetSetChannel: (key: string) => ({
      getAsync: async () => storage.get(key) ?? null,
      setAsync: async (value: unknown) => storage.set(key, value),
    }),
    fetchWithTrustedCertificatesAsync: async (url: string, options: { headers: Record<string, string> }) => {
      lastFetch = { url, options };
      if (fetchError) throw new FixtureError("connection failed");
      assert.ok(upstream);
      return upstream;
    },
  });
  const GET = ctx.evaluate<(request: Request, props: { params: Promise<{ id: string }> }) => Promise<Response>>(
    side,
    imageRouteFile,
    "GET",
    { ImageProxy, Response },
  );
  const privateUrl = "https://immich.internal:2283/private/photo?token=fixture";
  const headers = { authorization: "Bearer fixture-only", "x-api-key": "fixture-only" };
  const register = async () => {
    await new ImageProxy().createImageAsync(privateUrl, headers);
    const registered = storage.get("image-proxy:url:registered-fixture") as { url: string; headers: string };
    assert.ok(registered);
    assert.notEqual(registered.url, privateUrl);
    assert.notEqual(registered.headers, JSON.stringify(headers));
    assert.equal(secrets.decryptSecret(registered.url), privateUrl);
    assert.deepEqual(JSON.parse(secrets.decryptSecret(registered.headers)), headers);
  };
  const respond = async (response: UndiciResponse | null, id = "registered-fixture", shouldFailFetch = false) => {
    upstream = response;
    fetchError = shouldFailFetch;
    const result = await GET(new Request("https://homarr.local/api/image-proxy/fixture"), {
      params: Promise.resolve({ id }),
    });
    if (id === "registered-fixture") {
      assert.deepEqual(lastFetch, { url: privateUrl, options: { headers } });
    }
    return result;
  };
  return { register, respond };
};

const prepareAssistant = (ctx: BenchmarkContext, side: Side) => {
  const reasoningModes = ctx.evaluate<readonly string[]>(
    side,
    "packages/definitions/src/assistant.ts",
    "assistantReasoningModes",
  );
  const validation = ctx.evaluate<{ requestSchema: unknown; hasValidAttachments: unknown }>(
    side,
    assistantFile,
    ["allowedAttachmentMediaTypes", "requestSchema", "asRecord", "hasValidAttachments"],
    {
      z,
      assistantReasoningModes: reasoningModes,
      isRecord: ctx.evaluate(side, "packages/common/src/object.ts", "isRecord"),
      Buffer,
    },
    { returnExpression: "({requestSchema,hasValidAttachments})" },
  );
  let authenticated = true;
  let authCalls = 0;
  let validated = 0;
  let candidate: unknown;
  const originalSchema = validation.requestSchema as { safeParse: (value: unknown) => unknown };
  const bindings: Record<string, unknown> = {
    ...validation,
    requestSchema: {
      safeParse(value: unknown) {
        candidate = value;
        return originalSchema.safeParse(value);
      },
    },
    assistantRequestMaxBytes: ctx.evaluate(side, assistantFile, "assistantRequestMaxBytes"),
    Response,
    auth: async () => {
      authCalls++;
      if (!authenticated) return null;
      return { user: { id: "fixture-user" } };
    },
    db: {
      query: {
        assistantConfigurations: {
          findFirst: async () => {
            validated++;
            return undefined;
          },
        },
        assistantThreads: { findFirst: async () => null },
      },
    },
    eq: () => null,
    and: () => null,
    assistantConfigurations: { id: "id" },
    assistantThreads: { id: "id", userId: "userId" },
  };
  if (side === "after") {
    bindings.readAssistantRequestBodyAsync = ctx.evaluate(side, assistantBodyFile, "readAssistantRequestBodyAsync", {
      TextDecoder,
    });
  }
  const POST = ctx.evaluate<(request: Request) => Promise<Response>>(side, assistantFile, "POST", bindings);
  return {
    async post(body: ReadableStream<Uint8Array> | null, contentLength?: string, signedIn = true) {
      authenticated = signedIn;
      authCalls = 0;
      validated = 0;
      candidate = undefined;
      const headers = new Headers();
      if (contentLength !== undefined) headers.set("content-length", contentLength);
      const request = new Request("https://homarr.local/api/assistant/chat", {
        method: "POST",
        body,
        headers,
        duplex: "half",
      } as RequestInit);
      const response = await POST(request);
      return { response, request, authCalls, validated, candidate };
    },
  };
};

export const cases = [
  benchmarkPair({
    id: "MEGA-assets-01",
    title: "Image proxy forwards a lazy upstream stream to the consumed client",
    files: [imageFile, imageRouteFile, encryptionFile],
    iterations: 2,
    async: true,
    timing: true,
    fixture:
      "32 MiB lazy upstream, 64 KiB chunks, highWaterMark 0, real Undici Response and native route Response. Trusted fetch and Redis are controlled seams; crypto and proxy/route source execute. Client consumes every byte. Sampled memory includes process GC and stream/runtime queues, not an exact allocation bound.",
    async prepare(ctx) {
      const implementations = { before: prepareImage(ctx, "before"), after: prepareImage(ctx, "after") };
      await implementations.before.register();
      await implementations.after.register();
      const run = async (side: Side) => {
        const fixture = lazyStream(imageBytes);
        const upstream = new UndiciResponse(fixture.body, { headers: { "content-type": "image/png" } });
        const original = upstream.arrayBuffer.bind(upstream);
        upstream.arrayBuffer = async () => {
          fixture.materializations++;
          return original();
        };
        const response = await implementations[side].respond(upstream);
        if (side === "after") {
          assert.equal(
            NodeReadableStream,
            ReadableStream,
            "Node and DOM-global stream constructors are identical in the pinned runtime",
          );
          assert.equal(upstream.body, fixture.body);
          assert.equal(response.body, fixture.body, "the route forwards the unchanged stream");
        }
        const bytesAtHeaders = fixture.bytes;
        fixture.sample();
        const result = await consume(response, fixture);
        return {
          ...result,
          bytesAtHeaders,
          readBytes: fixture.bytes,
          materializations: fixture.materializations,
          ...fixture.memory(),
        };
      };
      return {
        before: () => run("before"),
        after: () => run("after"),
        async verify(before, after) {
          const a = before as Awaited<ReturnType<typeof run>>;
          const b = after as Awaited<ReturnType<typeof run>>;
          assert.deepEqual({ bytes: a.bytes, checksum: a.checksum }, { bytes: b.bytes, checksum: b.checksum });
          assert.equal(a.bytes, imageBytes);
          assert.equal(a.bytesAtHeaders, imageBytes);
          assert.equal(b.bytesAtHeaders, 0);
          assert.equal(a.materializations, 1);
          assert.equal(b.materializations, 0);
          for (const side of ["before", "after"] as const) {
            const implementation = implementations[side];
            const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>é</text></svg>';
            const normal = await implementation.respond(
              new UndiciResponse(svg, { headers: { "content-type": "image/svg+xml" } }),
            );
            assert.equal(normal.status, 200);
            assert.equal(normal.headers.get("content-type"), "image/svg+xml");
            assert.equal(normal.headers.get("cache-control"), "public, max-age=3600, immutable");
            assert.equal(await normal.text(), svg);
            for (const [file, contentType] of [
              ["apps/nextjs/public/logo/logo.png", "image/png"],
              ["apps/nextjs/public/images/mock/avatar.jpg", "image/jpeg"],
            ]) {
              const asset = readFileSync(join(ctx.roots[side], file));
              const binary = await implementation.respond(
                new UndiciResponse(asset, { headers: { "content-type": contentType } }),
              );
              assert.equal(binary.headers.get("content-type"), contentType);
              assert.deepEqual(Buffer.from(await binary.arrayBuffer()), asset);
            }
            const empty = await implementation.respond(new UndiciResponse(null, { status: 204 }));
            assert.equal(await empty.text(), "");
            const missing = await implementation.respond(null, "unregistered");
            assert.equal(missing.status, 404);
            assert.equal(missing.headers.get("x-homarr-image-proxy-error"), "not-found");
            const rejected = await implementation.respond(new UndiciResponse(null, { status: 403 }));
            assert.equal(rejected.status, 403);
            assert.equal(rejected.headers.get("x-homarr-image-proxy-error"), "upstream-error");
            const connection = await implementation.respond(null, "registered-fixture", true);
            assert.equal(connection.status, 502);
            assert.equal(connection.headers.get("x-homarr-image-proxy-error"), "fetch-error");

            const cancelFixture = lazyStream(imageBytes);
            const response = await implementation.respond(new UndiciResponse(cancelFixture.body));
            const reader = response.body?.getReader();
            assert.ok(reader);
            await reader.read();
            const readAfterFirst = cancelFixture.bytes;
            await setImmediate();
            assert.equal(cancelFixture.bytes, readAfterFirst, "paused consumer must not read the remaining upstream");
            await reader.cancel();
            reader.releaseLock();
            if (side === "after") {
              assert.equal(readAfterFirst, chunkSize);
              assert.equal(cancelFixture.canceled, 1);
            } else {
              assert.equal(readAfterFirst, imageBytes);
              assert.equal(cancelFixture.canceled, 0);
            }

            const failed = lazyStream(imageBytes, chunkSize, 2);
            if (side === "before") {
              await assert.rejects(implementation.respond(new UndiciResponse(failed.body)), FixtureError);
            } else {
              const partial = await implementation.respond(new UndiciResponse(failed.body));
              assert.equal(partial.status, 200, "headers are available before a later body failure");
              await assert.rejects(consume(partial, failed), FixtureError);
            }
          }
        },
        metrics(result) {
          const { checksum: _checksum, ...metrics } = result as Awaited<ReturnType<typeof run>>;
          return metrics;
        },
      };
    },
  }),
  benchmarkPair({
    id: "MEGA-mega_routes-01",
    title: "Assistant stops reading an undeclared oversized request at the byte ceiling",
    files: [assistantFile, "packages/definitions/src/assistant.ts"],
    iterations: 2,
    async: true,
    timing: true,
    fixture:
      "64 MiB request generated lazily in 64 KiB chunks with highWaterMark 0. Actual POST/auth ordering/schema/attachment validation execute, with auth and post-validation DB lookup controlled. Memory is sampled process growth; largest delivered chunk and decoded representations remain allocated independently of the limit.",
    async prepare(ctx) {
      const implementations = { before: prepareAssistant(ctx, "before"), after: prepareAssistant(ctx, "after") };
      const run = async (side: Side) => {
        const fixture = lazyStream(requestBytes);
        const result = await implementations[side].post(fixture.body);
        fixture.sample();
        assert.equal(result.response.status, 413);
        return {
          readBytes: fixture.bytes,
          chunks: fixture.chunks,
          canceled: fixture.canceled,
          status: result.response.status,
          ...fixture.memory(),
        };
      };
      return {
        before: () => run("before"),
        after: () => run("after"),
        async verify(before, after) {
          const a = before as Awaited<ReturnType<typeof run>>;
          const b = after as Awaited<ReturnType<typeof run>>;
          assert.equal(a.readBytes, requestBytes);
          assert.equal(b.readBytes, Math.ceil((limit + 1) / chunkSize) * chunkSize);
          assert.equal(b.canceled, 1);
          for (const side of ["before", "after"] as const) {
            const implementation = implementations[side];
            for (const length of [undefined, "invalid", "1", String(requestBytes)]) {
              const fixture = lazyStream(requestBytes);
              const result = await implementation.post(fixture.body, length);
              assert.equal(result.response.status, 413);
              if (length === String(requestBytes)) {
                assert.equal(fixture.bytes, 0);
                assert.equal(result.authCalls, 0);
              } else if (side === "after") {
                assert.ok(fixture.bytes < requestBytes);
                assert.equal(fixture.canceled, 1);
              }
            }
            const unauthorized = lazyStream(requestBytes);
            assert.equal((await implementation.post(unauthorized.body, undefined, false)).response.status, 401);
            assert.equal(unauthorized.bytes, 0);
            assert.equal((await implementation.post(null)).response.status, 400);
            const invalid = smallTextStream("{broken", 1);
            assert.equal((await implementation.post(invalid.body)).response.status, 400);
            const invalidSchema = smallTextStream(JSON.stringify({ id: "thread", messages: "wrong" }));
            assert.equal((await implementation.post(invalidSchema.body)).response.status, 400);
            const valid = smallTextStream(
              JSON.stringify({
                id: "thread",
                messages: [{ id: "message", role: "user", parts: [{ type: "text", text: "é🙂" }] }],
              }),
              1,
            );
            const accepted = await implementation.post(valid.body);
            assert.equal(accepted.validated, 1, "UTF-8 split across chunks passes the real schema");
            assert.equal(accepted.response.status, 404, "controlled post-validation lookup returns no conversation");
            const decoded = accepted.candidate as { messages: { parts: { text: string }[] }[] };
            assert.equal(decoded.messages[0]?.parts[0]?.text, "é🙂");
            const attachments = smallTextStream(
              JSON.stringify({
                id: "thread",
                messages: [
                  {
                    id: "message",
                    role: "user",
                    parts: [{ type: "file", mediaType: "application/pdf", url: "data:application/pdf;base64,YQ==" }],
                  },
                ],
              }),
            );
            assert.equal((await implementation.post(attachments.body)).response.status, 413);
            const largeChunk = lazyStream(32 * 1024 * 1024, 16 * 1024 * 1024);
            assert.equal((await implementation.post(largeChunk.body)).response.status, 413);
            if (side === "after") {
              assert.equal(
                largeChunk.bytes,
                16 * 1024 * 1024,
                "one oversized delivered chunk already exists before rejection",
              );
              assert.equal(largeChunk.canceled, 1);
              assert.equal(largeChunk.body.locked, false);
            }
            const failure = lazyStream(chunkSize * 4, chunkSize, 1);
            await assert.rejects(implementation.post(failure.body), FixtureError);
            if (side === "after") assert.equal(failure.body.locked, false);
          }
          // This semantic fixture is preallocated separately; it is excluded from memory metrics.
          const multibyte = JSON.stringify({ id: "thread", messages: [], padding: "é".repeat(6_000_000) });
          assert.ok(new TextEncoder().encode(multibyte).byteLength > limit);
          assert.ok(multibyte.length < limit);
          const old = await implementations.before.post(smallTextStream(multibyte).body);
          const updated = await implementations.after.post(smallTextStream(multibyte).body);
          assert.equal(old.validated, 1);
          assert.equal(updated.response.status, 413);
          assert.equal(updated.validated, 0);
          const emptyBoundary = JSON.stringify({ id: "thread", messages: [], padding: "" });
          const exactBoundary = JSON.stringify({
            id: "thread",
            messages: [],
            padding: "a".repeat(limit - emptyBoundary.length),
          });
          assert.equal(new TextEncoder().encode(exactBoundary).byteLength, limit);
          for (const side of ["before", "after"] as const) {
            const result = await implementations[side].post(smallTextStream(exactBoundary).body, String(limit));
            assert.equal(result.validated, 1, "the exact byte ceiling remains accepted");
          }
          const cancelFailure = smallTextStream("a".repeat(limit + 100), chunkSize, true);
          const canceled = await implementations.after.post(cancelFailure.body);
          assert.equal(canceled.response.status, 413);
          assert.equal(cancelFailure.stats().canceled, 1);
          assert.equal(cancelFailure.body.locked, false);
        },
        metrics(result) {
          return result as Record<string, number>;
        },
      };
    },
  }),
  benchmarkPair({
    id: "MEGA-mega_routes-01:valid",
    title: "Assistant bounded reader overhead for a small valid UTF-8 request",
    files: [assistantFile, "packages/definitions/src/assistant.ts"],
    iterations: 100,
    async: true,
    timing: true,
    fixture:
      "A roughly 4 KiB valid JSON request delivered in 1 KiB chunks, including multibyte text. Both sides execute the actual POST/schema/attachment validation and stop at the controlled missing-conversation DB result. This separates normal-request CPU overhead from oversized-request savings.",
    async prepare(ctx) {
      const implementations = {
        before: prepareAssistant(ctx, "before"),
        after: prepareAssistant(ctx, "after"),
      };
      const text = JSON.stringify({
        id: "thread",
        messages: [{ id: "message", role: "user", parts: [{ type: "text", text: "hello é🙂 ".repeat(300) }] }],
      });
      const run = async (side: Side) => {
        const fixture = smallTextStream(text, 1024);
        const result = await implementations[side].post(fixture.body);
        assert.equal(result.response.status, 404);
        assert.equal(result.validated, 1);
        return {
          status: result.response.status,
          validated: result.validated,
          authCalls: result.authCalls,
          ...fixture.stats(),
        };
      };
      return {
        before: () => run("before"),
        after: () => run("after"),
        verify(before, after) {
          assert.deepEqual(after, before);
        },
        metrics(result) {
          return result as Record<string, number>;
        },
      };
    },
  }),
  benchmarkPair({
    id: "MEGA-mega_routes-02",
    title: "Docker log preflight distinguishes missing containers from operational errors",
    files: [dockerFile],
    iterations: 1,
    async: true,
    timing: false,
    fixture:
      "Actual page function and endpoint-discovery helper with controlled server auth, feature flag and tRPC logs. JSX uses a lightweight element stub; assertions classify thrown error identity without rendering a browser or connecting to Docker.",
    async prepare(ctx) {
      const build = (side: Side) => {
        let signedIn = true;
        let enabled = true;
        let logError: unknown;
        let calls = 0;
        let endpoints: { id: string }[] = [{ id: "endpoint" }];
        const missing = new FixtureError("NEXT_HTTP_ERROR_FALLBACK;404");
        const props = {
          params: Promise.resolve({ containerId: "container" }),
          searchParams: Promise.resolve({ endpointId: "endpoint" }),
        };
        const env = {
          get ENABLE_DOCKER() {
            return enabled;
          },
        };
        const api = {
          docker: {
            logs: async () => {
              calls++;
              if (logError) throw logError;
              return {};
            },
            getEndpoints: async () => endpoints,
          },
        };
        const page = ctx.evaluate<(props: unknown) => Promise<unknown>>(
          side,
          dockerFile,
          ["DockerContainerLogsPage", "getOnlyDockerEndpointIdAsync"],
          {
            env,
            api,
            TRPCError,
            auth: async () => {
              if (!signedIn) return null;
              return { user: { permissions: ["admin"] } };
            },
            notFound: () => {
              throw missing;
            },
            React: { createElement: () => null, Fragment: "fragment" },
            Group: "group",
            Box: "box",
            DynamicBreadcrumb: "breadcrumb",
            ClientSideDockerLogsTerminal: "terminal",
            fullHeightWithoutHeaderAndFooter: 100,
          },
          { returnExpression: "DockerContainerLogsPage" },
        );
        return async () => {
          const errors = [
            new TRPCError({ code: "NOT_FOUND" }),
            new TRPCError({ code: "FORBIDDEN" }),
            new TRPCError({ code: "INTERNAL_SERVER_ERROR" }),
            new FixtureError("Docker unavailable"),
          ];
          let missingResults = 0;
          let preservedErrors = 0;
          let suppressedErrors = 0;
          for (const error of errors) {
            logError = error;
            try {
              await page(props);
              assert.fail("preflight must reject");
            } catch (caught) {
              if (caught === missing) missingResults++;
              if (caught === error) preservedErrors++;
              if (caught === missing && error !== errors[0]) suppressedErrors++;
            }
          }
          logError = undefined;
          await page(props);
          for (const guard of ["auth", "feature", "endpoint"] as const) {
            signedIn = guard !== "auth";
            enabled = guard !== "feature";
            endpoints = [];
            const start = calls;
            let guardedProps: unknown = props;
            if (guard === "endpoint") guardedProps = { ...props, searchParams: Promise.resolve({}) };
            await assert.rejects(page(guardedProps), (error: unknown) => error === missing);
            assert.equal(calls, start, "guards reject before Docker logs preflight");
          }
          signedIn = true;
          enabled = true;
          endpoints = [{ id: "endpoint" }];
          return { missingResults, preservedErrors, suppressedErrors, guardedCases: 3 };
        };
      };
      return {
        before: build("before"),
        after: build("after"),
        verify(before, after) {
          assert.deepEqual(before, { missingResults: 4, preservedErrors: 0, suppressedErrors: 3, guardedCases: 3 });
          assert.deepEqual(after, { missingResults: 1, preservedErrors: 3, suppressedErrors: 0, guardedCases: 3 });
        },
        metrics(result) {
          return result as Record<string, number>;
        },
      };
    },
  }),
];
