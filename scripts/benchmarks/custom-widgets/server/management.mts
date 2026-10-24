import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
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
const { appRouter } = await import(`${root}/packages/api/src/root.ts`);
const { createDb } = await import(`${root}/packages/db/test/index.ts`);
const schema = await import(`${root}/packages/db/schema/sqlite.ts`);
const { encryptSecret } = await import(`${root}/packages/common/src/server.ts`);
const { serializeCustomWidgetDefinition } = await import(
  `${root}/packages/api/src/router/custom-widget/stored-definition.ts`
);
const { stringify } = require("superjson");
const db = createDb();
await db.insert(schema.users).values({ id: "owner" });
await db.insert(schema.boards).values({ id: "board", name: "Board", creatorId: "owner" });
const date = new Date("2026-01-01T00:00:00Z");
const definition = {
  $schema: "homarr-custom-widget-v2",
  name: "Definition",
  template: "<Text>Widget</Text>",
  sources: { default: { baseUrl: "http://localhost", auth: "bearer" } },
  requests: {},
  options: {},
};
await db
  .insert(schema.customWidgetDefinitions)
  .values({ id: "definition", ...serializeCustomWidgetDefinition(definition), createdAt: date, updatedAt: date });
await db.insert(schema.customWidgetSecrets).values({
  definitionId: "definition",
  sourceId: "default",
  kind: "apiKey",
  encryptedValue: encryptSecret("x".repeat(8192)),
  updatedAt: date,
});
await db.insert(schema.legacyCustomWidgetDefinitions).values(
  Array.from({ length: 20 }, (_, index) => ({
    id: `legacy${index}`,
    name: `Legacy ${index}`,
    url: "http://localhost",
    requestBody: JSON.stringify({ payload: "x".repeat(64 * 1024) }),
    displayConfig: stringify({ html: "x".repeat(64 * 1024) }),
    createdAt: date,
    updatedAt: date,
  })),
);
const caller = appRouter.createCaller({
  db,
  session: { user: { id: "owner", permissions: ["admin"], colorScheme: "light" }, expires: "2030-01-01" },
  deviceType: undefined,
});
let bytes = 0;
let reads = 0;
const prepare = db.$client.prepare.bind(db.$client);
db.$client.prepare = (sql) => {
  const statement = prepare(sql);
  if (/^select/iu.test(sql))
    for (const method of ["all", "get"]) {
      const original = statement[method].bind(statement);
      statement[method] = (...args) => {
        reads++;
        const result = original(...args);
        bytes += Buffer.byteLength(JSON.stringify(result) ?? "");
        return result;
      };
    }
  return statement;
};
const results = [];
for (const [name, callback] of [
  ["get-8192-byte-secret", () => caller.customWidget.get({ id: "definition" })],
  ["list-20-legacy", () => caller.customWidget.list()],
  ["available-legacy", () => caller.customWidget.available({ boardId: "board", currentId: "legacy0" })],
]) {
  for (let i = 0; i < 5; i++) await callback();
  const samples = [];
  const operations = [];
  let result;
  for (let i = 0; i < 30; i++) {
    bytes = reads = 0;
    const started = performance.now();
    result = await callback();
    samples.push(performance.now() - started);
    operations.push({ reads, bytes });
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const digest = createHash("sha256").update(JSON.stringify(result)).digest("hex");
  results.push({ name, p50: sorted[15], p95: sorted[28], operations, samples, digest });
}
assert.equal(results.length, 3);
writeFileSync(output, JSON.stringify({ root, results }, null, 2));
console.log(
  JSON.stringify(
    results.map(({ samples: _samples, operations, ...result }) => ({ ...result, operations: operations[0] })),
  ),
);
process.exit(0);
