import assert from "node:assert/strict";
import { createServer } from "node:http";
import crypto from "node:crypto";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { writeFileSync } from "node:fs";

process.env.DB_DRIVER = "better-sqlite3";
process.env.DB_URL = ":memory:";
process.env.SECRET_ENCRYPTION_KEY = "0".repeat(64);
process.env.NODE_ENV = "test";
process.env.CI = "true";
const root = process.env.ROOT;
const output = process.env.OUT;
if (!root || !output) throw new Error("ROOT and OUT required");
const require = createRequire(`${root}/package.json`);
let decrypts = 0;
let hashes = 0;
const createDecipheriv = crypto.createDecipheriv;
const createHash = crypto.createHash;
crypto.createDecipheriv = function (...args) {
  decrypts++;
  return createDecipheriv(...args);
};
crypto.createHash = function (...args) {
  hashes++;
  return createHash(...args);
};
syncBuiltinESMExports();
const { Agent } = require("undici");
let dispatchers = 0;
const seen = new WeakSet();
const agentRequest = Agent.prototype.request;
Agent.prototype.request = function (...args) {
  if (!seen.has(this)) {
    seen.add(this);
    dispatchers++;
  }
  return agentRequest.apply(this, args);
};
const { appRouter } = await import(`${root}/packages/api/src/root.ts`);
const { createDb } = await import(`${root}/packages/db/test/index.ts`);
const schema = await import(`${root}/packages/db/schema/sqlite.ts`);
const { eq } = await import(`${root}/packages/db/index.ts`);
const { encryptSecret } = await import(`${root}/packages/common/src/server.ts`);
const { serializeCustomWidgetDefinition } = await import(
  `${root}/packages/api/src/router/custom-widget/stored-definition.ts`
);
const { invalidateCustomWidgetResponseCache } = await import(
  `${root}/packages/custom-widgets/src/server/request-executor.ts`
);
const { stringify } = require("superjson");
const db = createDb();
let reads = 0;
let resultBytes = 0;
let queries: string[] = [];
const prepare = db.$client.prepare.bind(db.$client);
db.$client.prepare = (sql: string) => {
  const statement = prepare(sql);
  if (/^select/iu.test(sql)) {
    for (const method of ["all", "get"] as const) {
      const original = statement[method].bind(statement);
      statement[method] = (...args: unknown[]) => {
        reads++;
        queries.push(sql);
        const result = original(...args);
        resultBytes += Buffer.byteLength(JSON.stringify(result) ?? "");
        return result;
      };
    }
  }
  return statement;
};
let upstreamRequests = 0;
let sockets = 0;
const server = createServer((request, response) => {
  upstreamRequests++;
  const payload = JSON.stringify({ ok: true, data: "small response", authorization: request.headers.authorization });
  response.writeHead(200, { "content-type": "application/json" });
  setTimeout(() => response.end(payload), 1);
});
server.on("connection", () => sockets++);
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;
const secret = "benchmark-key-1234567890";
let nextId = 0;
await db.insert(schema.users).values([{ id: "owner" }, { id: "visitor" }]);
await db.insert(schema.boards).values({ id: "board", name: "Benchmark", creatorId: "owner", isPublic: true });
await db.insert(schema.integrations).values({ id: "integration", name: "API", kind: "sonarr", url: baseUrl });
await db
  .insert(schema.integrationSecrets)
  .values({ integrationId: "integration", kind: "apiKey", value: encryptSecret(secret) });
await db
  .insert(schema.integrationUserPermissions)
  .values({ integrationId: "integration", userId: "owner", permission: "full" });
const session = {
  user: { id: "owner", permissions: ["admin"], colorScheme: "light" },
  expires: new Date(Date.now() + 3600000).toISOString(),
};
const caller = appRouter.createCaller({ db, session, deviceType: undefined });

