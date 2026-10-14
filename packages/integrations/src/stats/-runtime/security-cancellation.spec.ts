import assert from "node:assert/strict";
import { checkServerIdentity } from "node:tls";
import { inspect } from "node:util";
import { Headers, MockAgent, Response } from "undici";
import { test, vi } from "vitest";

import { IntegrationParseError } from "../../base/errors/parse/integration-parse-error";
import { IntegrationRequestError } from "../../base/errors/http/integration-request-error";
import { IntegrationRuntimeError } from "../../runtime/executor";
import { createStatsFetchContext } from "../../runtime/stats-transport";
import { StatsIntegration } from "../stats-integration";
import { frigateStatsProvider } from "../providers/frigate";
import { createFixture, createSyntheticAxios } from "./fixture";

test("native wrapper preserves parse and safe diagnostic connection categories", async () => {
  const cases = [
    { response: () => Response.json({ reads: { a: -1 }, unreads: {} }), expected: { type: "parse" } },
    {
      response: () => new Response("synthetic-private-body", { status: 403 }),
      expected: { type: "authorization", statusCode: 403 },
    },
    {
      response: () => new Response("synthetic-private-body", { status: 503 }),
      expected: { type: "statusCode", statusCode: 503 },
    },
    { response: () => new Response("synthetic-private-body"), expected: { type: "parse" } },
    {
      response: () => {
        throw Object.assign(new TypeError("synthetic-token"), {
          cause: Object.assign(new Error("synthetic-private-body"), {
            code: "ENOTFOUND",
            url: "https://synthetic-token.invalid",
          }),
        });
      },
      expected: { type: "request", requestType: "dns", requestReason: "notFound", requestCode: "ENOTFOUND" },
    },
    {
      response: () => {
        throw Object.assign(new Error("synthetic-token"), { code: "NOT_AN_ALLOWED_CODE" });
      },
      expected: { type: "unknown" },
    },
  ];
  for (const { response, expected } of cases) {
    const fixture = createFixture(async () => response());
    try {
      const result = await fixture.runtime.testConnectionAsync(fixture.request("miniflux", ["full"]));
      assert.deepEqual(result, { success: false, error: expected });
      assert(!inspect(result, { depth: 10 }).includes("synthetic-token"));
      assert(!inspect(result, { depth: 10 }).includes("synthetic-private-body"));
      assert.equal(fixture.counts().released, 1);
    } finally {
      await fixture.closeAsync();
    }
  }
  const fixture = createFixture(async () => {
    throw Object.assign(new Error("synthetic-token"), { code: "CERT_HAS_EXPIRED" });
  });
  try {
    await fixture.runtime.executeNativeAsync(fixture.request("miniflux"), "query", async (client, context) => {
      await assert.rejects(client.getStatsAsync(context.signal), (error: unknown) => {
        assert(error instanceof IntegrationRequestError);
        assert.equal(error.cause.code, "CERT_HAS_EXPIRED");
        assert(!inspect(error, { depth: 10 }).includes("synthetic-token"));
        return true;
      });
    });
  } finally {
    await fixture.closeAsync();
  }
});

test("native negative counters reach the explicitly injected parse handler", async () => {
  const fixture = createFixture(async () => Response.json({ reads: { a: -1 }, unreads: {} }));
  try {
    await fixture.runtime.executeNativeAsync(fixture.request("miniflux"), "query", async (client, context) => {
      await assert.rejects(client.getStatsAsync(context.signal), IntegrationParseError);
    });
  } finally {
    await fixture.closeAsync();
  }
});

test("authority denial occurs before secret resolution or transport acquisition", async () => {
  const fixture = createFixture(async () => {
    throw new Error("Unexpected Fetch");
  });
  try {
    await assert.rejects(
      fixture.runtime.getHttpAuthenticationAsync(fixture.request("miniflux")),
      IntegrationRuntimeError,
    );
    await assert.rejects(
      fixture.runtime.executeNativeAsync(fixture.request("miniflux", []), "query", async () => undefined),
      IntegrationRuntimeError,
    );
    assert.deepEqual(fixture.counts(), { secretReads: 0, acquired: 0, released: 0 });
  } finally {
    await fixture.closeAsync();
  }
});

