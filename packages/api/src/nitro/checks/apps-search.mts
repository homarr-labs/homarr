import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Database as SqliteDatabase } from "bun:sqlite";
import { call, ORPCError } from "@orpc/server";
import { and, asc, eq, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { createSelectSchema } from "drizzle-zod";
import { parse, stringify } from "superjson";

import type { Database } from "@homarr/db";

import * as schema from "../../../../db/schema/sqlite";
import { backendContractRevision, createBackendContext } from "../context";
import type { BackendContext, BackendPrincipal } from "../context";
import { createBackendServerClient, defineBackendContribution } from "../contribution";
import { sourcePortRows } from "../port-map";
import { getSourceProcedureMeta, getSourceProjectionMeta } from "../procedure";
import { appImplementedPaths, appSourceBindings, createAppContribution } from "../routers/app";
import { bangsSearchInputSchema, bangsSourceBindings, searchDuckDuckGoBangsAsync } from "../routers/bangs";
import {
  createSearchEngineContribution,
  searchEngineImplementedPaths,
  searchEngineSourceBindings,
} from "../routers/search-engine";

const raw = new SqliteDatabase(":memory:");
raw.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE app (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT, iconUrl TEXT NOT NULL, href TEXT, pingUrl TEXT);
CREATE TABLE board (id TEXT PRIMARY KEY NOT NULL, isPublic INTEGER NOT NULL);
CREATE TABLE item (id TEXT PRIMARY KEY NOT NULL, boardId TEXT NOT NULL REFERENCES board(id), kind TEXT NOT NULL, options TEXT NOT NULL, advancedOptions TEXT NOT NULL);
CREATE TABLE icon (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL, checksum TEXT NOT NULL, iconRepositoryId TEXT NOT NULL);
CREATE TABLE integration (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL, kind TEXT NOT NULL, appId TEXT REFERENCES app(id) ON DELETE SET NULL);
CREATE TABLE search_engine (id TEXT PRIMARY KEY NOT NULL, iconUrl TEXT NOT NULL, name TEXT NOT NULL, short TEXT UNIQUE NOT NULL, description TEXT, urlTemplate TEXT, type TEXT NOT NULL DEFAULT 'generic', integrationId TEXT REFERENCES integration(id) ON DELETE CASCADE);
CREATE TABLE user (id TEXT PRIMARY KEY NOT NULL, defaultSearchEngineId TEXT);
CREATE TABLE serverSetting (settingKey TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
`);
const queries: string[] = [];
const db = drizzle(raw, {
  schema,
  logger: {
    logQuery(query) {
      queries.push(query);
    },
  },
}) as unknown as Database;
const invalidations: string[] = [];
const warnings: Error[] = [];
let nextId = 0;
const createId = () => `fixture-${++nextId}`;
const appContribution = createAppContribution({
  tables: schema,
  operators: { asc, eq, inArray, like, or },
  selectAppSchema: createSelectSchema(schema.apps),
  createId,
  async invalidateIntegrationResponseCacheAsync(id) {
    invalidations.push(id);
  },
});
const searchContribution = createSearchEngineContribution({
  tables: schema,
  operators: { and, asc, eq, like },
  createId,
  warn(error) {
    warnings.push(error);
  },
});
const contribution = defineBackendContribution({
  revision: backendContractRevision,
  id: "disposable-apps-search-check",
  router: { ...appContribution.router, ...searchContribution.router },
  leaves: [...appImplementedPaths, ...searchEngineImplementedPaths],
});
const bindings = [...appSourceBindings, ...searchEngineSourceBindings, ...bangsSourceBindings];
const sourcePaths = sourcePortRows
  .filter(([path]) => path.startsWith("app.") || path.startsWith("searchEngine.") || path.startsWith("bangs."))
  .map(([path]) => path);
assert.deepEqual(bindings.map(({ path }) => path).toSorted(), sourcePaths.toSorted());
assert.equal(bindings.length, 20);
assert.equal(bindings.filter(({ status }) => status === "native").length, 18);
assert.equal(new Set(bindings.map(({ path }) => path)).size, 20);
const sourceFiles = new Map<string, string>();
for (const binding of bindings) {
  let source = sourceFiles.get(binding.sourceFile);
  if (!source) {
    source = await readFile(binding.sourceFile, "utf8");
    sourceFiles.set(binding.sourceFile, source);
  }
  const leaf = binding.path.split(".").at(-1);
  assert.ok(leaf);
  assert.match(source, new RegExp(`^  ${leaf}:`, "m"));
}
for (const procedure of [
  ...Object.values(appContribution.router.app),
  ...Object.values(searchContribution.router.searchEngine),
]) {
  const descriptor = getSourceProcedureMeta(procedure);
  assert.ok(descriptor);
  const sourceRow = sourcePortRows.find(([path]) => path === descriptor.path);
  assert.ok(sourceRow);
  assert.equal(descriptor.kind, sourceRow[1] === "Q" ? "query" : "mutation");
}
assert.equal("delete" in contribution.router.searchEngine, false);
assert.equal("bangs" in contribution.router, false);
assert.throws(
  () =>
    defineBackendContribution({
      revision: backendContractRevision,
      id: "wrong-app-path",
      router: { app: { wrong: appContribution.router.app.byId } },
      leaves: ["app.byId"],
    }),
  /route does not match/,
);
assert.equal(getSourceProcedureMeta(appContribution.router.app.create)?.path, "app.create");
assert.equal(getSourceProjectionMeta(appContribution.router.app.byId)?.openapi?.protect, true);
assert.equal(getSourceProjectionMeta(appContribution.router.app.create)?.mcp?.enabled, true);
assert.equal(getSourceProjectionMeta(searchContribution.router.searchEngine.catalog)?.mcp?.enabled, true);

const reader: BackendPrincipal = {
  kind: "authenticated",
  user: { id: "reader", permissions: [], colorScheme: "dark", name: null, email: null, image: null },
};
const creator: BackendPrincipal = {
  kind: "authenticated",
  user: { ...reader.user, permissions: ["app-create", "search-engine-create"] },
};
const manager: BackendPrincipal = {
  kind: "authenticated",
  user: {
    ...reader.user,
    permissions: [
      "app-create",
      "app-modify-all",
      "app-full-all",
      "search-engine-create",
      "search-engine-modify-all",
      "search-engine-full-all",
    ],
  },
};
const anonymous: BackendPrincipal = { kind: "anonymous" };
function context(
  principal: BackendPrincipal,
  database = db,
  signal = new AbortController().signal,
  demo = { enabled: false, readOnly: false },
): BackendContext {
  return createBackendContext({
    db: database,
    principal,
    signal,
    demo,
    request: new Request("https://disposable.invalid/rpc"),
    deviceType: undefined,
    setup: {
      async isClaimOnlyAccessAllowed() {
        throw new Error("No setup access in app/search checks");
      },
      async currentStep() {
        throw new Error("No setup access in app/search checks");
      },
    },
    effect() {
      throw new Error("Unexpected response effect");
    },
    onDispose() {
      throw new Error("Unexpected resource acquisition");
    },
  });
}
async function expectCode(operation: Promise<unknown>, code: string) {
  await assert.rejects(operation, (error: unknown) => error instanceof ORPCError && error.code === code);
}
let deniedTouches = 0;
const deniedDb = new Proxy(db, {
  get() {
    deniedTouches++;
    throw new Error("Denied operations must not touch the database");
  },
});
const deniedCreator = createBackendServerClient(contribution, context(creator, deniedDb));
const deniedAnonymous = createBackendServerClient(contribution, context(anonymous, deniedDb));
await expectCode(deniedCreator.app.all(undefined), "FORBIDDEN");
await expectCode(deniedCreator.app.search({ query: "private" }), "FORBIDDEN");
await expectCode(
  deniedCreator.app.update({
    id: "private",
    name: "private",
    description: null,
    iconUrl: "fixture-icon",
    href: "",
    pingUrl: "",
  }),
  "FORBIDDEN",
);
await expectCode(deniedCreator.app.delete({ id: "private" }), "FORBIDDEN");
await expectCode(
  deniedCreator.searchEngine.update({
    id: "private",
    type: "generic",
    name: "private",
    iconUrl: "fixture-icon",
    description: null,
    urlTemplate: "https://example.invalid/%s",
  }),
  "FORBIDDEN",
);
await expectCode(deniedAnonymous.app.selectable(undefined), "UNAUTHORIZED");
await expectCode(deniedAnonymous.searchEngine.byId({ id: "private" }), "UNAUTHORIZED");
await expectCode(
  call(
    contribution.router.app.create,
    { name: "guarded", description: null, iconUrl: "fixture-icon", href: "", pingUrl: "" },
    { context: context(manager, deniedDb, new AbortController().signal, { enabled: true, readOnly: true }) },
  ),
  "FORBIDDEN",
);
const aborted = new AbortController();
aborted.abort(new Error("Disposable request stopped"));
await expectCode(
  call(
    contribution.router.app.create,
    { name: "aborted", description: null, iconUrl: "fixture-icon", href: "", pingUrl: "" },
    { context: context(manager, deniedDb, aborted.signal) },
  ),
  "INTERNAL_SERVER_ERROR",
);
assert.equal(deniedTouches, 0);

const app = createBackendServerClient(appContribution, context(manager)).app;
const createOnlyApp = createBackendServerClient(appContribution, context(creator)).app;
const input = { name: "  Duplicate  ", description: "  ", iconUrl: "fixture-icon", href: "", pingUrl: "" };
const first = await createOnlyApp.create(input);
const second = await createOnlyApp.create(input);
assert.notEqual(first.id, second.id);
assert.equal(first.appId, first.id);
assert.equal(first.name, "Duplicate");
assert.equal(first.description, null);
assert.equal(first.href, null);
assert.equal(first.pingUrl, null);
await expectCode(app.create({ ...input, href: "javascript:alert(1)" }), "BAD_REQUEST");
await expectCode(app.create({ ...input, pingUrl: "file:///fixture" }), "BAD_REQUEST");
const protocol = await app.create({
  ...input,
  name: "Protocol",
  href: "vscode://fixture",
  pingUrl: "https://ping.invalid/fixture",
});
assert.equal(protocol.href, "vscode://fixture");
assert.equal(protocol.pingUrl, "https://ping.invalid/fixture");
const beforePaginated = queries.length;
const page = await app.getPaginated({ search: " Duplicate ", pageSize: 1, page: 2 });
assert.equal(page.totalCount, 2);
assert.equal(page.items.length, 1);
assert.equal(
  queries.slice(beforePaginated).some((query) => /order by .*"name" asc/i.test(query)),
  true,
);
assert.equal((await app.search({ query: "Duplicate" })).length, 2);
const boardModifier: BackendPrincipal = {
  kind: "authenticated",
  user: { ...reader.user, permissions: ["board-modify-all"] },
};
assert.equal(
  (await createBackendServerClient(appContribution, context(boardModifier)).app.search({ query: "Duplicate" })).length,
  2,
);
assert.equal((await createOnlyApp.selectable(undefined)).length, 3);

raw.query("INSERT INTO board VALUES (?, ?)").run("public-board", 1);
raw.query("INSERT INTO board VALUES (?, ?)").run("private-board", 0);
raw
  .query("INSERT INTO item VALUES (?, ?, ?, ?, ?)")
  .run("public-app", "public-board", "app", stringify({ appId: first.id }), stringify({}));
raw
  .query("INSERT INTO item VALUES (?, ?, ?, ?, ?)")
  .run("public-bookmarks", "public-board", "bookmarks", stringify({ items: [protocol.id] }), stringify({}));
raw
  .query("INSERT INTO item VALUES (?, ?, ?, ?, ?)")
  .run("private-app", "private-board", "app", stringify({ appId: second.id }), stringify({}));
const publicApp = createBackendServerClient(appContribution, context(anonymous)).app;
assert.equal((await publicApp.byId({ id: first.id })).id, first.id);
assert.equal((await publicApp.byId({ id: protocol.id })).id, protocol.id);
const beforePrivate = queries.length;
await expectCode(publicApp.byId({ id: second.id }), "NOT_FOUND");
assert.deepEqual(await publicApp.byIds([first.id, second.id]), []);
assert.equal(
  queries.slice(beforePrivate).some((query) => /from "app"/.test(query)),
  false,
);
assert.equal(
  (await createBackendServerClient(appContribution, context(reader)).app.byId({ id: second.id })).id,
  second.id,
);
assert.deepEqual(await publicApp.byIds([]), []);
raw
  .query("INSERT INTO icon VALUES (?, ?, ?, ?, ?)")
  .run("icon", "Suggested", "fixture-suggested-icon", "checksum", "fixture-repository");
await createOnlyApp.createMany([
  { ...input, name: "Suggested", iconUrl: null },
  { ...input, name: "Fallback", iconUrl: null },
  { ...input, name: "Explicit", iconUrl: "fixture-explicit-icon", pingUrl: "https://ignored-source-ping.invalid/" },
]);
const batch = await app.all(undefined);
assert.equal(batch.find(({ name }) => name === "Suggested")?.iconUrl, "fixture-suggested-icon");
assert.equal(
  batch.find(({ name }) => name === "Fallback")?.iconUrl,
  "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/homarr.svg",
);
assert.equal(batch.find(({ name }) => name === "Explicit")?.pingUrl, null);
raw
  .query("INSERT INTO integration VALUES (?, ?, ?, ?, ?)")
  .run("linked-a", "Link A", "https://integration.invalid/a", "jellyfin", protocol.id);
raw
  .query("INSERT INTO integration VALUES (?, ?, ?, ?, ?)")
  .run("linked-b", "Link B", "https://integration.invalid/b", "jellyfin", protocol.id);
const update = {
  id: protocol.id,
  name: "Protocol",
  description: null,
  iconUrl: "fixture-icon",
  href: "vscode://fixture",
  pingUrl: "",
};
await app.update(update);
assert.deepEqual(invalidations, []);
await app.update({ ...update, href: "https://changed.invalid/" });
assert.deepEqual(invalidations.toSorted(), ["linked-a", "linked-b"]);
assert.equal((await app.byId({ id: protocol.id })).pingUrl, null);
await app.delete({ id: protocol.id });
assert.equal(invalidations.length, 4);
assert.equal(
  raw.query<{ appId: string | null }, [string]>("SELECT appId FROM integration WHERE id = ?").get("linked-a")?.appId,
  null,
);
await expectCode(app.byId({ id: protocol.id }), "NOT_FOUND");

const search = createBackendServerClient(searchContribution, context(manager)).searchEngine;
await search.create({
  type: "generic",
  name: "Zulu",
  short: "ZZ",
  iconUrl: "fixture-icon",
  description: null,
  urlTemplate: "https://search.invalid/?q=%s",
});
await search.create({
  type: "generic",
  name: "Alpha",
  short: "Aa",
  iconUrl: "fixture-icon",
  description: null,
  urlTemplate: "https://search.invalid/%s",
});
await search.create({
  type: "fromIntegration",
  name: "Integrated",
  short: "AI",
  iconUrl: "fixture-icon",
  description: null,
  integrationId: "linked-a",
});
const engines = await search.getSelectable();
assert.deepEqual(
  engines.map(({ label }) => label),
  ["Alpha", "Integrated", "Zulu"],
);
assert.deepEqual(
  (await search.getSelectable({ withIntegrations: false })).map(({ label }) => label),
  ["Alpha", "Zulu"],
);
const alpha = engines.find(({ label }) => label === "Alpha");
assert.ok(alpha);
const integrated = engines.find(({ label }) => label === "Integrated");
assert.ok(integrated);
assert.equal((await search.byId({ id: alpha.value })).type, "generic");
await expectCode(search.byId({ id: "missing" }), "NOT_FOUND");
const beforeSearchPage = queries.length;
const enginePage = await search.getPaginated({ pageSize: 1, page: 1 });
assert.equal(enginePage.totalCount, 3);
assert.equal(enginePage.items[0]?.name, "Zulu");
assert.equal(
  queries.slice(beforeSearchPage).some((query) => /order by/.test(query)),
  false,
);
const publicSearch = createBackendServerClient(searchContribution, context(anonymous)).searchEngine;
assert.deepEqual(
  (await publicSearch.catalog()).map(({ name }) => name),
  ["Alpha", "Zulu"],
);
assert.equal((await search.catalog()).length, 3);
assert.deepEqual(
  (await publicSearch.search({ query: " A " })).map(({ name }) => name),
  ["Alpha"],
);
assert.equal((await search.search({ query: " A " })).length, 2);
const projected = (await search.catalog()).find(({ name }) => name === "Integrated")?.integration;
assert.deepEqual(Object.keys(projected ?? {}).toSorted(), ["id", "kind", "url"]);
await search.update({
  id: alpha.value,
  type: "generic",
  name: "Alpha Updated",
  iconUrl: "fixture-icon",
  description: null,
  urlTemplate: "https://updated-search.invalid/%s",
});
assert.equal((await search.byId({ id: alpha.value })).short, "aa");
await expectCode(
  search.create({
    type: "generic",
    name: "Duplicate shortcut",
    short: "AA",
    iconUrl: "fixture-icon",
    description: null,
    urlTemplate: "https://search.invalid/%s",
  }),
  "INTERNAL_SERVER_ERROR",
);
await expectCode(
  search.create({
    type: "generic",
    name: "Unsafe",
    short: "unsafe",
    iconUrl: "fixture-icon",
    description: null,
    urlTemplate: "javascript:%s",
  }),
  "BAD_REQUEST",
);
assert.equal(await publicSearch.getDefaultSearchEngine(undefined), null);
raw
  .query("INSERT INTO serverSetting VALUES (?, ?)")
  .run("search", stringify({ defaultSearchEngineId: integrated.value }));
assert.equal((await publicSearch.getDefaultSearchEngine(undefined))?.id, integrated.value);
raw.query("INSERT INTO user VALUES (?, ?)").run("reader", alpha.value);
assert.equal((await search.getDefaultSearchEngine(undefined))?.id, alpha.value);
raw.query("UPDATE user SET defaultSearchEngineId = ? WHERE id = ?").run("missing-user-default", "reader");
assert.equal(await search.getDefaultSearchEngine(undefined), undefined);
assert.equal(
  parse<{ defaultSearchEngineId: string }>(
    String(
      raw.query<{ value: string }, [string]>("SELECT value FROM serverSetting WHERE settingKey = ?").get("search")
        ?.value,
    ),
  ).defaultSearchEngineId,
  integrated.value,
);
raw
  .query("UPDATE serverSetting SET value = ? WHERE settingKey = ?")
  .run(stringify({ defaultSearchEngineId: "missing-server-default", preserved: "unknown-property" }), "search");
assert.equal(await publicSearch.getDefaultSearchEngine(undefined), null);
assert.deepEqual(
  parse(
    String(
      raw.query<{ value: string }, [string]>("SELECT value FROM serverSetting WHERE settingKey = ?").get("search")
        ?.value,
    ),
  ),
  { defaultSearchEngineId: null, preserved: "unknown-property" },
);
assert.equal(warnings.length, 0);
raw
  .query("UPDATE serverSetting SET value = ? WHERE settingKey = ?")
  .run(stringify({ defaultSearchEngineId: "missing-server-default" }), "search");
const failingSettingsWrite = new Proxy(db, {
  get(target, property, receiver) {
    if (property === "update")
      return () => {
        throw new Error("Disposable settings write failure");
      };
    return Reflect.get(target, property, receiver);
  },
});
assert.equal(
  await createBackendServerClient(
    searchContribution,
    context(anonymous, failingSettingsWrite),
  ).searchEngine.getDefaultSearchEngine(undefined),
  null,
);
assert.equal(warnings.length, 1);
assert.equal(warnings[0]?.message, "Failed to update search settings after default search engine not found");

let datasetReads = 0;
const dataset = {
  async getDataAsync() {
    datasetReads++;
    return {
      data: [
        { t: "&", s: "Ampersand", u: "https://bang.invalid/{{{s}}}" },
        { t: "a", s: "A", u: "https://bang.invalid/{{{s}}}" },
        { t: "aa", s: "AA", u: "https://bang.invalid/{{{s}}}" },
        { t: "ab", s: "AB", u: "https://bang.invalid/{{{s}}}" },
      ].toSorted((left, right) => left.t.localeCompare(right.t)),
    };
  },
};
assert.deepEqual(
  await searchDuckDuckGoBangsAsync({ query: "  ", limit: 20 }, dataset, new AbortController().signal),
  [],
);
assert.equal(datasetReads, 0);
assert.deepEqual(
  (await searchDuckDuckGoBangsAsync({ query: " A ", limit: 2 }, dataset, new AbortController().signal)).map(
    ({ t }) => t,
  ),
  ["a", "aa"],
);
assert.equal(
  (await searchDuckDuckGoBangsAsync({ query: "&", limit: 20 }, dataset, new AbortController().signal))[0]?.t,
  "&",
);
assert.equal(bangsSearchInputSchema.parse({ query: "a" }).limit, 20);
assert.equal(bangsSearchInputSchema.safeParse({ query: "a", limit: 51 }).success, false);
assert.equal(bangsSearchInputSchema.safeParse({ query: "a", limit: 1.5 }).success, false);
const bangAbort = new AbortController();
await assert.rejects(
  searchDuckDuckGoBangsAsync(
    { query: "a", limit: 20 },
    {
      async getDataAsync(signal) {
        assert.equal(signal, bangAbort.signal);
        bangAbort.abort(new Error("Disposable bangs read stopped"));
        return await dataset.getDataAsync();
      },
    },
    bangAbort.signal,
  ),
  /Disposable bangs read stopped/,
);
await assert.rejects(
  searchDuckDuckGoBangsAsync(
    { query: "a", limit: 20 },
    {
      async getDataAsync() {
        throw new Error("Disposable dataset unavailable");
      },
    },
    new AbortController().signal,
  ),
  /Disposable dataset unavailable/,
);
raw.close();
console.log(
  JSON.stringify({
    revision: backendContractRevision,
    conservedIdentities: bindings.length,
    nativeUnmountedLeaves: contribution.leaves.length,
    pending: bindings.filter(({ status }) => status === "pending").map(({ path }) => path),
    deniedDatabaseTouches: deniedTouches,
    externalCalls: 0,
    actualSqliteFixtures: true,
    postgresqlRuntimeAcceptance: false,
  }),
);
