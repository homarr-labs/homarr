import assert from "node:assert/strict";
import { setImmediate as drainEventLoop } from "node:timers/promises";

import type { BenchmarkCase, BenchmarkContext, Side } from "../lib.mts";
import { benchmarkPair } from "../lib.mts";

const bookmarkFile = "packages/widgets/src/bookmarks/prefetch.ts";
const appFile = "packages/widgets/src/app/prefetch.ts";
const importFile = "packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx";
const providerFile = "packages/definitions/src/release-provider.ts";
const beszelFile = "packages/widgets/src/beszel-system-table/component.tsx";
const dockerFile = "packages/widgets/src/docker/component.tsx";
const sides: Side[] = ["before", "after"];

type App = { id: string; name: string };
type Item = { options: Record<string, unknown> };
type PrefetchResult = { queries: { key: unknown; data?: unknown; error?: string }[]; logs: string[]; dbReads: number };
type Prefetch = (client: unknown, items: Item[]) => void;

function createPrefetch(ctx: BenchmarkContext, side: Side, file: string) {
  let currentRows: App[] = [];
  let failure: Error | undefined;
  let logs: string[] = [];
  let dbReads = 0;
  const bindings: Record<string, unknown> = {
    db: {
      query: {
        apps: {
          findMany: () => {
            dbReads++;
            if (failure) return Promise.reject(failure);
            return Promise.resolve(currentRows);
          },
        },
      },
    },
    apps: { id: "id" },
    inArray: (_field: unknown, ids: string[]) => ids,
    logger: { error: (error: Error) => logs.push(error.message + ":" + String(error.cause)) },
    createTrpcQueryKey: (procedure: string, input: unknown) => [procedure, input],
  };
  let declarations = ["prefetchAll"];
  if (file === bookmarkFile) {
    const getSafeApplicationUrl = ctx.evaluate(
      side,
      "packages/common/src/url.ts",
      ["parseHttpUrl", "getSafeApplicationUrl"],
      {},
      { returnExpression: "getSafeApplicationUrl" },
    );
    bindings.getDirectBookmarkUrl = ctx.evaluate(
      side,
      "packages/widgets/src/bookmarks/bookmark-item.ts",
      ["directBookmarkPrefix", "normalizeBookmarkUrl", "getDirectBookmarkUrl"],
      { getSafeApplicationUrl },
      { returnExpression: "getDirectBookmarkUrl" },
    );
    declarations = ["getAppIds", "prefetchAll"];
  }
  const prefetch = ctx.evaluate<Prefetch>(side, file, declarations, bindings);
  return async (rows: App[], items: Item[], error?: Error): Promise<PrefetchResult> => {
    currentRows = rows;
    failure = error;
    logs = [];
    dbReads = 0;
    const pending: Promise<PrefetchResult["queries"][number]>[] = [];
    const queryKeys = new Set<string>();
    prefetch(
      {
        prefetchQuery({ queryKey, queryFn }: { queryKey: unknown; queryFn: () => Promise<unknown> }) {
          const key = JSON.stringify(queryKey);
          if (queryKeys.has(key)) return Promise.resolve();
          queryKeys.add(key);
          const task = Promise.resolve()
            .then(queryFn)
            .then(
              (data) => ({ key: queryKey, data }),
              (queryError: Error) => ({ key: queryKey, error: queryError.message }),
            );
          pending.push(task);
          return task;
        },
      },
      items,
    );
    const queries = await Promise.all(pending);
    return { queries, logs, dbReads };
  };
}

function appFixture(count: number) {
  const rows = Array.from({ length: count }, (_, index) => ({ id: "app-" + index, name: "App " + index })).toReversed();
  const items = Array.from({ length: count }, (_, index) => ({ options: { appId: "app-" + index } }));
  items.push({ options: { appId: "app-0" } });
  return { rows, items };
}

function bookmarkFixture(appCount: number, widgetCount: number, idsPerWidget: number) {
  const items: Item[] = Array.from({ length: widgetCount }, (_widget, widget) => ({
    options: {
      items: Array.from({ length: idsPerWidget }, (_reference, index) => "app-" + ((widget * 37 + index) % appCount)),
    },
  }));
  const requested = new Set(items.flatMap((item) => item.options.items as string[]));
  const rows = [...requested].map((id) => ({ id, name: id })).toReversed();
  return { rows, items };
}

