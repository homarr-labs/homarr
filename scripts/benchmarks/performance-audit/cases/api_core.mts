import assert from "node:assert/strict";

import SQLite from "better-sqlite3";
import { and, eq, inArray, or, relations } from "drizzle-orm";
import { drizzle as sqliteDrizzle } from "drizzle-orm/better-sqlite3";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { boolean, integer, pgTable, text as pgText, varchar } from "drizzle-orm/pg-core";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { parse, stringify } from "superjson";

const SuperJSON = { parse, stringify };

import type { BenchmarkContext, Side } from "../lib.mts";
import { benchmarkPair } from "../lib.mts";

const boardFile = "packages/api/src/router/board.ts";
const dockerFile = "packages/api/src/router/docker/docker-reconciliation.ts";
const dockerDefinitionsFile = "packages/definitions/src/docker-service-discovery.ts";
const appFile = "packages/api/src/router/app/app-access-control.ts";
const rssFile = "packages/api/src/router/widgets/rssFeed.ts";
const permissionFile = "packages/auth/permissions/integration-query-permissions.ts";

interface Row {
  id: string;
  value: number;
}
interface BoardFixture {
  input: { items: Row[]; sections: Row[] };
  dbBoard: { items: Row[]; sections: Row[] };
}
type BoardDiff = Record<
  "addedItems" | "addedSections" | "updatedItems" | "updatedSections" | "removedItems" | "removedSections",
  Row[]
>;
type BoardOperation = (input: BoardFixture["input"], dbBoard: BoardFixture["dbBoard"]) => BoardDiff;

function boardOperation(ctx: BenchmarkContext, side: Side): BoardOperation {
  if (side === "after") {
    const source = ctx.extract(side, boardFile, {
      kind: "span",
      start: "const storedItemIds =",
      end: "await handleTransactionsAsync(ctx.db, {",
    });
    return new Function(
      "input",
      "dbBoard",
      `${source}\nreturn { addedItems, addedSections, updatedItems, updatedSections, removedItems, removedSections };`,
    ) as BoardOperation;
  }
  const filters = ctx.evaluate<{
    filterAddedItems: (input: Row[], stored: Row[]) => Row[];
    filterRemovedItems: (input: Row[], stored: Row[]) => Row[];
    filterUpdatedItems: (input: Row[], stored: Row[]) => Row[];
  }>(
    side,
    boardFile,
    ["filterAddedItems", "filterRemovedItems", "filterUpdatedItems"],
    {},
    { returnExpression: "({ filterAddedItems, filterRemovedItems, filterUpdatedItems })" },
  );
  return (input, stored) => ({
    addedItems: filters.filterAddedItems(input.items, stored.items),
    addedSections: filters.filterAddedItems(input.sections, stored.sections),
    updatedItems: filters.filterUpdatedItems(input.items, stored.items),
    updatedSections: filters.filterUpdatedItems(input.sections, stored.sections),
    removedItems: filters.filterRemovedItems(input.items, stored.items),
    removedSections: filters.filterRemovedItems(input.sections, stored.sections),
  });
}

function boardRows(count: number, start = 0): Row[] {
  return Array.from({ length: count }, (_, index) => ({ id: `row-${index + start}`, value: index }));
}

function boardFixture(size: number): BoardFixture {
  return {
    input: { items: boardRows(size, Math.floor(size / 5)), sections: boardRows(Math.ceil(size / 10), 1) },
    dbBoard: { items: boardRows(size), sections: boardRows(Math.ceil(size / 10)) },
  };
}

function observedRows<T extends object>(rows: T[], counter: { reads: number }, fields: string[]): T[] {
  return rows.map(
    (row) =>
      new Proxy(row, {
        get(target, key, receiver) {
          if (typeof key === "string" && fields.includes(key)) counter.reads++;
          return Reflect.get(target, key, receiver);
        },
      }),
  );
}

function observedArray<T>(array: T[], counter: { reads: number }): T[] {
  return new Proxy(array, {
    get(target, key, receiver) {
      if (typeof key === "string" && /^\d+$/u.test(key)) counter.reads++;
      if (key === "map" || key === "flatMap") {
        return (...args: unknown[]) => observedArray(Reflect.apply(Reflect.get(target, key), receiver, args), counter);
      }
      return Reflect.get(target, key, receiver);
    },
  });
}

