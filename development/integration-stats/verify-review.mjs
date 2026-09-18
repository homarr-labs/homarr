import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
const root = process.cwd();
async function isolated(file) {
  const source = await readFile(`${root}/${file}`, "utf8");
  const stripped = stripTypeScriptTypes(source).replace(
    'from "zod"',
    `from "file://${root}/node_modules/zod/index.js"`,
  );
  return import(`data:text/javascript;base64,${Buffer.from(stripped).toString("base64")}`);
}
const { linkwardenStatsProvider: p } = await isolated("packages/integrations/src/stats/providers/linkwarden.ts");
const calls = [];
const context = {
  signal: new AbortController().signal,
  secret: () => "test",
  requestAsync: async (path) => {
    calls.push(path);
    if (path.includes("collections")) return [{ _count: { links: 4 } }];
    if (path.includes("cursor=")) return { data: { tags: [{ id: 51 }, { id: 52 }], nextCursor: null } };
    return { response: [], data: { tags: Array.from({ length: 50 }, (_, id) => ({ id })), nextCursor: 50 } };
  },
};
assert.deepEqual(await p.fetchAsync(context), { links: 4, collections: 1, tags: 52 });
assert.equal(calls.length, 3);
await assert.rejects(
  p.fetchAsync({
    ...context,
    requestAsync: async (path) => (path.includes("collections") ? [] : { data: { tags: [], nextCursor: 2 } }),
  }),
  /pagination/,
);
const { withHttpRequestSignalAsync: scope, getHttpRequestSignal: current } = await isolated(
  "packages/core/src/infrastructure/http/request-signal.ts",
);
const a = new AbortController(),
  b = new AbortController();
await Promise.all([
  scope(a.signal, async () => {
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(current(), a.signal);
    a.abort();
    assert.throws(() => current().throwIfAborted());
  }),
  scope(b.signal, async () => {
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(current(), b.signal);
    assert.equal(current().aborted, false);
    const c = new AbortController();
    const combined = current(c.signal);
    c.abort();
    assert.equal(combined.aborted, true);
  }),
]);
assert.equal(current(), undefined);
console.log(
  "PASS: Linkwarden cursor pagination, legacy-envelope precedence, repeated-cursor guard; concurrent signal isolation and composition.",
);
