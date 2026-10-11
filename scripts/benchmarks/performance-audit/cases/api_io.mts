import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

import type { BenchmarkCase, BenchmarkContext, Side } from "../lib.mts";
import { benchmarkPair } from "../lib.mts";

const sourceFile = "packages/api/src/router/custom-widget/source-resolver.ts";
const httpFile = "packages/api/src/router/integration/integration-http.ts";
const mediaFile = "packages/api/src/router/integration/integration-router.ts";
const podFile = "packages/api/src/router/kubernetes/router/pods.ts";
const permissionFile = "packages/auth/permissions/integration-permissions.ts";
const queryPermissionFile = "packages/auth/permissions/integration-query-permissions.ts";
const commonArrayFile = "packages/common/src/array.ts";
const definitionFile = "packages/definitions/src/integration.ts";
const schemaFile = "packages/db/schema/sqlite.ts";

class FixtureTRPCError extends Error {
  code: string;
  constructor(options: { code: string; message: string }) {
    super(options.message);
    this.code = options.code;
  }
}

const eq = (column: string, value: unknown) => ({ column, value });
const inArray = (column: string, values: unknown[]) => ({ column, values });
const and = (...conditions: unknown[]) => ({ and: conditions });
const or = (...conditions: unknown[]) => ({ or: conditions });
const session: { user: { id: string; permissions: string[] } } = { user: { id: "caller", permissions: [] } };

interface ReadMetrics {
  reads: number;
  active: number;
  maxActive: number;
}

async function simulatedRead<T>(metrics: ReadMetrics, result: () => T, delayMs = 1): Promise<T> {
  metrics.reads++;
  metrics.active++;
  metrics.maxActive = Math.max(metrics.maxActive, metrics.active);
  try {
    await delay(delayMs);
    return result();
  } finally {
    metrics.active--;
  }
}

function integrationPermissions(ctx: BenchmarkContext, side: Side) {
  return ctx.evaluate<(integration: unknown, session: unknown) => { hasFullAccess: boolean; hasUseAccess: boolean }>(
    side,
    permissionFile,
    "constructIntegrationPermissions",
  );
}

function chunks(ctx: BenchmarkContext, side: Side) {
  return ctx.evaluate(side, commonArrayFile, "splitToChunksWithNItems");
}

interface FixtureSource {
  type: string;
  integrationId?: string;
  integrationKind?: string;
}

interface SourceRun {
  outcome: { code: string; message: string } | null;
  dbReads: number;
  maxConcurrentReads: number;
  firstFailureDbReads: number;
  completionOrder: string[];
}