async function makeFixture(count: number, integration: boolean, secretSize = 0) {
  const id = `fixture-${++nextId}`;
  const sources = integration
    ? { default: { type: "integration", name: "API", integrationId: "integration", integrationKind: "sonarr" } }
    : { default: { name: "API", baseUrl, auth: "bearer" } };
  const requests = Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `q${index}`,
      {
        source: "default",
        kind: "query",
        method: "GET",
        path: `/status/${index}`,
        auth: "inherit",
        permission: "view",
        trigger: "load",
        cacheSeconds: 30,
      },
    ]),
  );
  const definition = {
    $schema: "homarr-custom-widget-v2",
    name: id,
    sources,
    requests,
    options: {},
    template: "<Text>{data.q0?.ok}</Text>",
  };
  await db
    .insert(schema.customWidgetDefinitions)
    .values({ id, creatorId: "owner", ...serializeCustomWidgetDefinition(definition) });
  if (!integration)
    await db.insert(schema.customWidgetSecrets).values({
      definitionId: id,
      sourceId: "default",
      kind: "apiKey",
      encryptedValue: encryptSecret(secretSize ? "x".repeat(secretSize) : secret),
    });
  await db.insert(schema.items).values({
    id,
    boardId: "board",
    kind: "customApi",
    options: stringify({ definitionId: id, configuration: {}, configurationVersion: 1 }),
  });
  return id;
}

const results = [];
async function measure(name: string, callback: () => Promise<unknown>, iterations = 30, warmups = 3) {
  for (let index = 0; index < warmups; index++) await callback();
  const samples = [];
  const operations = [];
  for (let index = 0; index < iterations; index++) {
    reads = decrypts = hashes = dispatchers = upstreamRequests = sockets = resultBytes = 0;
    queries = [];
    const startedAt = performance.now();
    await callback();
    samples.push(performance.now() - startedAt);
    operations.push({ reads, decrypts, hashes, dispatchers, upstreamRequests, sockets, resultBytes });
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const result = {
    name,
    p50: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    samples,
    operations,
  };
  results.push(result);
  console.log(JSON.stringify({ ...result, samples: undefined, operations: operations[0] }));
}

for (const integration of [false, true]) {
  for (const count of [1, 4, 20]) {
    const fixtures = await Promise.all(Array.from({ length: 38 }, () => makeFixture(count, integration)));
    let cursor = 0;
    const assertLoaded = (response) =>
      assert(
        Object.values(response.status).every((entry) => entry.ok),
        JSON.stringify(response.status),
      );
    await measure(`${integration ? "integration" : "direct"}-${count}-cold`, async () => {
      const itemId = fixtures[cursor++];
      assertLoaded(await caller.widget.customApi.getData({ itemId }));
    });
    const itemId = fixtures[0];
    await measure(`${integration ? "integration" : "direct"}-${count}-warm`, async () => {
      assertLoaded(await caller.widget.customApi.getData({ itemId }));
    });
  }
}
const concurrentFixtures = await Promise.all(Array.from({ length: 38 }, () => makeFixture(1, true)));
let cursor = 0;
await measure("identical-concurrent-4", async () => {
  const itemId = concurrentFixtures[cursor++];
  const responses = await Promise.all(Array.from({ length: 4 }, () => caller.widget.customApi.getData({ itemId })));
  assert(responses.every((entry) => entry.status.q0.ok));
});
const protectedId = await makeFixture(1, true);
await caller.widget.customApi.getData({ itemId: protectedId });
await db.delete(schema.integrationUserPermissions).where(eq(schema.integrationUserPermissions.userId, "owner"));
const denied = await caller.widget.customApi.getData({ itemId: protectedId });
assert.equal(denied.status.q0.ok, false);
await db
  .insert(schema.integrationUserPermissions)
  .values({ integrationId: "integration", userId: "owner", permission: "full" });
const visitor = appRouter.createCaller({
  db,
  session: { ...session, user: { ...session.user, id: "visitor", permissions: [] } },
  deviceType: undefined,
});
assert.equal((await visitor.widget.customApi.getData({ itemId: protectedId })).status.q0.ok, false);
const beforeSecrets = await makeFixture(1, false, 16_384);
await measure("management-get-16KiB-secret", () => caller.customWidget.get({ id: beforeSecrets }));
await db.insert(schema.legacyCustomWidgetDefinitions).values(
  Array.from({ length: 20 }, (_, index) => ({
    id: `legacy-${index}`,
    name: `Legacy ${index}`,
    url: baseUrl,
    requestBody: JSON.stringify({ value: "x".repeat(64 * 1024) }),
    displayConfig: stringify({ html: "x".repeat(64 * 1024) }),
  })),
);
await measure("management-list", () => caller.customWidget.list(), 10, 1);
invalidateCustomWidgetResponseCache(["custom-jsx:"]);
server.closeAllConnections();
await new Promise<void>((resolve) => server.close(() => resolve()));
writeFileSync(
  output,
  JSON.stringify({ root, results, checks: { warmRevocation: true, crossUserDenial: true } }, null, 2),
);
process.exit(0);