function boardCase(scale: "small" | "large") {
  const size = scale === "small" ? 20 : 500;
  return benchmarkPair({
    id: `API-001:${scale}`,
    title: "Board content membership diff",
    files: [boardFile],
    iterations: 300,
    fixture: `${size} submitted/stored widgets, ${Math.ceil(size / 10)} sections, 20% widget replacement; pure actual diff source, no database writes. ID getter instrumentation runs only for operation metrics.`,
    metricUnits: { idFieldReads: "property reads" },
    prepare(ctx) {
      const before = boardOperation(ctx, "before");
      const after = boardOperation(ctx, "after");
      const fixture = boardFixture(size);
      const edges: BoardFixture[] = [
        boardFixture(0),
        boardFixture(1),
        {
          input: {
            items: [
              { id: "b", value: 1 },
              { id: "a", value: 2 },
              { id: "a", value: 3 },
            ],
            sections: [],
          },
          dbBoard: {
            items: [
              { id: "a", value: 4 },
              { id: "c", value: 5 },
              { id: "c", value: 6 },
            ],
            sections: [],
          },
        },
      ];
      return {
        before: () => before(fixture.input, fixture.dbBoard),
        after: () => after(fixture.input, fixture.dbBoard),
        verify(left, right) {
          assert.deepEqual(right, left);
          for (const edge of edges) assert.deepEqual(after(edge.input, edge.dbBoard), before(edge.input, edge.dbBoard));
          const duplicateEdge = edges[2];
          assert.ok(duplicateEdge);
          const result = after(duplicateEdge.input, duplicateEdge.dbBoard);
          assert.deepEqual(
            result.updatedItems.map(({ value }) => value),
            [2, 3],
          );
          assert.deepEqual(
            result.removedItems.map(({ value }) => value),
            [5, 6],
          );
        },
        metrics(_result, side) {
          const count = { reads: 0 };
          const input = {
            items: observedRows(fixture.input.items, count, ["id"]),
            sections: observedRows(fixture.input.sections, count, ["id"]),
          };
          const stored = {
            items: observedRows(fixture.dbBoard.items, count, ["id"]),
            sections: observedRows(fixture.dbBoard.sections, count, ["id"]),
          };
          ({ before, after })[side](input, stored);
          return { idFieldReads: count.reads };
        },
      };
    },
  });
}

interface PermissionInput {
  id: string;
  anyOfBoardIds: string[];
}
type PermissionOperation = (integrations: PermissionInput[], accessible: string[]) => boolean;

function permissionCase(scale: "small" | "large") {
  const count = scale === "small" ? 3 : 40;
  const accessible = Array.from({ length: scale === "small" ? 8 : 500 }, (_, index) => `board-${index}`);
  const matchingBoard = accessible.at(-1);
  assert.ok(matchingBoard);
  const integrations = Array.from({ length: count }, (_, index) => ({
    id: `integration-${index}`,
    anyOfBoardIds: [`unavailable-${index}`, matchingBoard],
  }));
  return benchmarkPair({
    id: `NRA-001:${scale}`,
    title: "Integration query board permission membership",
    files: [permissionFile],
    iterations: 1000,
    fixture: `${count} integrations with 2 board references each, ${accessible.length} accessible boards; each integration has one missing and one late matching board. Actual helper, no auth policy/DB mocks in timed code.`,
    metricUnits: { accessibleArrayElementReads: "element reads" },
    prepare(ctx) {
      const name = "checkEveryIntegrationContainsSomeBoardIdIncludedInBoardsWithAccess";
      const before = ctx.evaluate<PermissionOperation>("before", permissionFile, name);
      const after = ctx.evaluate<PermissionOperation>("after", permissionFile, name);
      const edges: [PermissionInput[], string[]][] = [
        [[], []],
        [[{ id: "empty", anyOfBoardIds: [] }], ["board"]],
        [
          [
            { id: "a", anyOfBoardIds: ["board", "board"] },
            { id: "b", anyOfBoardIds: ["other"] },
          ],
          ["board", "board"],
        ],
        [
          [
            { id: "a", anyOfBoardIds: ["other", "board"] },
            { id: "b", anyOfBoardIds: ["board"] },
          ],
          ["board", "board"],
        ],
        [[{ id: "a", anyOfBoardIds: ["board"] }], []],
      ];
      return {
        before: () => before(integrations, accessible),
        after: () => after(integrations, accessible),
        verify(left, right) {
          assert.equal(right, left);
          assert.equal(right, true);
          for (const edge of edges) assert.equal(after(...edge), before(...edge));
        },
        metrics(_result, side) {
          const counter = { reads: 0 };
          ({ before, after })[side](integrations, observedArray(accessible, counter));
          return { accessibleArrayElementReads: counter.reads };
        },
      };
    },
  });
}