function sourceRunner(ctx: BenchmarkContext, side: Side) {
  const unavailable = ctx.evaluate(side, definitionFile, [
    "integrationHttpUnavailableReasons",
    "getIntegrationHttpUnavailableReason",
  ]);
  const getIntegration = ctx.evaluate(side, httpFile, "getIntegrationForHttpRequest", {
    eq,
    inArray,
    groupMembers: { userId: "userId" },
    integrations: { id: "id" },
    integrationUserPermissions: { userId: "userId" },
    integrationGroupPermissions: { groupId: "groupId" },
    constructIntegrationPermissions: integrationPermissions(ctx, side),
    getIntegrationHttpUnavailableReason: unavailable,
    TRPCError: FixtureTRPCError,
  });
  const assertBindings = ctx.evaluate<(context: unknown, sources: Record<string, FixtureSource>) => Promise<void>>(
    side,
    sourceFile,
    ["assertCustomWidgetIntegrationBindings", "resolveIntegration"],
    {
      getIntegrationForHttpRequest: getIntegration,
      splitToChunksWithNItems: chunks(ctx, side),
      TRPCError: FixtureTRPCError,
    },
    { returnExpression: "assertCustomWidgetIntegrationBindings" },
  );
  return async (sources: Record<string, FixtureSource>, userSession = session): Promise<SourceRun> => {
    const metrics: ReadMetrics = { reads: 0, active: 0, maxActive: 0 };
    const completionOrder: string[] = [];
    const readDelays = new Map([["full", 3]]);
    const db = {
      query: {
        groupMembers: { findMany: async () => simulatedRead(metrics, () => [{ groupId: "caller-group" }]) },
        integrations: {
          findFirst: async (options: any) =>
            simulatedRead(
              metrics,
              () => {
                const id = options.where.value as string;
                completionOrder.push(id);
                if (id === "missing") return undefined;
                const record = {
                  id,
                  kind: "sonarr",
                  url: "https://fixture.invalid",
                  secrets: [{ kind: "apiKey", value: "fixture.encrypted" }],
                  userPermissions: [{ userId: "other", permission: "full" }],
                  groupPermissions: [] as { groupId: string; permission: string }[],
                };
                if (id === "ical") record.kind = "ical";
                if (id === "full" || id.startsWith("valid-"))
                  record.userPermissions.push({ userId: "caller", permission: "full" });
                if (id === "use") record.userPermissions.push({ userId: "caller", permission: "use" });
                if (id === "group") record.groupPermissions.push({ groupId: "caller-group", permission: "full" });
                if (id === "ical") record.userPermissions.push({ userId: "caller", permission: "full" });
                record.userPermissions = record.userPermissions.filter(
                  ({ userId }) => userId === options.with.userPermissions.where.value,
                );
                record.groupPermissions = record.groupPermissions.filter(({ groupId }) =>
                  options.with.groupPermissions.where.values.includes(groupId),
                );
                return record;
              },
              readDelays.get(options.where.value) ?? 1,
            ),
        },
      },
    };
    let outcome: SourceRun["outcome"] = null;
    try {
      await assertBindings({ db, session: userSession }, sources);
    } catch (error) {
      assert.ok(error instanceof FixtureTRPCError);
      outcome = { code: error.code, message: error.message };
    }
    return {
      outcome,
      dbReads: metrics.reads,
      maxConcurrentReads: metrics.maxActive,
      firstFailureDbReads: 0,
      completionOrder,
    };
  };
}

const integrationSource = (integrationId?: string, integrationKind = "sonarr"): FixtureSource => ({
  type: "integration",
  integrationId,
  integrationKind,
});

interface MediaFixture {
  id: string;
  name: string;
  kind: string;
  url: string;
  app: { href: string; name: string; description: string };
  secrets: { kind: string; value: string; updatedAt: string }[];
  userPermissions: { permission: string }[];
  groupPermissions: { permission: string }[];
  items: { itemId: string; integrationId: string; item: Record<string, string> }[];
}

function mediaFixture(): MediaFixture[] {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `media-${index}`,
    name: `Media ${String(index).padStart(2, "0")}`,
    kind: "seerr",
    url: "https://fixture.invalid",
    app: { href: "https://external.fixture.invalid", name: "Fixture", description: "Keep app data" },
    secrets: [{ kind: "apiKey", value: "fixture.encrypted", updatedAt: "2026-10-11T00:00:00Z" }],
    userPermissions: [],
    groupPermissions: [],
    items: Array.from({ length: 8 }, (_item, item) => ({
      itemId: `item-${index}-${item}`,
      integrationId: `media-${index}`,
      item: {
        id: `item-${index}-${item}`,
        boardId: `board-${item}`,
        kind: "mediaRequestList",
        options: "x".repeat(4096),
        advancedOptions: "y".repeat(1024),
      },
    })),
  }));
}

interface MediaRun {
  result: MediaFixture[];
  outcome: { code: string; message: string } | null;
  selectedPayloadBytes: number;
  selectedItemFields: number;
  selectedLinkedItems: number;
  queryCount: number;
}