function countedIds(values: unknown[], counts: { comparisons: number }): unknown[] {
  return new Proxy(values, {
    get(target, property, receiver) {
      if (property === "filter") {
        return (predicate: (value: unknown) => boolean) => countedIds(target.filter(predicate), counts);
      }
      if (property === "includes") {
        return (value: unknown) => {
          const candidates = new Proxy(target, {
            get(array, key, proxy) {
              if (typeof key === "string" && /^\d+$/u.test(key)) counts.comparisons++;
              return Reflect.get(array, key, proxy);
            },
          });
          return Array.prototype.includes.call(candidates, value);
        };
      }
      if (property === Symbol.iterator) {
        return function* () {
          for (const value of target) {
            counts.comparisons++;
            yield value;
          }
        };
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

const bookmarkCase = benchmarkPair({
  id: "A4",
  title: "Bookmark membership preserves database ordering with per-query sets",
  files: [bookmarkFile, "packages/widgets/src/bookmarks/bookmark-item.ts", "packages/common/src/url.ts"],
  iterations: 50,
  async: true,
  timing: true,
  fixture:
    "Small: 3 widgets x 8 references; large: 30 widgets x 240 references across 2,000 possible app IDs. Shared DB result is mocked in reverse order; distinct query keys are deduplicated. One symmetric setImmediate turn after each operation releases completed async request resources; its wall/CPU overhead is included.",
  async prepare(ctx) {
    const fixtures = [bookmarkFixture(24, 3, 8), bookmarkFixture(2000, 30, 240)];
    const runs = Object.fromEntries(sides.map((side) => [side, createPrefetch(ctx, side, bookmarkFile)])) as Record<
      Side,
      ReturnType<typeof createPrefetch>
    >;
    const execute = async (side: Side) => {
      const results: PrefetchResult[] = [];
      for (const { rows, items } of fixtures) results.push(await runs[side](rows, items));
      await drainEventLoop();
      return results;
    };
    return {
      before: () => execute("before"),
      after: () => execute("after"),
      async verify(before, after) {
        assert.deepEqual(after, before);
        const rows = [
          { id: "b", name: "Second" },
          { id: "a", name: "First" },
        ];
        const items = [
          { options: { items: ["a", "a", "missing", "url:https://example.test/", 42, "b"] } },
          { options: { items: ["url:https://example.test/"] } },
        ];
        const edgeBefore = await runs.before(rows, items);
        const edgeAfter = await runs.after(rows, items);
        assert.deepEqual(edgeAfter, edgeBefore);
        assert.deepEqual(edgeAfter.queries[0]?.data, rows);
        assert.equal(edgeAfter.queries.length, 1);
        for (const side of sides) {
          const empty = await runs[side]([], [{ options: { items: ["url:https://example.test/"] } }]);
          assert.equal(empty.dbReads, 0);
          const failed = await runs[side]([], items, new Error("database unavailable"));
          assert.equal(failed.logs.length, 1);
          assert.equal(failed.queries[0]?.error, "database unavailable");
        }
      },
      async metrics(_result, side) {
        const metrics: Record<string, number> = {};
        for (const [index, fixture] of fixtures.entries()) {
          const counts = { comparisons: 0 };
          const items = fixture.items.map((item) => ({
            options: { items: countedIds(item.options.items as unknown[], counts) },
          }));
          const result = await runs[side](fixture.rows, items);
          const scale = ["small", "large"][index];
          metrics[scale + "MembershipCandidateReads"] = counts.comparisons;
          metrics[scale + "ExecutedQueryFns"] = result.queries.length;
          metrics[scale + "DatabaseReads"] = result.dbReads;
        }
        return metrics;
      },
    };
  },
});

const appCase = benchmarkPair({
  id: "WIDGETS_B_003",
  title: "App prefetch shares a first-match index and retains missing-app errors",
  files: [appFile],
  iterations: 5,
  async: true,
  timing: true,
  fixture:
    "Small: 24 apps; large: 2,000 apps. Reverse-order DB rows, one duplicate widget. Promise/database and query-key scheduling are mocked; no network latency is included. One symmetric setImmediate turn after each operation releases completed async request resources; its wall/CPU overhead is included. Batches contain 5 operations to bound simultaneous promise allocation pressure.",
  async prepare(ctx) {
    const fixtures = [appFixture(24), appFixture(2000)];
    const runs = Object.fromEntries(sides.map((side) => [side, createPrefetch(ctx, side, appFile)])) as Record<
      Side,
      ReturnType<typeof createPrefetch>
    >;
    const execute = async (side: Side) => {
      const results: PrefetchResult[] = [];
      for (const { rows, items } of fixtures) results.push(await runs[side](rows, items));
      await drainEventLoop();
      return results;
    };
    return {
      before: () => execute("before"),
      after: () => execute("after"),
      async verify(before, after) {
        assert.deepEqual(after, before);
        const rows = [
          { id: "duplicate", name: "First" },
          { id: "duplicate", name: "Later" },
        ];
        const items = [{ options: { appId: "duplicate" } }, { options: { appId: "missing" } }];
        const edgeBefore = await runs.before(rows, items);
        const edgeAfter = await runs.after(rows, items);
        assert.deepEqual(edgeAfter, edgeBefore);
        assert.deepEqual(edgeAfter.queries[0]?.data, rows[0]);
        assert.equal(edgeAfter.queries[1]?.error, "App not found");
        for (const side of sides) {
          assert.equal((await runs[side]([], [{ options: { appId: "" } }])).dbReads, 0);
          const failed = await runs[side]([], items, new Error("database unavailable"));
          assert.equal(failed.logs.length, 1);
          assert.ok(failed.queries.every((query) => query.error === "database unavailable"));
        }
      },
      async metrics(_result, side) {
        const metrics: Record<string, number> = {};
        for (const [index, fixture] of fixtures.entries()) {
          let reads = 0;
          const rows = fixture.rows.map((row) => ({
            get id() {
              reads++;
              return row.id;
            },
            name: row.name,
          }));
          const result = await runs[side](rows, fixture.items);
          const scale = ["small", "large"][index];
          metrics[scale + "RowIdReads"] = reads;
          metrics[scale + "ExecutedQueryFns"] = result.queries.length;
          metrics[scale + "DatabaseReads"] = result.dbReads;
        }
        return metrics;
      },
    };
  },
});

type Repository = { provider?: string; identifier: string };
type Container = { image: string; iconUrl?: string | null };
function repositoryFixture(count: number) {
  const containers: Container[] = Array.from({ length: count }, (_, index) => ({
    image: ["docker.io", "ghcr.io", "lscr.io", "quay.io"][index % 4] + "/owner/image-" + index + ":v1.2.3",
    iconUrl: "first-" + index,
  }));
  containers.push(
    ...containers.map((container) => ({
      ...container,
      image: container.image.replace(":v1.2.3", ":v4"),
      iconUrl: "later",
    })),
  );
  const repositories: Repository[] = Array.from({ length: Math.floor(count / 2) }, (_, index) => ({
    provider: ["dockerHub", "gitHubContainerRegistry", "linuxServerIO", "quay"][index % 4],
    identifier: "owner/image-" + index,
  }));
  return { containers, repositories };
}

function createRepositoryImport(
  ctx: BenchmarkContext,
  side: Side,
  containers: Container[] | undefined,
  repositories: Repository[],
  counts?: { linearComparisons: number; hashLookups: number; setEntries: number },
) {
  let id = 0;
  const normalizeReleaseProviderIdentifier = ctx.evaluate(side, providerFile, [
    "releaseProviderRegistryPrefixes",
    "removeContainerImageVersion",
    "normalizeReleaseProviderIdentifier",
  ]);
  const helpers = ctx.evaluate<Record<string, unknown>>(
    side,
    importFile,
    ["formatIdentifierName", "containerImageToProviderKind", "parseImageVersionToVersionFilter"],
    {},
    { returnExpression: "({ formatIdentifierName, containerImageToProviderKind, parseImageVersionToVersionFilter })" },
  );
  const bindings: Record<string, unknown> = {
    ...helpers,
    normalizeReleaseProviderIdentifier,
    docker: { data: containers && { containers } },
    innerProps: { repositories },
    createId: () => "generated-" + id++,
    useMemo: (callback: () => unknown) => callback,
  };
  if (counts) {
    bindings.Set = class extends Set {
      has(value: unknown) {
        counts.hashLookups++;
        return super.has(value);
      }
      add(value: unknown) {
        counts.setEntries++;
        return super.add(value);
      }
    };
  }
  const importRepositories = ctx.evaluate<() => Record<string, unknown>[]>(
    side,
    importFile,
    "importRepositories",
    bindings,
  );
  return () => {
    id = 0;
    if (!counts) return importRepositories();
    const some = Array.prototype.some;
    // oxlint-disable-next-line no-extend-native -- Diagnostic-only callback count; restored synchronously below.
    Array.prototype.some = function (predicate, thisArg) {
      return some.call(this, (value, index, array) => {
        counts.linearComparisons++;
        return predicate.call(thisArg, value, index, array);
      });
    };
    try {
      return importRepositories();
    } finally {
      // oxlint-disable-next-line no-extend-native -- Restore the exact method after diagnostic execution.
      Array.prototype.some = some;
    }
  };
}

const repositoryCase = benchmarkPair({
  id: "WIDGETS_B_002",
  title: "Docker repository import keeps normalized first-seen images",
  files: [importFile, providerFile],
  iterations: 50,
  timing: true,
  fixture:
    "Small: 24 unique images + 24 duplicate tags, 12 configured repositories; large: 1,000 + 1,000 duplicate tags, 500 configured repositories. IDs are deterministic; real provider and version normalization functions execute.",
  async prepare(ctx) {
    const fixtures = [repositoryFixture(24), repositoryFixture(1000)];
    const operations = Object.fromEntries(
      sides.map((side) => [
        side,
        fixtures.map((fixture) => createRepositoryImport(ctx, side, fixture.containers, fixture.repositories)),
      ]),
    );
    const execute = (side: Side) =>
      (operations as Record<Side, ReturnType<typeof createRepositoryImport>[]>)[side].map((operation) => operation());
    return {
      before: () => execute("before"),
      after: () => execute("after"),
      verify(before, after) {
        assert.deepEqual(after, before);
        const containers = [
          { image: "postgres:17", iconUrl: "first" },
          { image: "docker.io/postgres:18", iconUrl: "later" },
          { image: "ghcr.io/postgres:v1.2" },
          { image: "lscr.io/linuxserver/radarr:latest" },
          { image: "quay.io/prometheus/prometheus@sha256:abc" },
          { image: "unknown.example/owner/name:tag" },
          { image: ":invalid" },
        ];
        const repositories = [{ provider: "dockerHub", identifier: "postgres" }, { identifier: "postgres" }];
        const first = createRepositoryImport(ctx, "before", containers, repositories)();
        const second = createRepositoryImport(ctx, "after", containers, repositories)();
        assert.deepEqual(second, first);
        assert.equal(second[0]?.iconUrl, "first");
        assert.equal(second[0]?.alreadyImported, true);
        assert.equal(second.length, 5);
        for (const side of sides) assert.deepEqual(createRepositoryImport(ctx, side, undefined, repositories)(), []);
      },
      metrics(result, side) {
        const metrics: Record<string, number> = {};
        for (const [index, fixture] of fixtures.entries()) {
          let providerReads = 0;
          let identifierReads = 0;
          const repositories = fixture.repositories.map((repository) => ({
            get provider() {
              providerReads++;
              return repository.provider;
            },
            get identifier() {
              identifierReads++;
              return repository.identifier;
            },
          }));
          const counts = { linearComparisons: 0, hashLookups: 0, setEntries: 0 };
          const imported = createRepositoryImport(ctx, side, fixture.containers, repositories, counts)();
          const scale = ["small", "large"][index];
          metrics[scale + "ConfiguredRepositoryFieldReads"] = providerReads + identifierReads;
          metrics[scale + "LinearMembershipComparisons"] = counts.linearComparisons;
          metrics[scale + "HashMembershipLookups"] = counts.hashLookups;
          metrics[scale + "AuxiliarySetEntries"] = counts.setEntries;
          metrics[scale + "UniqueImages"] = imported.length;
          metrics[scale + "Containers"] = fixture.containers.length;
          assert.deepEqual(imported, (result as unknown[][])[index]);
        }
        return metrics;
      },
    };
  },
});

type SortRow = { name: string | null; cpuUsage?: number; memoryUsage?: number; host?: string; state?: string };
function sortFixture(count: number): SortRow[] {
  return Array.from({ length: count }, (_, index) => ({
    name: "name-" + ((index * 13) % 43),
    cpuUsage: (index * 19) % 101,
    memoryUsage: (index * 31) % 203,
    host: "host-" + (index % 11),
    state: ["running", "paused", "exited"][index % 3],
  })).toReversed();
}

function createSort(
  ctx: BenchmarkContext,
  side: Side,
  file: string,
  rows: readonly SortRow[],
  accessor: string,
  direction: string,
) {
  const sortStatus = { columnAccessor: accessor, direction };
  const bindings: Record<string, unknown> = { sortStatus, useMemo: (callback: () => unknown) => callback };
  let declaration = "sortedSystems";
  if (file === beszelFile) {
    bindings.systemsWithSource = rows;
    bindings.directionMultiplier = { asc: 1, desc: -1 };
  } else {
    declaration = "sortedContainers";
    bindings.containers = rows;
    const safeValue = ctx.evaluate(side, "packages/docker/src/shared.ts", "safeValue");
    bindings.compareContainers = ctx.evaluate(side, dockerFile, "compareContainers", { safeValue });
  }
  return ctx.evaluate<() => SortRow[]>(side, file, declaration, bindings);
}

function sortCase(id: string, file: string): BenchmarkCase {
  return benchmarkPair({
    id,
    title: "Immutable sort avoids an explicit array copy",
    files: [file, ...(file === dockerFile ? ["packages/docker/src/shared.ts"] : [])],
    iterations: 100,
    timing: true,
    fixture:
      "Small: 24 rows sorted by name ascending; large: 2,000 rows sorted by CPU descending, with duplicate sort keys. Timed inputs are mutable dense arrays like production filter/map results. Separate frozen fixtures verify immutability; iterator instrumentation counts explicit spread copies separately from timing.",
    async prepare(ctx) {
      const fixtures = [sortFixture(24), sortFixture(2000)];
      const operations = Object.fromEntries(
        sides.map((side) => [
          side,
          fixtures.map((rows, index) => {
            if (index === 0) return createSort(ctx, side, file, rows, "name", "asc");
            return createSort(ctx, side, file, rows, "cpuUsage", "desc");
          }),
        ]),
      );
      const execute = (side: Side) =>
        (operations as Record<Side, ReturnType<typeof createSort>[]>)[side].map((operation) => operation());
      return {
        before: () => execute("before"),
        after: () => execute("after"),
        verify(before, after) {
          assert.deepEqual(after, before);
          for (const [index, rows] of fixtures.entries()) {
            assert.notEqual((after as SortRow[][])[index], rows);
            assert.deepEqual(rows, sortFixture(rows.length));
          }
          const frozenRows = Object.freeze(sortFixture(24));
          const frozenBefore = createSort(ctx, "before", file, frozenRows, "name", "asc")();
          const frozenAfter = createSort(ctx, "after", file, frozenRows, "name", "asc")();
          assert.deepEqual(frozenAfter, frozenBefore);
          assert.notEqual(frozenAfter, frozenRows);
          assert.deepEqual(frozenRows, sortFixture(24));
          const edges = Object.freeze([
            { name: "same", cpuUsage: undefined },
            { name: "same", cpuUsage: NaN },
            { name: null, cpuUsage: 0 },
          ]);
          for (const accessor of ["name", "cpuUsage", "memoryUsage", "state"]) {
            for (const direction of ["asc", "desc"]) {
              assert.deepEqual(
                createSort(ctx, "after", file, edges, accessor, direction)(),
                createSort(ctx, "before", file, edges, accessor, direction)(),
              );
            }
          }
        },
        metrics(_result, side) {
          const metrics: Record<string, number> = {};
          for (const [index, fixture] of fixtures.entries()) {
            let explicitCopies = 0;
            const rows = fixture.slice();
            rows[Symbol.iterator] = function () {
              explicitCopies++;
              return Array.prototype[Symbol.iterator].call(this);
            };
            const output = createSort(ctx, side, file, rows, "name", "asc")();
            assert.notEqual(output, rows);
            const scale = ["small", "large"][index];
            metrics[scale + "ArrayCopies"] = explicitCopies + 1;
            metrics[scale + "CopiedElements"] = rows.length * (explicitCopies + 1);
          }
          return metrics;
        },
      };
    },
  });
}

export const cases: BenchmarkCase[] = [
  bookmarkCase,
  repositoryCase,
  appCase,
  sortCase("WIDGETS_B_004", beszelFile),
  sortCase("WIDGETS_B_007", dockerFile),
];