interface RssItem {
  options: string;
}
type RssOperation = (db: unknown, urls: string[]) => Promise<string[]>;

function rssCase(scale: "small" | "large") {
  const configured = Array.from(
    { length: scale === "small" ? 8 : 1000 },
    (_, index) => `https://feed-${index}.example/rss`,
  );
  const rows = Array.from({ length: Math.ceil(configured.length / 4) }, (_, index) => ({
    options: SuperJSON.stringify({ feedUrls: configured.slice(index * 4, index * 4 + 4) }),
  }));
  const requested = Array.from({ length: scale === "small" ? 4 : 100 }, (_, index) => {
    if (index % 2 === 0) return configured[configured.length - 1 - (index % configured.length)] ?? "";
    return `https://unknown-${index}.example/rss`;
  });
  return benchmarkPair({
    id: `A-1:${scale}`,
    title: "Configured RSS URL restriction",
    files: [rssFile],
    async: true,
    iterations: 200,
    fixture: `${rows.length} RSS widgets, 4 feeds/widget, ${requested.length} requested URLs (50% missing); actual SuperJSON parsing, controlled in-memory findMany returning stored options. No HTTP feed fetch.`,
    metricUnits: { sourceArrayElementReads: "element reads" },
    prepare(ctx) {
      const bindings = { SuperJSON, eq: () => null, items: { kind: "kind" } };
      const before = ctx.evaluate<RssOperation>("before", rssFile, "restrictUrlsAsync", bindings);
      const after = ctx.evaluate<RssOperation>("after", rssFile, "restrictUrlsAsync", bindings);
      const db = { query: { items: { findMany: async () => rows } } };
      const edges: [RssItem[], string[]][] = [
        [[], []],
        [[], ["missing"]],
        [
          [{ options: SuperJSON.stringify({ feedUrls: ["exact", "exact", "Case", "trailing/"] }) }],
          ["exact", "missing", "exact", "case", "trailing", "Case", "trailing/"],
        ],
      ];
      return {
        before: () => before(db, requested),
        after: () => after(db, requested),
        async verify(left, right) {
          assert.deepEqual(right, left);
          for (const [items, urls] of edges) {
            const edgeDb = { query: { items: { findMany: async () => items } } };
            assert.deepEqual(await after(edgeDb, urls), await before(edgeDb, urls));
          }
          const badDb = { query: { items: { findMany: async () => [{ options: "broken" }] } } };
          await assert.rejects(before(badDb, []));
          await assert.rejects(after(badDb, []));
        },
        async metrics(_result, side) {
          const counter = { reads: 0 };
          const observedDb = { query: { items: { findMany: async () => observedArray(rows, counter) } } };
          await { before, after }[side](observedDb, requested);
          return { sourceArrayElementReads: counter.reads };
        },
      };
    },
  });
}

interface DockerFixture {
  containers: any[];
  integrations: any[];
  apps: any[];
}
type DockerOperation = (db: unknown) => Promise<any>;