test.each(["abort", "stale"])("%s during testing-lease acquisition admits no provider request", async (change) => {
  const gate = Promise.withResolvers<undefined>();
  const entered = Promise.withResolvers<undefined>();
  const controller = new AbortController();
  let calls = 0;
  const fixture = createFixture(async () => {
    calls += 1;
    return Response.json({ reads: {}, unreads: {} });
  });
  fixture.beforeAcquire(async () => {
    entered.resolve(undefined);
    return await gate.promise;
  });
  try {
    const result = fixture.runtime
      .executeNativeAsync(fixture.request("miniflux", ["query"], controller.signal), "query", (client, context) =>
        client.getStatsAsync(context.signal),
      )
      .catch((error: unknown) => error);
    await entered.promise;
    if (change === "abort") controller.abort();
    else fixture.invalidate();
    gate.resolve(undefined);
    assert((await result) instanceof IntegrationRuntimeError);
    await fixture.closeAsync();
    assert.equal(calls, 0);
    assert.equal(fixture.counts().released, 1);
  } finally {
    gate.resolve(undefined);
    await fixture.closeAsync();
  }
});

test.each(["owned", "shared"])("%s lease remains physically pending after caller cancellation", async (ownership) => {
  const response = Promise.withResolvers<Response>();
  const entered = Promise.withResolvers<undefined>();
  const controller = new AbortController();
  const fixture = createFixture(async () => {
    entered.resolve(undefined);
    return response.promise;
  });
  if (ownership === "shared") fixture.shared();
  let closed = false;
  try {
    const result = fixture.runtime
      .executeNativeAsync(fixture.request("miniflux", ["query"], controller.signal), "query", (client, context) =>
        client.getStatsAsync(context.signal),
      )
      .catch((error: unknown) => error);
    await entered.promise;
    controller.abort();
    assert((await result) instanceof IntegrationRuntimeError);
    assert.equal(fixture.runtime.pendingCount, 1);
    assert.equal(fixture.counts().released, 0);
    const drain = fixture.runtime.closeAsync().then(() => {
      closed = true;
    });
    await Promise.resolve();
    assert.equal(closed, false);
    response.resolve(Response.json({ reads: {}, unreads: {} }));
    await drain;
    assert.equal(fixture.runtime.pendingCount, 0);
    assert.equal(fixture.counts().released, ownership === "owned" ? 1 : 0);
  } finally {
    response.resolve(Response.json({ reads: {}, unreads: {} }));
    await fixture.closeAsync();
  }
});

test("compiled Frigate rejects HTTP before reading credential values", async () => {
  let secretReads = 0;
  let calls = 0;
  const input = {
    id: "http-frigate",
    kind: "frigate" as const,
    name: "Synthetic Frigate",
    url: "http://frigate.invalid/prefix",
    externalUrl: null,
    get decryptedSecrets(): [] {
      secretReads += 1;
      throw new Error("Secret access forbidden");
    },
  };
  const context = createStatsFetchContext(input, new AbortController().signal, {
    fetchAsync: async () => {
      calls += 1;
      throw new Error("Unexpected Fetch");
    },
  });
  await assert.rejects(frigateStatsProvider.getHttpAuthenticationAsync(context));
  await assert.rejects(frigateStatsProvider.fetchAsync(context));
  assert.equal(secretReads, 0);
  assert.equal(calls, 0);
});