function mediaRunner(ctx: BenchmarkContext, side: Side) {
  const queryAccess = ctx.evaluate(
    side,
    queryPermissionFile,
    ["hasQueryAccessToIntegrationsAsync", "checkEveryIntegrationContainsSomeBoardIdIncludedInBoardsWithAccess"],
    {
      eq,
      inArray,
      and,
      or,
      constructIntegrationPermissions: integrationPermissions(ctx, side),
      boards: { id: "id", isPublic: "isPublic", creatorId: "creatorId" },
      boardUserPermissions: { userId: "userId" },
      groupMembers: { userId: "userId" },
    },
    { returnExpression: "hasQueryAccessToIntegrationsAsync" },
  );
  const resolver = ctx.evaluate<(context: unknown, ids?: string[]) => Promise<MediaFixture[]>>(
    side,
    mediaFile,
    "getAccessibleMediaRequestSearchIntegrationsAsync",
    {
      eq,
      inArray,
      and,
      asc: (column: unknown) => column,
      integrations: { id: "id", kind: "kind", name: "name" },
      groupMembers: { userId: "userId" },
      integrationUserPermissions: { userId: "userId" },
      integrationGroupPermissions: { groupId: "groupId" },
      mediaRequestSearchKinds: ["seerr", "overseerr", "jellyseerr"],
      hasQueryAccessToIntegrationsAsync: queryAccess,
      TRPCError: FixtureTRPCError,
    },
  );
  return async (
    settings: {
      fixtures?: MediaFixture[];
      session?: typeof session;
      ids?: string[];
      userBoards?: string[];
      groupBoards?: string[];
      publicOrOwnedBoards?: string[];
    } = {},
  ): Promise<MediaRun> => {
    const fixtures = settings.fixtures ?? mediaFixture();
    let selectedPayloadBytes = 0;
    let selectedItemFields = 0;
    let selectedLinkedItems = 0;
    let queryCount = 0;
    const db = {
      query: {
        groupMembers: {
          findMany: async (options: any) => {
            queryCount++;
            if (options.with)
              return [{ group: { boardPermissions: (settings.groupBoards ?? []).map((boardId) => ({ boardId })) } }];
            return [{ groupId: "caller-group" }];
          },
        },
        boardUserPermissions: {
          findMany: async () => {
            queryCount++;
            return (settings.userBoards ?? []).map((boardId) => ({ boardId }));
          },
        },
        boards: {
          findMany: async () => {
            queryCount++;
            return (settings.publicOrOwnedBoards ?? []).map((id) => ({ id }));
          },
        },
        integrations: {
          findMany: async (options: any) => {
            queryCount++;
            assert.equal(options.with.app, true);
            assert.equal(options.with.secrets, true);
            const itemSelection = options.with.items.with.item;
            let candidates = fixtures;
            if (settings.ids?.length) candidates = candidates.filter((entry) => settings.ids?.includes(entry.id));
            const selected = candidates.map((entry) => ({
              ...entry,
              items: entry.items.map((link) => {
                let item = link.item;
                if (itemSelection !== true) {
                  item = Object.fromEntries(
                    Object.keys(itemSelection.columns)
                      .filter((key) => itemSelection.columns[key])
                      .map((key) => [key, item[key]]),
                  );
                }
                selectedItemFields += Object.keys(item).length;
                selectedLinkedItems++;
                return { ...link, item };
              }),
            }));
            const serialized = JSON.stringify(selected);
            selectedPayloadBytes = Buffer.byteLength(serialized);
            // Simulate ORM payload materialization from exactly the selected fixture fields.
            return JSON.parse(serialized);
          },
        },
      },
    };
    let result: MediaFixture[] = [];
    let outcome: MediaRun["outcome"] = null;
    try {
      result = await resolver(
        { db, session: settings.session ?? { user: { id: "caller", permissions: ["board-view-all"] } } },
        settings.ids,
      );
    } catch (error) {
      assert.ok(error instanceof FixtureTRPCError);
      outcome = { code: error.code, message: error.message };
    }
    return { result, outcome, selectedPayloadBytes, selectedItemFields, selectedLinkedItems, queryCount };
  };
}

function consumedMediaFields(result: MediaFixture[]) {
  return result.map((entry) => ({
    ...entry,
    items: entry.items.map((link) => ({ ...link, item: { boardId: link.item.boardId } })),
  }));
}