function dockerFixture(size: number): DockerFixture {
  return {
    containers: Array.from({ length: size }, (_, index) => ({
      id: `native-${index}`,
      resourceId: `container-${index}`,
      name: `sonarr-${index}`,
      host: "192.0.2.10",
      endpointId: "endpoint",
      endpointName: "local",
      ports: [{ PrivatePort: 8989, Type: "tcp" }],
      match: { kind: "sonarr", confidence: "high", source: "image" },
    })),
    integrations: Array.from({ length: size }, (_, index) => ({
      id: `integration-${index}`,
      name: `sonarr-${index}`,
      kind: "sonarr",
      url: `http://sonarr-${index}:8989/`,
      appId: null,
      items: [],
      secrets: [],
    })),
    apps: Array.from({ length: size * 2 }, (_, index) => ({
      id: `app-${index}`,
      name: `app-${index}`,
      href: `http://app-${index}:8989/`,
    })),
  };
}

function dockerOperation(ctx: BenchmarkContext, side: Side, fixture: DockerFixture): () => Promise<any> {
  const definitions = ctx.evaluate<Record<string, Function>>(
    side,
    dockerDefinitionsFile,
    [
      "buildDockerServiceUrlCandidates",
      "normalizeDockerServiceUrl",
      "isUsablePublishedAddress",
      "getEndpointHostname",
      "formatUrlHost",
    ],
    {},
    { returnExpression: "({ buildDockerServiceUrlCandidates, normalizeDockerServiceUrl })" },
  );
  const operation = ctx.evaluate<DockerOperation>(
    side,
    dockerFile,
    [
      "getDockerReconciliationAsync",
      "normalizeName",
      "getReconciliationState",
      "getCandidateNextAction",
      "nextActionForState",
    ],
    {
      ...definitions,
      matchDockerService: (container: any) => container.match,
      getIntegrationDefaultPort: () => 8989,
      dockerContainersRequestHandler: {
        handler: () => ({
          getDataAsync: async () => ({ data: { containers: fixture.containers, endpoints: [] }, timestamp: 123 }),
        }),
      },
    },
    { returnExpression: "getDockerReconciliationAsync" },
  );
  const db = {
    query: {
      integrations: { findMany: async () => fixture.integrations },
      apps: { findMany: async () => fixture.apps },
    },
  };
  return () => operation(db);
}

function dockerCase(scale: "small" | "large") {
  const size = scale === "small" ? 8 : 150;
  return benchmarkPair({
    id: `API-003:${scale}`,
    title: "Docker service reconciliation matching",
    files: [dockerFile, dockerDefinitionsFile],
    async: true,
    iterations: 50,
    fixture: `${size} containers, ${size} integrations, ${size * 2} apps; actual reconciliation, URL candidate construction/normalization, controlled recognition returning sonarr and mocked DB/Docker handler snapshots. No Docker daemon or network.`,
    metricUnits: { configuredRecordFieldReads: "property reads" },
    prepare(ctx) {
      const fixture = dockerFixture(size);
      const before = dockerOperation(ctx, "before", fixture);
      const after = dockerOperation(ctx, "after", fixture);
      const edges = [dockerFixture(0), dockerFixture(1)];
      const duplicate = dockerFixture(2);
      duplicate.integrations.push({ ...duplicate.integrations[0], id: "duplicate-url", name: "unrelated" });
      duplicate.apps.push(
        { id: "exact-app", name: "unrelated", href: "http://sonarr-0:8989/" },
        { id: "exact-app-duplicate", name: "unrelated", href: "http://sonarr-0:8989" },
      );
      edges.push(duplicate);
      const linked = dockerFixture(1);
      linked.integrations[0].appId = linked.apps[0].id;
      linked.apps.push({ ...linked.apps[0], name: "duplicate-id-later" });
      edges.push(linked);
      const moved = dockerFixture(2);
      moved.integrations[0].url = "http://previous:8989";
      moved.containers[1].match = null;
      moved.apps[0].name = moved.containers[0].name;
      edges.push(moved);
      const nameDuplicates = dockerFixture(2);
      nameDuplicates.integrations[0].url = null;
      nameDuplicates.integrations.push({ ...nameDuplicates.integrations[0], id: "duplicate-name" });
      nameDuplicates.apps[0].name = nameDuplicates.containers[0].name;
      nameDuplicates.apps.push({ ...nameDuplicates.apps[0], id: "duplicate-app-name" });
      edges.push(nameDuplicates);
      const containerDuplicates = dockerFixture(2);
      containerDuplicates.containers[1].name = containerDuplicates.containers[0].name;
      containerDuplicates.containers[1].ports = [];
      containerDuplicates.integrations[0].url = "http://old:8989";
      edges.push(containerDuplicates);
      return {
        before,
        after,
        async verify(left, right) {
          assert.deepEqual(right, left);
          for (const edge of edges)
            assert.deepEqual(await dockerOperation(ctx, "after", edge)(), await dockerOperation(ctx, "before", edge)());
          assert.equal(
            (await dockerOperation(ctx, "after", duplicate)()).candidates[0].representation.signals.ambiguous,
            true,
          );
          assert.equal(
            (await dockerOperation(ctx, "after", linked)()).candidates[0].representation.app.name,
            linked.apps[0].name,
          );
        },
        async metrics(_result, side) {
          const counter = { reads: 0 };
          const measured = {
            ...fixture,
            integrations: observedRows(fixture.integrations, counter, ["name", "kind", "url", "id"]),
            apps: observedRows(fixture.apps, counter, ["name", "href", "id"]),
          };
          await dockerOperation(ctx, side, measured)();
          return { configuredRecordFieldReads: counter.reads };
        },
      };
    },
  });
}

