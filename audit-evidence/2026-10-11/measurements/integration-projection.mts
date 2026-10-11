import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { setImmediate } from "node:timers/promises";
import assert from "node:assert/strict";
import { parse } from "@babel/parser";
import { eq } from "drizzle-orm";
import { createDb } from "../../../packages/db/test/db-mock";
import * as schema from "../../../packages/db/schema/sqlite";

const directory = new URL("../", import.meta.url);
const sourcePath = "packages/api/src/middlewares/integration.ts";
const [mode, variant, sizeText] = process.argv.slice(2);

function queryRelations(text: string) {
  const source = parse(text, { sourceType: "module", plugins: ["typescript"] });
  let relations: string | undefined;
  function visit(node: any) {
    if (relations) return;
    if (node.type === "CallExpression" && text.slice(node.callee.start, node.callee.end) === "ctx.db.query.integrations.findFirst") {
      const options = node.arguments[0];
      assert.equal(options.type, "ObjectExpression");
      const property = options.properties.find((entry: any) => entry.type === "ObjectProperty" && entry.key.name === "with");
      assert(property);
      relations = text.slice(property.value.start, property.value.end);
      return;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) if (child && typeof child === "object" && "type" in child) visit(child);
      } else if (value && typeof value === "object" && "type" in value) visit(value);
    }
  }
  visit(source);
  assert(relations, "Actual source query configuration must be present");
  return Function(`return (${relations})`)();
}

if (mode === "child") {
  const size = Number(sizeText);
  const text = readFileSync(new URL(`baseline-source/${sourcePath}`, directory), "utf8");
  let relations = queryRelations(text);
  if (variant === "after") relations = queryRelations(readFileSync(sourcePath, "utf8"));
  const db = createDb();
  db.insert(schema.boards).values({ id: "board", name: "synthetic-public-board", isPublic: true }).run();
  db.insert(schema.integrations).values({ id: "integration", name: "synthetic", kind: "overseerr", url: "http://synthetic.invalid" }).run();
  const options = JSON.stringify({ json: { template: "x".repeat(16 * 1024) } });
  const advancedOptions = JSON.stringify({ json: { template: "y".repeat(16 * 1024) } });
  db.transaction((transaction) => {
    for (let index = 0; index < size; index++) {
      const id = `item-${index}`;
      transaction.insert(schema.items).values({ id, boardId: "board", kind: "customApi", options, advancedOptions }).run();
      transaction.insert(schema.integrationItems).values({ itemId: id, integrationId: "integration" }).run();
    }
  });
  const query = () => db.query.integrations.findFirst({ where: eq(schema.integrations.id, "integration"), with: relations });
  await query();
  await setImmediate();
  global.gc!();
  const start = process.memoryUsage();
  let result = await query();
  const allocated = process.memoryUsage();
  await setImmediate();
  global.gc!();
  const held = process.memoryUsage();
  assert(result);
  assert.equal(result.items.length, size);
  const authorizedBoards = result.items.map((entry: any) => entry.item.boardId);
  assert(authorizedBoards.every((id: string) => id === "board"));
  const downstream = ((record: any) => {
    const { items, groupPermissions, userPermissions, secrets, ...rest } = record;
    return JSON.stringify({ ...rest, externalUrl: rest.app?.href ?? null, decryptedSecrets: secrets });
  })(result);
  const materializedBytes = Buffer.byteLength(JSON.stringify(result));
  result = undefined;
  await setImmediate();
  global.gc!();
  const released = process.memoryUsage();
  const times: number[] = [];
  const cycles: object[] = [];
  for (let index = 0; index < 20; index++) {
    const then = performance.now();
    let cycleResult = await query();
    times.push(performance.now() - then);
    assert.equal(cycleResult!.items.length, size);
    cycleResult = undefined;
    await setImmediate();
    global.gc!();
    cycles.push(process.memoryUsage());
  }
  writeFileSync(1, JSON.stringify({ variant, size, materializedBytes, downstream, authorizedBoards,
    start, allocated, held, released, cycles, times,
    sampledPeakRss: Math.max(start.rss, allocated.rss, held.rss, released.rss, ...cycles.map((entry: any) => entry.rss)),
    limits: { heapMiB: 512, concurrency: 1, cache: "warm SQLite; one warm-up query", optionBytesPerLinkedItem: Buffer.byteLength(options) + Buffer.byteLength(advancedOptions) },
  }));
  process.exit(0);
}

const samples: any[] = [];
for (const size of [1, 25, 250]) {
  for (let pair = 0; pair < 9; pair++) {
    const order = pair % 2 === 0 ? ["before", "after"] : ["after", "before"];
    const paired: any[] = [];
    for (const selected of order) {
      const child = spawnSync(process.execPath, ["--max-old-space-size=512", "--expose-gc", "--import", "tsx", import.meta.filename, "child", selected, String(size)], {
        env: { ...process.env, NODE_ENV: "production", DB_DRIVER: "better-sqlite3", DB_URL: ":memory:", SECRET_ENCRYPTION_KEY: "0".repeat(64), LOG_LEVEL: "error" },
        encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
      });
      assert.equal(child.status, 0, child.stderr + child.stdout);
      const sample = JSON.parse(child.stdout);
      sample.pair = pair;
      sample.order = order;
      paired.push(sample);
      samples.push(sample);
    }
    assert.equal(paired[0].downstream, paired[1].downstream, "Middleware downstream output must be unchanged");
    assert.deepEqual(paired[0].authorizedBoards, paired[1].authorizedBoards, "Auth board IDs must be unchanged");
  }
}
writeFileSync(new URL("integration-projection-raw.json", import.meta.url), JSON.stringify({
  method: "Actual source findFirst relation configuration, actual migrated SQLite/Drizzle; isolated Node processes, nine alternating pairs per size, 20 repeated released queries. Source-baseline vs current code. Process snapshots sample peaks, not exact peaks. Materialized bytes are process query result serialization, not network. No whole-app claim. ArrayBuffers included in external, not summed.",
  node: process.version, samples,
}, null, 2));
for (const size of [1, 25, 250]) {
  const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const summary: any = { size };
  for (const selected of ["before", "after"]) {
    const group = samples.filter((entry) => entry.size === size && entry.variant === selected);
    summary[selected] = {
      materializedBytes: median(group.map((entry) => entry.materializedBytes)),
      heldHeapDelta: median(group.map((entry) => entry.held.heapUsed - entry.start.heapUsed)),
      queryMs: median(group.map((entry) => median(entry.times))),
      sampledPeakRss: median(group.map((entry) => entry.sampledPeakRss)),
      repeatedCycleHeapGrowth: median(group.map((entry) => entry.cycles.at(-1).heapUsed - entry.cycles[0].heapUsed)),
    };
  }
  console.log(JSON.stringify(summary));
}