async function mediaProjectionSql(ctx: BenchmarkContext, side: Side): Promise<string> {
  const orm = await import("drizzle-orm");
  const primitives = await import("drizzle-orm/sqlite-core");
  const { drizzle } = await import("drizzle-orm/sqlite-proxy");
  const names = [
    "integrations",
    "integrationSecrets",
    "integrationUserPermissions",
    "integrationGroupPermissions",
    "items",
    "apps",
    "integrationItems",
    "integrationRelations",
    "integrationUserPermissionRelations",
    "integrationGroupPermissionRelations",
    "integrationSecretRelations",
    "integrationItemRelations",
  ];
  const schema = ctx.evaluate<any>(
    side,
    schemaFile,
    names,
    {
      ...primitives,
      relations: orm.relations,
      emptySuperJSON: "{}",
      // Unselected foreign tables only provide their referenced IDs to the actual schema declarations.
      users: primitives.sqliteTable("user", { id: primitives.text().primaryKey() }),
      groups: primitives.sqliteTable("group", { id: primitives.text().primaryKey() }),
      boards: primitives.sqliteTable("board", { id: primitives.text().primaryKey() }),
    },
    { returnExpression: `({${names.join(",")}})` },
  );
  const sqlDb = drizzle(
    async () => ({ rows: [] }),
    async () => [],
    { schema, casing: "snake_case" },
  );
  const resolver = ctx.evaluate<(context: unknown) => Promise<unknown>>(
    side,
    mediaFile,
    "getAccessibleMediaRequestSearchIntegrationsAsync",
    {
      eq: orm.eq,
      inArray: orm.inArray,
      and: orm.and,
      asc: orm.asc,
      integrations: schema.integrations,
      integrationUserPermissions: schema.integrationUserPermissions,
      integrationGroupPermissions: schema.integrationGroupPermissions,
      groupMembers: primitives.sqliteTable("group_member", { userId: primitives.text() }),
      mediaRequestSearchKinds: ["seerr", "overseerr", "jellyseerr"],
      hasQueryAccessToIntegrationsAsync: async () => true,
      TRPCError: FixtureTRPCError,
    },
  );
  let queryOptions: any;
  await resolver({
    db: {
      query: {
        groupMembers: { findMany: async () => [] },
        integrations: {
          findMany: async (options: unknown) => {
            queryOptions = options;
            return [];
          },
        },
      },
    },
    session,
  });
  return sqlDb.query.integrations.findMany(queryOptions).toSQL().sql;
}

interface FixtureOwner {
  kind: string;
  name: string;
}
interface FixturePod {
  metadata?: { name?: string; namespace?: string; labels?: Record<string, string>; ownerReferences?: FixtureOwner[] };
  spec?: { containers: { image: string }[] };
  status?: { phase: string };
}

function pod(
  name: string,
  ownerReferences: FixtureOwner[],
  namespace = "main",
  labels: Record<string, string> = {},
): FixturePod {
  return {
    metadata: { name, namespace, ownerReferences, labels },
    spec: { containers: [{ image: "fixture:latest" }] },
    status: { phase: "Running" },
  };
}
const owner = (name: string): FixtureOwner => ({ kind: "ReplicaSet", name });

function podFixture(): FixturePod[] {
  return [
    ...Array.from({ length: 48 }, (_, index) => pod(`shared-${index}`, [owner(`replica-${index % 8}`)])),
    pod("east-1", [owner("same")], "east"),
    pod("west-1", [owner("same")], "west"),
    pod("east-2", [owner("same")], "east"),
    pod("west-2", [owner("same")], "west"),
    pod("bare-1", [owner("bare")]),
    pod("bare-2", [owner("bare")]),
    pod("failed-1", [owner("failed")]),
    pod("failed-2", [owner("failed")]),
    pod("fallback-1", [owner("failed"), { kind: "StatefulSet", name: "fallback" }]),
    pod("fallback-2", [owner("failed"), { kind: "DaemonSet", name: "fallback" }]),
    pod("chain-1", [owner("child")]),
    pod("chain-2", [owner("child")]),
    pod("unsupported", [owner("unsupported")]),
    pod("transient-1", [owner("transient")]),
    pod("transient-2", [owner("transient")]),
    pod("helm", [owner("never-read")], "main", { "app.kubernetes.io/managed-by": "Helm" }),
    pod("direct", [{ kind: "Deployment", name: "direct" }, owner("never-read")]),
    {},
  ];
}

interface PodRun {
  result: { name: string; applicationType: string }[];
  reads: number;
  uniqueReferences: number;
  maxConcurrentReads: number;
  errorLogs: number;
}