interface AccessControl {
  canUserSeeAppsAsync(ids: string[]): Promise<boolean>;
}
type AccessConstructor = new (db: unknown, user: unknown) => AccessControl;

function appSchema(ctx: BenchmarkContext, side: Side, dialect: "sqlite" | "postgresql") {
  const bindings: Record<string, unknown> = {
    backgroundImageAttachments: { defaultValue: "fixed" },
    backgroundImageRepeats: { defaultValue: "no-repeat" },
    backgroundImageSizes: { defaultValue: "cover" },
    emptySuperJSON: SuperJSON.stringify({}),
    users: { id: text("id") },
  };
  if (dialect === "sqlite") Object.assign(bindings, { sqliteTable, text, int });
  else Object.assign(bindings, { pgTable, text: pgText, varchar, boolean, integer });
  const schema = ctx.evaluate<{ boards: any; items: any }>(
    side,
    `packages/db/schema/${dialect}.ts`,
    ["boards", "items"],
    bindings,
    { returnExpression: "({ boards, items })" },
  );
  const itemRelations = relations(schema.items, ({ one }) => ({
    board: one(schema.boards, { fields: [schema.items.boardId], references: [schema.boards.id] }),
  }));
  return { ...schema, itemRelations };
}

function appClass(ctx: BenchmarkContext, side: Side, schema: { boards: unknown; items: unknown }): AccessConstructor {
  return ctx.evaluate<AccessConstructor>(side, appFile, "AppAccessControl", {
    SuperJSON,
    and,
    eq,
    inArray,
    or,
    ...schema,
  });
}