test("compiled Frigate login cancels private bodies and verifies profile before stats", async () => {
  const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.test_signature";
  const paths: string[] = [];
  const body = new Response("synthetic-private-body", {
    headers: { "set-cookie": `frigate_token=${token}; HttpOnly; Path=/` },
  });
  const fixture = createFixture(async (url, init) => {
    const path = new URL(String(url)).pathname;
    paths.push(path);
    assert.equal(init?.redirect, "error");
    if (path.endsWith("/login")) {
      assert.equal(init?.method, "POST");
      assert.equal(init?.body, JSON.stringify({ user: "operator", password: "synthetic-password" }));
      return body;
    }
    assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${token}`);
    if (path.endsWith("/profile")) return Response.json({ username: "operator", role: "admin", allowed_cameras: [] });
    return Response.json({ cameras: { front: {} }, service: { uptime: 42, version: "0.18.0" } });
  });
  try {
    const result = await fixture.runtime.executeNativeAsync(fixture.request("frigate"), "query", (client, context) =>
      client.getStatsAsync(context.signal),
    );
    assert.deepEqual(result, { cameras: 1, uptime: 42, version: "0.18.0" });
    assert.deepEqual(paths, ["/prefix/api/login", "/prefix/api/profile", "/prefix/api/stats"]);
    assert.equal(body.bodyUsed, true);
    assert.equal(fixture.counts().released, 1);
  } finally {
    await fixture.closeAsync();
  }
});

test("async HTTP authentication keeps its 15s cap and default stats keeps its 30s cap", async () => {
  const timeout = vi.spyOn(AbortSignal, "timeout");
  const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.test_signature";
  const fixture = createFixture(async (url) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/login"))
      return new Response(null, { headers: { "set-cookie": `frigate_token=${token}; Path=/` } });
    if (path.endsWith("/profile")) return Response.json({ username: "operator", role: "admin", allowed_cameras: [] });
    return Response.json({ cameras: {}, service: { uptime: 42, version: "0.18.0" } });
  });
  try {
    await fixture.runtime.getHttpAuthenticationAsync(fixture.request("frigate", ["full"]));
    await fixture.runtime.executeNativeAsync(fixture.request("frigate"), "query", (client) => client.getStatsAsync());
    assert(timeout.mock.calls.some(([milliseconds]) => milliseconds === 15_000));
    assert(timeout.mock.calls.some(([milliseconds]) => milliseconds === 30_000));
  } finally {
    timeout.mockRestore();
    await fixture.closeAsync();
  }
});

test("compiled Caddy selects injected Axios and Linkwarden preserves pagination", async () => {
  let axiosCalls = 0;
  const caddy = createFixture(async () => {
    throw new Error("Caddy must not use Fetch");
  });
  caddy.axios(async (config) => {
    axiosCalls += 1;
    assert.equal(config.url, "https://caddy.invalid/prefix/reverse_proxy/upstreams");
    assert.equal(config.maxRedirects, 0);
    assert(config.signal);
    return {
      data: [
        { num_requests: 2, fails: 1 },
        { num_requests: 7, fails: 0 },
      ],
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  });
  try {
    assert.deepEqual(
      await caddy.runtime.executeNativeAsync(caddy.request("caddy"), "query", (client, context) =>
        client.getStatsAsync(context.signal),
      ),
      { upstreams: 2, requests: 9, requestsFailed: 1 },
    );
    assert.equal(axiosCalls, 1);
  } finally {
    await caddy.closeAsync();
  }
  const paths: string[] = [];
  const linkwarden = createFixture(async (url, init) => {
    const target = new URL(String(url));
    paths.push(`${target.pathname}${target.search}`);
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer synthetic-token");
    if (target.pathname.endsWith("/collections"))
      return Response.json([{ _count: { links: 9 } }, { _count: { links: 4 } }]);
    if (!target.search) return Response.json({ response: [], data: { tags: [{}], nextCursor: "a b" } });
    return Response.json({ data: { tags: [{}, {}], nextCursor: null } });
  });
  try {
    assert.deepEqual(
      await linkwarden.runtime.executeNativeAsync(linkwarden.request("linkwarden"), "query", (client, context) =>
        client.getStatsAsync(context.signal),
      ),
      { links: 13, collections: 2, tags: 3 },
    );
    assert.deepEqual(paths, ["/prefix/api/v1/collections", "/prefix/api/v1/tags", "/prefix/api/v1/tags?cursor=a%20b"]);
  } finally {
    await linkwarden.closeAsync();
  }
});

test("declared authentication overrides provider request header and query collisions", async () => {
  for (const kind of ["linkwarden", "autobrr"] as const) {
    let calls = 0;
    const client = new StatsIntegration(
      {
        id: `precedence-${kind}`,
        kind,
        name: "Synthetic precedence seam",
        url: "https://precedence.invalid/prefix///",
        externalUrl: null,
        decryptedSecrets: [{ kind: "apiKey", value: "synthetic-token" }],
      },
      {
        metrics: [],
        getHttpAuthentication: () => {
          throw new Error("Declared authentication must bypass adapter auth");
        },
        fetchAsync: async (context) => ({
          result: String(
            await context.requestAsync("/stats?apikey=provider&cursor=next", {
              headers: { Authorization: "provider" },
            }),
          ),
        }),
      },
    );
    const dispatcher = new MockAgent();
    dispatcher.disableNetConnect();
    try {
      const result = await client.getStatsAsync(new AbortController().signal, {
        dispatcher,
        axiosInstance: createSyntheticAxios(),
        options: { ca: [], checkServerIdentity },
        fetchAsync: async (url, init) => {
          calls += 1;
          const target = new URL(String(url));
          assert.equal(target.pathname, "/prefix/stats");
          assert.equal(target.searchParams.get("cursor"), "next");
          if (kind === "linkwarden")
            assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer synthetic-token");
          else assert.equal(target.searchParams.get("apikey"), "synthetic-token");
          return Response.json("ok");
        },
      });
      assert.deepEqual(result, { result: "ok" });
      assert.equal(calls, 1);
    } finally {
      await dispatcher.close();
    }
  }
});