function podRunner(ctx: BenchmarkContext, side: Side) {
  let activeFixture: { metrics: ReadMetrics; calls: string[]; errorLogs: number };
  const appsApi = {
    readNamespacedReplicaSet: async ({ name, namespace }: { name: string; namespace: string }) => {
      const fixture = activeFixture;
      fixture.calls.push(`${namespace}/${name}`);
      return simulatedRead(fixture.metrics, () => {
        if (name === "failed") throw new Error("Simulated owner lookup failure");
        if (name === "transient" && fixture.calls.filter((key) => key === `${namespace}/${name}`).length === 1) {
          throw new Error("Simulated transient owner lookup failure");
        }
        if (name === "bare") return {};
        if (name === "child")
          return {
            metadata: {
              ownerReferences: [
                { kind: "Unknown", name: "unknown" },
                { kind: "ReplicaSet", name: "parent" },
              ],
            },
          };
        if (name === "parent")
          return { metadata: { ownerReferences: [{ kind: "DaemonSet", name: "recursive-daemon" }] } };
        if (name === "unsupported") return { metadata: { ownerReferences: [{ kind: "Unknown", name: "unknown" }] } };
        if (namespace === "west")
          return { metadata: { ownerReferences: [{ kind: "StatefulSet", name: "west-owner" }] } };
        return { metadata: { ownerReferences: [{ kind: "Deployment", name: "fixture-deployment" }] } };
      });
    },
  };
  const procedure: any = {};
  for (const method of ["requiresPermission", "meta", "concat", "input"]) procedure[method] = () => procedure;
  procedure.query = (handler: unknown) => handler;
  const getPods = ctx.evaluate<(arguments_: unknown) => Promise<PodRun["result"]>>(
    side,
    podFile,
    ["podsRouter", "getOwnerKind"],
    {
      AppsV1Api: {},
      logger: {
        error: () => {
          activeFixture.errorLogs++;
        },
      },
      createTRPCRouter: (router: { getPods: unknown }) => router,
      permissionRequiredProcedure: procedure,
      kubernetesMiddleware: () => ({}),
      kubernetesContextInput: {},
      getKubernetesClient: () => ({
        coreApi: { listPodForAllNamespaces: async () => ({ items: podFixture() }) },
        kubeConfig: { makeApiClient: () => appsApi },
      }),
      splitToChunksWithNItems: chunks(ctx, side),
      TRPCError: FixtureTRPCError,
    },
    { returnExpression: "podsRouter.getPods" },
  );
  return async (): Promise<PodRun> => {
    activeFixture = { metrics: { reads: 0, active: 0, maxActive: 0 }, calls: [], errorLogs: 0 };
    const result = await getPods({ input: { contextId: "fixture" } });
    return {
      result,
      reads: activeFixture.metrics.reads,
      uniqueReferences: new Set(activeFixture.calls).size,
      maxConcurrentReads: activeFixture.metrics.maxActive,
      errorLogs: activeFixture.errorLogs,
    };
  };
}