function appCase(scale: "small" | "large") {
  const size = scale === "small" ? 20 : 1000;
  return benchmarkPair({
    id: `API-004:${scale}`,
    title: "Anonymous app placement visibility query",
    files: [appFile, "packages/db/schema/sqlite.ts", "packages/db/schema/postgresql.ts"],
    async: true,
    iterations: 50,
    fixture: `${size} app/bookmark placements on 2 boards, one public app per 10 placements plus a public bookmark; real in-memory SQLite queries use extracted Homarr table declarations and the actual access-control class. PostgreSQL SQL compiled without a server. Row/JSON-byte metrics measure ORM materialization, not network traffic.`,
    metricUnits: { materializedRows: "rows", materializedJsonBytes: "bytes" },
    prepare(ctx) {
      const sqlite = new SQLite(":memory:");
      sqlite.exec(
        "CREATE TABLE board (id TEXT PRIMARY KEY, is_public INTEGER NOT NULL); CREATE TABLE item (id TEXT PRIMARY KEY, board_id TEXT NOT NULL, kind TEXT NOT NULL, options TEXT NOT NULL, advanced_options TEXT NOT NULL);",
      );
      sqlite.prepare("INSERT INTO board VALUES (?, ?)").run("public", 1);
      sqlite.prepare("INSERT INTO board VALUES (?, ?)").run("private", 0);
      const insert = sqlite.prepare("INSERT INTO item VALUES (?, ?, ?, ?, ?)");
      for (let index = 0; index < size; index++) {
        const kind = index % 2 === 0 ? "app" : "bookmarks";
        let options: unknown = { appId: `app-${index}`, title: "placement".repeat(20) };
        if (kind === "bookmarks") options = { items: [`app-${index}`, "shared"], title: "placement".repeat(20) };
        insert.run(
          `item-${index}`,
          index % 10 === 0 || index === 1 ? "public" : "private",
          kind,
          SuperJSON.stringify(options),
          SuperJSON.stringify({}),
        );
      }
      // A malformed private placement must stay excluded from parsing on both sides.
      insert.run("private-malformed", "private", "bookmarks", "broken", "{}");
      const classes = {} as Record<Side, AccessConstructor>;
      const controls = {} as Record<Side, AccessControl>;
      const dbs = {} as Record<Side, any>;
      const materialized = {} as Record<Side, unknown[]>;
      const sqls = {} as Record<Side, string>;
      for (const side of ["before", "after"] as const) {
        const schema = appSchema(ctx, side, "sqlite");
        const db = sqliteDrizzle(sqlite, { schema, casing: "snake_case" });
        const findMany = db.query.items.findMany.bind(db.query.items);
        const controlledDb = {
          select: db.select.bind(db),
          query: {
            items: {
              async findMany(config: any) {
                const query = findMany(config);
                sqls[side] = query.toSQL().sql;
                const rows = await query;
                materialized[side] = rows;
                return rows;
              },
            },
          },
        };
        classes[side] = appClass(ctx, side, schema);
        controls[side] = new classes[side](controlledDb, null);
        dbs[side] = controlledDb;
      }
      const requested = ["app-0", "app-1", "shared"];
      return {
        before: () => controls.before.canUserSeeAppsAsync(requested),
        after: () => controls.after.canUserSeeAppsAsync(requested),
        async verify(left, right) {
          assert.equal(right, left);
          assert.equal(right, true);
          for (const ids of [[], ["app-0", "app-0"], ["app-2"], ["app-0", "app-2"], ["missing"]])
            assert.equal(await controls.after.canUserSeeAppsAsync(ids), await controls.before.canUserSeeAppsAsync(ids));
          assert.equal(await controls.after.canUserSeeAppsAsync(["app-2"]), false);
          for (const side of ["before", "after"] as const) {
            assert.equal(
              await new classes[side](dbs[side], { id: "signed-in" }).canUserSeeAppsAsync(["missing"]),
              true,
            );
            const schema = appSchema(ctx, side, "postgresql");
            const db = pgDrizzle({ client: {} as any, schema, casing: "snake_case" });
            let generated: { sql: string; params: unknown[] } | undefined;
            const controlled = {
              select: db.select.bind(db),
              query: {
                items: {
                  findMany(config: any) {
                    generated = db.query.items.findMany(config).toSQL();
                    return [];
                  },
                },
              },
            };
            await new (appClass(ctx, side, schema))(controlled, null).canUserSeeAppsAsync([]);
            assert.ok(generated);
            if (side === "after") {
              assert.match(
                generated.sql,
                /"board_id" in \(select "id" from "board" where "board"\."is_public" = \$3\)/u,
              );
              assert.deepEqual(generated.params, ["app", "bookmarks", true]);
            } else assert.match(generated.sql, /left join lateral/u);
          }
          assert.match(sqls.after, /"board_id" in \(select "id" from "board" where "board"\."is_public" = \?\)/u);
        },
        async metrics(_result, side) {
          await controls[side].canUserSeeAppsAsync(requested);
          return {
            materializedRows: materialized[side].length,
            materializedJsonBytes: Buffer.byteLength(JSON.stringify(materialized[side])),
          };
        },
        cleanup() {
          sqlite.close();
        },
      };
    },
  });
}

export const cases = [
  boardCase("small"),
  boardCase("large"),
  dockerCase("small"),
  dockerCase("large"),
  appCase("small"),
  appCase("large"),
  rssCase("small"),
  rssCase("large"),
  permissionCase("small"),
  permissionCase("large"),
];