export const cases: BenchmarkCase[] = [
  benchmarkPair({
    id: "API-002",
    title: "Bounded custom-widget source integration validation",
    files: [sourceFile, httpFile, permissionFile, definitionFile, commonArrayFile],
    async: true,
    iterations: 1,
    fixture:
      "12 valid integration sources; each real resolver executes two mocked database reads with a simulated 1 ms timer. Error-path checks measure extra reads in a failed four-source batch; no live database latency is claimed.",
    metricUnits: { dbReads: "reads", maxConcurrentReads: "reads", firstFailureDbReads: "reads" },
    prepare(ctx) {
      const before = sourceRunner(ctx, "before");
      const after = sourceRunner(ctx, "after");
      const valid = Object.fromEntries(
        Array.from({ length: 12 }, (_, index) => [`source-${index}`, integrationSource(`valid-${index}`)]),
      );
      return {
        before: () => before(valid),
        after: () => after(valid),
        async verify(beforeValue, afterValue) {
          const baseline = beforeValue as SourceRun;
          const current = afterValue as SourceRun;
          assert.deepEqual(current.outcome, baseline.outcome);
          assert.equal(current.outcome, null);
          assert.equal(current.dbReads, 24);
          assert.equal(baseline.dbReads, 24);
          assert.ok(current.maxConcurrentReads <= 4);
          const scenarios: Record<string, FixtureSource>[] = [
            {},
            { manual: { type: "http" }, unset: integrationSource() },
            { full: integrationSource("full"), group: integrationSource("group") },
            { missing: integrationSource("missing") },
            { unauthorized: integrationSource("use") },
            { otherUserOnly: integrationSource("other-user") },
            { wrongKind: integrationSource("full", "radarr") },
            { unavailable: integrationSource("ical", "ical") },
            { firstWrongKind: integrationSource("full", "radarr"), laterMissing: integrationSource("missing") },
          ];
          for (const sources of scenarios) {
            const previous = await before(sources);
            const next = await after(sources);
            assert.deepEqual(next.outcome, previous.outcome);
            assert.ok(next.maxConcurrentReads <= 4);
          }
          const reordered = await after({
            firstWrongKind: integrationSource("full", "radarr"),
            laterMissing: integrationSource("missing"),
          });
          assert.deepEqual(reordered.completionOrder, ["missing", "full"]);
          assert.equal(reordered.outcome?.code, "PRECONDITION_FAILED");
          const global = { user: { id: "caller", permissions: ["integration-full-all"] } };
          assert.equal((await after({ global: integrationSource("other-user") }, global)).outcome, null);
          const firstFailure = {
            first: integrationSource("missing"),
            second: integrationSource("full"),
            third: integrationSource("group"),
            fourth: integrationSource("use"),
            laterBatch: integrationSource("full"),
          };
          const previousFailure = await before(firstFailure);
          const nextFailure = await after(firstFailure);
          assert.deepEqual(nextFailure.outcome, previousFailure.outcome);
          assert.equal(previousFailure.dbReads, 2);
          assert.equal(nextFailure.dbReads, 8);
          baseline.firstFailureDbReads = previousFailure.dbReads;
          current.firstFailureDbReads = nextFailure.dbReads;
        },
        metrics(value) {
          const result = value as SourceRun;
          return {
            dbReads: result.dbReads,
            maxConcurrentReads: result.maxConcurrentReads,
            firstFailureDbReads: result.firstFailureDbReads,
          };
        },
      };
    },
  }),
  benchmarkPair({
    id: "API-005",
    title: "Media-search linked item projection",
    files: [mediaFile, queryPermissionFile, permissionFile, schemaFile],
    async: true,
    iterations: 100,
    fixture:
      "12 integrations, each linked to 8 items with 4 KiB options and 1 KiB advanced options. Actual resolver projection controls mocked ORM JSON materialization. Counts and bytes describe this fixture, not a live database benchmark.",
    metricUnits: {
      selectedPayloadBytes: "bytes",
      selectedItemFields: "fields",
      selectedLinkedItems: "items",
      queryCount: "queries",
    },
    prepare(ctx) {
      const before = mediaRunner(ctx, "before");
      const after = mediaRunner(ctx, "after");
      return {
        before: () => before(),
        after: () => after(),
        async verify(beforeValue, afterValue) {
          const baseline = beforeValue as MediaRun;
          const current = afterValue as MediaRun;
          const beforeSql = await mediaProjectionSql(ctx, "before");
          const afterSql = await mediaProjectionSql(ctx, "after");
          assert.ok(beforeSql.includes('"options"'));
          assert.ok(beforeSql.includes('"advanced_options"'));
          assert.ok(!afterSql.includes('"options"'));
          assert.ok(!afterSql.includes('"advanced_options"'));
          assert.ok(afterSql.includes('json_array("board_id")'));
          assert.ok(afterSql.includes("json_group_array"));
          assert.deepEqual(consumedMediaFields(current.result), consumedMediaFields(baseline.result));
          assert.equal(current.result.length, 12);
          assert.equal(current.selectedLinkedItems, 96);
          assert.equal(current.selectedLinkedItems, baseline.selectedLinkedItems);
          assert.equal(current.selectedItemFields, 96);
          assert.equal(baseline.selectedItemFields, 480);
          const fixture = mediaFixture()[0];
          const noItems = { ...fixture, items: [] };
          const oneItem = { ...fixture, items: fixture.items.slice(0, 1) };
          const scenarios = [
            { fixtures: [noItems] },
            { fixtures: [noItems], session: { user: { id: "caller", permissions: ["integration-use-all"] } } },
            { fixtures: [oneItem], session, userBoards: ["board-0"] },
            { fixtures: [fixture], session, userBoards: ["board-7"] },
            { fixtures: [fixture], session, groupBoards: ["board-7"] },
            { fixtures: [fixture], session, publicOrOwnedBoards: ["board-7"] },
            { fixtures: [fixture], session },
            { fixtures: [{ ...noItems, userPermissions: [{ permission: "use" }] }], session },
            { fixtures: [{ ...noItems, groupPermissions: [{ permission: "full" }] }], session },
            { fixtures: [fixture], session, ids: [fixture.id] },
            { fixtures: [fixture], ids: ["missing"] },
          ];
          for (const settings of scenarios) {
            const previous = await before(settings);
            const next = await after(settings);
            assert.deepEqual(next.outcome, previous.outcome);
            assert.deepEqual(consumedMediaFields(next.result), consumedMediaFields(previous.result));
            assert.equal(next.selectedLinkedItems, previous.selectedLinkedItems);
          }
          assert.equal((await after({ fixtures: [noItems] })).result.length, 0);
          assert.equal((await after({ fixtures: [fixture], session, userBoards: ["board-7"] })).result.length, 1);
          assert.equal((await after({ fixtures: [fixture], session, ids: [fixture.id] })).outcome?.code, "FORBIDDEN");
          assert.equal((await after({ fixtures: [fixture], ids: ["missing"] })).outcome?.code, "NOT_FOUND");
        },
        metrics(value) {
          const result = value as MediaRun;
          return {
            selectedPayloadBytes: result.selectedPayloadBytes,
            selectedItemFields: result.selectedItemFields,
            selectedLinkedItems: result.selectedLinkedItems,
            queryCount: result.queryCount,
          };
        },
      };
    },
  }),
  benchmarkPair({
    id: "API-006",
    title: "Bounded, deduplicated Kubernetes ReplicaSet reads",
    files: [podFile, commonArrayFile],
    async: true,
    iterations: 1,
    fixture:
      "66 pods include repeated ReplicaSets, identical names in separate namespaces, recursive owners, no owner metadata, persistent and transient failed reads with fallback owners, Helm and direct workloads. Kubernetes read delay is explicitly simulated at 1 ms; request/log counts come from actual extracted router calls.",
    metricUnits: {
      replicaSetReads: "requests",
      uniqueReferences: "references",
      maxConcurrentReads: "requests",
      errorLogs: "logs",
      pods: "pods",
    },
    prepare(ctx) {
      const before = podRunner(ctx, "before");
      const after = podRunner(ctx, "after");
      return {
        before,
        after,
        verify(beforeValue, afterValue) {
          const baseline = beforeValue as PodRun;
          const current = afterValue as PodRun;
          assert.deepEqual(current.result, baseline.result);
          assert.equal(current.result.length, 66);
          assert.equal(current.errorLogs, baseline.errorLogs);
          assert.equal(current.errorLogs, 5);
          assert.equal(current.reads, current.uniqueReferences + 4);
          assert.ok(current.reads < baseline.reads);
          assert.ok(current.maxConcurrentReads <= 4);
          const kinds = Object.fromEntries(current.result.map(({ name, applicationType }) => [name, applicationType]));
          assert.equal(kinds["east-1"], "Deployment");
          assert.equal(kinds["west-1"], "StatefulSet");
          assert.equal(kinds["bare-1"], "ReplicaSet");
          assert.equal(kinds["failed-1"], "Pod");
          assert.equal(kinds["fallback-1"], "StatefulSet");
          assert.equal(kinds["chain-1"], "DaemonSet");
          assert.equal(kinds.unsupported, "ReplicaSet");
          assert.equal(kinds["transient-1"], "Pod");
          assert.equal(kinds["transient-2"], "Deployment");
          assert.equal(kinds.helm, "Helm");
        },
        metrics(value) {
          const result = value as PodRun;
          return {
            replicaSetReads: result.reads,
            uniqueReferences: result.uniqueReferences,
            maxConcurrentReads: result.maxConcurrentReads,
            errorLogs: result.errorLogs,
            pods: result.result.length,
          };
        },
      };
    },
  }),
];
