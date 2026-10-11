import assert from "node:assert/strict";
import { createHmac, hkdfSync } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

import { eq, getTableColumns } from "drizzle-orm";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { index as sqliteIndex, int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import dayjs from "dayjs";
import { z } from "zod/v4";

import type { BenchmarkCase, BenchmarkContext, Side } from "../lib.mts";
import { benchmarkPair } from "../lib.mts";

const logger = new Proxy({}, { get: () => () => undefined });
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value));
const delay = () => new Promise((resolve) => setTimeout(resolve, 2));
const schemaFile = "packages/db/schema/sqlite.ts";
const commonArray = "packages/common/src/array.ts";
const commonObject = "packages/common/src/object.ts";

class FixtureIntegration {
  integration: any;
  constructor(integration: any) {
    this.integration = integration;
  }
  url(path: string, params: Record<string, unknown> = {}) {
    const url = new URL(`https://fixture.invalid${path}`);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
    return url;
  }
  externalUrl(path: string) {
    return this.url(path);
  }
  getSecretValue(name: string) {
    return name === "apiKey" ? "fixture-key" : "fixture-credential";
  }
  hasSecretValue(name: string) {
    return name === "apiKey";
  }
}

const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });

function cliCase(id: string, file: string, declaration: string, tableName: "users" | "integrations") {
  return benchmarkPair({
    id,
    title: `CLI relational projection: ${declaration}`,
    files: [file, schemaFile],
    async: true,
    iterations: 10,
    fixture:
      "1,000 synthetic rows in a real in-memory SQLite database, using tables extracted from the actual schema. Actual CLI handlers produce Drizzle SQL, executed by Node SQLite; bytes are serialized query results, not network packets. User fixture includes null names/emails and both provider types. Names are already lowercase so repair update count remains zero.",
    prepare(ctx: BenchmarkContext) {
      const connections: DatabaseSync[] = [];
      function operation(side: Side) {
        const table = ctx.evaluate<any>(side, schemaFile, tableName, {
          sqliteTable,
          text,
          int,
          index: sqliteIndex,
          defaultByteUnitSystem: "decimal",
          defaultHeaderPreferencesSerialized: "{}",
        });
        const columns = Object.keys(getTableColumns(table));
        const connection = new DatabaseSync(":memory:");
        connections.push(connection);
        const databaseName = tableName === "users" ? "user" : "integration";
        connection.exec(`CREATE TABLE "${databaseName}" (${columns.map((name) => `"${name}"`).join(",")})`);
        const insert = connection.prepare(`INSERT INTO "${databaseName}" VALUES (${columns.map(() => "?").join(",")})`);
        for (let row = 0; row < 1_000; row++) {
          const values: Record<string, unknown> = {
            id: `id-${row}`,
            name: `name-${row}`,
            email: `user-${row}@fixture.invalid`,
            emailVerified: 1_780_000_000_000,
            image: `https://fixture.invalid/user/${row}.png`,
            password: "$2b$12$" + "f".repeat(53),
            provider: row % 2 === 0 ? "credentials" : "oidc",
            homeBoardId: `board-${row}`,
            mobileHomeBoardId: `mobile-${row}`,
            defaultSearchEngineId: "search-engine",
            openSearchInNewTab: 1,
            ddgBangs: 1,
            colorScheme: "dark",
            byteUnitSystem: "decimal",
            firstDayOfWeek: 1,
            pingIconsEnabled: 0,
            enableRightClickOnWidgets: 1,
            headerPreferences: '{"search":true,"clock":true}',
            completedManageTour: 1,
            completedBoardTour: 1,
            url: `https://service-${row}.fixture.invalid/api`,
            kind: "gotify",
            appId: `app-${row}`,
          };
          if (tableName === "users" && row % 14 === 0) values.name = null;
          if (tableName === "users" && row % 11 === 0) values.email = null;
          insert.run(...columns.map((column) => values[column] as any));
        }
        const orm = drizzle(async () => ({ rows: [] }), { schema: { [tableName]: table } });
        let output: string[] = [];
        let rows: unknown[] = [];
        let selectedColumns = 0;
        let selectSql = "";
        let queryCount = 0;
        const db = {
          query: {
            [tableName]: {
              findMany: async (options?: any) => {
                const query = (orm.query as any)[tableName].findMany(options).toSQL();
                selectSql = query.sql;
                queryCount++;
                rows = connection.prepare(query.sql).all(...query.params);
                selectedColumns = columns.length;
                if (options?.columns) selectedColumns = Object.keys(options.columns).length;
                return rows;
              },
            },
          },
          update: (target: any) => ({
            set: (values: any) => ({
              where: async (condition: any) => {
                const query = orm.update(target).set(values).where(condition).toSQL();
                connection.prepare(query.sql).run(...query.params);
                queryCount++;
              },
            }),
          }),
        };
        const command = ctx.evaluate<any>(side, file, declaration, {
          db,
          users: table,
          command: (configuration: unknown) => configuration,
          eq,
          process: { env: { AUTH_PROVIDERS: "credentials" } },
          console: { log: (line: string) => output.push(line) },
        });
        return async () => {
          output = [];
          rows = [];
          queryCount = 0;
          await command.handler();
          return { output, rows: rows.length, payloadBytes: bytes(rows), selectedColumns, queryCount, selectSql };
        };
      }
      return {
        before: operation("before"),
        after: operation("after"),
        verify(before: any, after: any) {
          assert.deepEqual(after.output, before.output);
          assert.equal(after.rows, before.rows);
          assert.ok(after.payloadBytes < before.payloadBytes);
          assert.equal(after.queryCount, before.queryCount);
          assert.equal(after.selectSql.includes('"password"'), false);
        },
        metrics(result: any) {
          return {
            databaseQueries: result.queryCount,
            resultRows: result.rows,
            selectedColumns: result.selectedColumns,
            serializedResultBytes: result.payloadBytes,
          };
        },
        cleanup() {
          for (const connection of connections) connection.close();
        },
      };
    },
  });
}

const translationFile = "packages/translation/src/request.ts";
const localeFile = "packages/translation/src/lang/en.json";
const translationCase = (fixtureKind: "english" | "wide") =>
  benchmarkPair({
    id: `FW-002:${fixtureKind}`,
    title: "Translation filtering without copying accumulated siblings",
    files: [translationFile, localeFile],
    iterations: 20,
    fixture:
      fixtureKind === "english"
        ? "Actual English locale; only filtering runs in the measured operation. No simulated I/O. Original strings and nested objects are retained or omitted using the existing rules."
        : "Synthetic 1,000-sibling catalog with whitespace-only and nested translations. No simulated I/O. Width deliberately magnifies allocation cost and does not represent the current locale width.",
    prepare(ctx) {
      const locale = JSON.parse(ctx.source("before", localeFile));
      assert.deepEqual(JSON.parse(ctx.source("after", localeFile)), locale);
      const wide = Object.fromEntries(
        Array.from({ length: 1_000 }, (_, index) => [`key-${index}`, `translation ${index}`]),
      );
      wide.blank = "  \n ";
      const fixture = { ...wide, nested: { retained: "Keep surrounding spaces ", omitted: "\t" } };
      const originalLocale = JSON.stringify(locale);
      const originalWide = JSON.stringify(fixture);
      const before = ctx.evaluate<(input: any) => any>("before", translationFile, "removeEmptyTranslations");
      const after = ctx.evaluate<(input: any) => any>("after", translationFile, "removeEmptyTranslations");
      let input = locale;
      if (fixtureKind === "wide") input = fixture;
      const invoke = (fn: (input: any) => any) => () => fn(input);
      return {
        before: invoke(before),
        after: invoke(after),
        verify(beforeResult: any, afterResult: any) {
          assert.deepEqual(afterResult, beforeResult);
          assert.equal(JSON.stringify(locale), originalLocale);
          assert.equal(JSON.stringify(fixture), originalWide);
          const wideResult = after(fixture);
          assert.deepEqual(wideResult, before(fixture));
          assert.equal(Object.hasOwn(wideResult, "blank"), false);
          assert.equal(wideResult.nested.retained, fixture.nested.retained);
          const prototypeKey = JSON.parse('{"__proto__":{"retained":"value"},"constructor":"label"}');
          const expected = before(prototypeKey);
          const actual = after(prototypeKey);
          assert.deepEqual(actual, expected);
          assert.equal(Object.getPrototypeOf(actual), Object.prototype);
        },
        metrics(result: any) {
          return { resultJsonBytes: bytes(result) };
        },
      };
    },
  });

const iconFile = "packages/cron-jobs/src/jobs/icons-updater.ts";
const iconCase = benchmarkPair({
  id: "DCR-001",
  title: "Icon reconciliation indexes persisted groups and checksums",
  files: [iconFile, commonArray],
  async: true,
  iterations: 5,
  fixture:
    "Synthetic six persisted repositories with 3,000 icons each, modeled on the six configured source groups. Exercises unchanged checksums, removed icons/repository, failed fetch, new repository and duplicate fetched checksums. Mock database writes capture actual job predicates and inserts; no upstream or database latency is simulated. Catalog cardinalities are synthetic, not a live installation count.",
  prepare(ctx) {
    const repository = (group: number, size: number) => ({
      id: `repo-${group}`,
      slug: `slug-${group}`,
      icons: Array.from({ length: size }, (_, icon) => ({
        id: `icon-${group}-${icon}`,
        iconRepositoryId: `repo-${group}`,
        checksum: `sum-${group}-${icon}`,
      })),
    });
    const persisted = Array.from({ length: 6 }, (_, group) => repository(group, 3_000));
    const fetched = persisted.slice(0, 5).map((group, index) => ({
      slug: group.slug,
      success: index !== 2,
      icons: group.icons.slice(0, 2_999).map((icon) => ({
        checksum: icon.checksum,
        fileNameWithExtension: "icon.png",
        imageUrl: "https://fixture.invalid/icon.png",
      })),
    }));
    fetched.push({
      slug: "new-repository",
      success: true,
      icons: [
        { checksum: "new", fileNameWithExtension: "new.png", imageUrl: "https://fixture.invalid/new.png" },
        { checksum: "new", fileNameWithExtension: "new.png", imageUrl: "https://fixture.invalid/new.png" },
      ],
    });
    const icons = { table: "icons", iconRepositoryId: "iconRepositoryId", checksum: "checksum" };
    const iconRepositories = { table: "repositories", id: "id" };
    function operation(side: Side) {
      let counter = 0;
      let writes: any[] = [];
      const transaction = {
        delete: (table: any) => ({
          where: (predicate: unknown) => ({
            run: () => {
              writes.push({ delete: table.table, predicate });
              return { changes: 0 };
            },
          }),
        }),
        insert: (table: any) => ({
          values: (rows: any[]) => ({ run: () => writes.push({ insert: table.table, rows: rows.slice() }) }),
        }),
      };
      const callback = ctx.evaluate<() => Promise<void>>(side, iconFile, "iconsUpdaterJob", {
        createCronJob: () => ({ withCallback: (fn: unknown) => fn }),
        EVERY_WEEK: "weekly",
        env: { NO_EXTERNAL_CONNECTION: false },
        logger,
        Stopwatch: class {
          reset() {}
          getElapsedInFormattedMilliseconds() {
            return "fixture";
          }
        },
        createId: () => `new-${counter++}`,
        fetchIconsAsync: async () => fetched,
        db: {
          query: { iconRepositories: { findMany: async () => persisted } },
          transaction: (fn: any) => fn(transaction),
        },
        iconRepositories,
        icons,
        handleTransactionsAsync: async (_db: any, handlers: any) => handlers.handleSync(),
        splitToNChunks: ctx.evaluate(side, commonArray, "splitToNChunks"),
        eq: (column: string, value: unknown) => ["eq", column, value],
        inArray: (column: string, values: unknown) => ["in", column, values],
        notInArray: (column: string, values: unknown) => ["not-in", column, values],
        and: (...conditions: unknown[]) => ["and", ...conditions],
        or: (...conditions: unknown[]) => ["or", ...conditions],
      });
      return async () => {
        counter = 0;
        writes = [];
        await callback();
        return { writes };
      };
    }
    return {
      before: operation("before"),
      after: operation("after"),
      verify(before: any, after: any) {
        assert.deepEqual(after, before);
        const filters = after.writes[0].predicate;
        assert.equal(JSON.stringify(filters).includes('"repo-2"'), false, "Failed fetch must skip pruning");
        const newIcons = after.writes
          .filter((write: any) => write.insert === "icons")
          .flatMap((write: any) => write.rows);
        assert.equal(newIcons.length, 2, "Retain existing duplicate-fetched-checksum behavior");
      },
      metrics(result: any) {
        return {
          persistedIcons: 18_000,
          fetchedIcons: fetched.reduce((sum, group) => sum + group.icons.length, 0),
          databaseReads: 1,
          databaseWriteStatements: result.writes.length,
          writePayloadBytes: bytes(result.writes),
        };
      },
    };
  },
});

const cronCreatorFile = "packages/cron-jobs-core/src/creator.ts";
const cronGroupFile = "packages/cron-jobs-core/src/group.ts";
const cronCase = benchmarkPair({
  id: "DCR-002",
  title: "Cron initialization reuses its configuration snapshot",
  files: [cronCreatorFile, cronGroupFile, commonObject],
  async: true,
  iterations: 3,
  fixture:
    "Four fixture jobs: custom interval, disabled, missing/default and forced-default. Each mocked database read delays 2ms; no real database or cron schedule runs. Production registry has three jobs, so this fixture is a small contract matrix, not a latency claim for production startup.",
  prepare(ctx) {
    const configurations = [
      { name: "analytics", cronExpression: "custom", isEnabled: true },
      { name: "iconsUpdater", cronExpression: "disabled", isEnabled: false },
      { name: "locked", cronExpression: "ignored", isEnabled: true },
    ];
    function operation(side: Side) {
      let databaseReads = 0;
      const db = {
        query: {
          cronJobConfigurations: {
            findMany: async () => {
              databaseReads++;
              await delay();
              return configurations;
            },
            findFirst: async ({ where }: any) => {
              databaseReads++;
              await delay();
              const name = where({ name: "name" }, { eq: (_column: any, value: any) => value });
              return configurations.find((row) => row.name === name);
            },
          },
        },
      };
      const callback = ctx.evaluate<any>(side, cronCreatorFile, "createCallback", {
        db,
        Cron: class {
          expression: string;
          constructor(expression: string) {
            this.expression = expression;
          }
        },
      });
      const jobRegistry = new Map();
      const createGroup = ctx.evaluate<any>(side, cronGroupFile, "createJobGroupCreator", {
        db,
        jobRegistry,
        objectEntries: ctx.evaluate(side, commonObject, "objectEntries"),
        objectKeys: ctx.evaluate(side, commonObject, "objectKeys"),
      });
      return async () => {
        databaseReads = 0;
        jobRegistry.clear();
        const jobs = Object.fromEntries(
          ["analytics", "iconsUpdater", "ping", "locked"].map((name) => [
            name,
            callback(name, "default", { preventCustomInterval: name === "locked" }, { logger })(() => undefined),
          ]),
        );
        const group = createGroup({ logger })(jobs);
        await group.initializeAsync();
        return {
          databaseReads,
          scheduled: Object.keys(jobs).map((name) => [name, group.getTask(name)?.expression ?? null]),
        };
      };
    }
    return {
      before: operation("before"),
      after: operation("after"),
      verify(before: any, after: any) {
        assert.deepEqual(after.scheduled, before.scheduled);
        assert.deepEqual(after.scheduled, [
          ["analytics", "custom"],
          ["iconsUpdater", null],
          ["ping", "default"],
          ["locked", "default"],
        ]);
        assert.equal(after.databaseReads, 1);
      },
      metrics(result: any) {
        return { databaseReads: result.databaseReads, registeredJobs: 4, scheduledJobs: 3, simulatedReadDelayMs: 2 };
      },
    };
  },
});

const gotifyFile = "packages/integrations/src/gotify/gotify-integration.ts";
const gotifySchemaFile = "packages/integrations/src/gotify/gotify-schema.ts";
const proxyFile = "packages/image-proxy/src/index.ts";
const gotifyCase = benchmarkPair({
  id: "F2",
  title: "Gotify resolves proxy icons for referenced application IDs",
  files: [gotifyFile, gotifySchemaFile, proxyFile],
  async: true,
  iterations: 10,
  fixture:
    "64 applications and 100 messages referencing four real app IDs, one unknown app ID and one app whose icon registration fails. Executes actual Gotify schemas/class and actual ImageProxy.createImageAsync, with deterministic encryption and mocked Redis cache channels. Cache is cleared each operation to measure cold registration work. Proxy registration does not download upstream images.",
  prepare(ctx) {
    const applications = Array.from({ length: 64 }, (_, id) => ({
      id,
      name: `application-${id}`,
      image: `/image/${id}.png`,
    }));
    const failingApplication = applications[2];
    assert.ok(failingApplication);
    failingApplication.image = "/fail-icon.png";
    const messages = {
      messages: Array.from({ length: 100 }, (_, id) => ({
        id,
        appid: [0, 1, 2, 3, 999][id % 5],
        date: "2026-10-01T12:00:00Z",
        title: `message-${id}`,
        message: "fixture body",
      })),
    };
    function operation(side: Side) {
      const schemas = ctx.evaluate<any>(
        side,
        gotifySchemaFile,
        [
          "gotifyMessageSchema",
          "gotifyMessagesResponseSchema",
          "gotifyApplicationSchema",
          "gotifyApplicationsResponseSchema",
        ],
        { z },
        { returnExpression: "({gotifyMessagesResponseSchema,gotifyApplicationsResponseSchema})" },
      );
      let reads = 0;
      let writes = 0;
      let requests = 0;
      let proxyCalls = 0;
      let counter = 0;
      const cache = new Map();
      const ImageProxy = ctx.evaluate<any>(
        side,
        proxyFile,
        ["IMAGE_PROXY_REDIS_TTL_SECONDS", "createHmacChannel", "createUrlByIdChannel", "ImageProxy"],
        {
          createHmac,
          hkdfSync,
          env: { SECRET_ENCRYPTION_KEY: "0".repeat(64) },
          logger,
          createId: () => `fixture-${counter++}`,
          encryptSecret: (value: string) => value,
          createGetSetChannel: (name: string) => ({
            getAsync: async () => {
              reads++;
              return cache.get(name) ?? null;
            },
            setAsync: async (value: unknown) => {
              writes++;
              cache.set(name, value);
            },
          }),
        },
      );
      class CountingImageProxy extends ImageProxy {
        async createImageAsync(url: string, headers: any) {
          proxyCalls++;
          if (url.endsWith("/fail-icon.png")) throw new Error("fixture icon failure");
          return super.createImageAsync(url, headers);
        }
      }
      const Integration = ctx.evaluate<any>(side, gotifyFile, "GotifyIntegration", {
        Integration: FixtureIntegration,
        ImageProxy: CountingImageProxy,
        ...schemas,
        ResponseError: Error,
        fetchWithTrustedCertificatesAsync: async (url: URL) => {
          requests++;
          return response(url.pathname === "/message" ? messages : applications);
        },
      });
      const integration = new Integration({ id: "fixture", name: "fixture" });
      return async () => {
        reads = 0;
        writes = 0;
        requests = 0;
        proxyCalls = 0;
        counter = 0;
        cache.clear();
        const notifications = await integration.getNotificationsAsync();
        // Cold caches allocate different proxy IDs when unused applications disappear.
        const output = notifications.map((item: any) => ({
          ...item,
          source: item.source && { ...item.source, iconUrl: item.source.iconUrl ? "registered-icon" : undefined },
        }));
        return { output, reads, writes, requests, proxyCalls };
      };
    }
    return {
      before: operation("before"),
      after: operation("after"),
      verify(before: any, after: any) {
        assert.deepEqual(after.output, before.output);
        assert.equal(after.proxyCalls, 4);
        assert.equal(before.proxyCalls, 64);
        assert.equal(after.requests, 2);
      },
      metrics(result: any) {
        return {
          upstreamHttpRequests: result.requests,
          proxyRegistrationAttempts: result.proxyCalls,
          redisReads: result.reads,
          redisWrites: result.writes,
          notificationCount: result.output.length,
          upstreamResponseJsonBytes: bytes(messages) + bytes(applications),
        };
      },
    };
  },
});

const umamiFile = "packages/integrations/src/umami/umami-integration.ts";
const umamiTypesFile = "packages/integrations/src/umami/umami-types.ts";
const umamiCase = benchmarkPair({
  id: "F3",
  title: "Umami event series use bounded request batches",
  files: [umamiFile, umamiTypesFile, commonArray, commonObject],
  async: true,
  iterations: 3,
  fixture:
    "Nine selected events; eight successful aggregated-bucket responses and one HTTP 500 retaining empty data. Each upstream request delays 2ms. Actual auth headers, event-series method, parsers and pagination code execute; live Umami rate limits/concurrency and production latency are unverified. Existing focused tests separately cover paging, ignored pages and ceiling behavior.",
  prepare(ctx) {
    const eventNames = Array.from({ length: 9 }, (_, index) => `event-${index}`);
    function operation(side: Side) {
      let requests = 0;
      let active = 0;
      let peak = 0;
      let payloadBytes = 0;
      const schemas = ctx.evaluate<any>(
        side,
        umamiTypesFile,
        ["umamiPageviewDataPointSchema", "umamiAuthResponseSchema"],
        { z },
        { returnExpression: "({umamiPageviewDataPointSchema,umamiAuthResponseSchema})" },
      );
      const declarations = [
        "UMAMI_CUSTOM_EVENT_TYPE",
        "UMAMI_EVENT_NAME_LIMIT",
        "UMAMI_EVENT_PAGE_SIZE",
        "UMAMI_EVENT_PAGE_MAX",
        "pad",
        "extractDataArray",
        "UmamiIntegration",
      ];
      if (side === "after") declarations.push("UMAMI_EVENT_SERIES_CONCURRENCY");
      const Integration = ctx.evaluate<any>(
        side,
        umamiFile,
        declarations,
        {
          Integration: FixtureIntegration,
          dayjs,
          logger,
          ...schemas,
          ResponseError: Error,
          isRecord: ctx.evaluate(side, commonObject, "isRecord"),
          splitToChunksWithNItems: ctx.evaluate(side, commonArray, "splitToChunksWithNItems"),
          fetchWithTrustedCertificatesAsync: async (url: URL, options: any) => {
            assert.equal(options.headers["x-umami-api-key"], "fixture-key");
            requests++;
            active++;
            peak = Math.max(peak, active);
            await delay();
            active--;
            const eventName = url.searchParams.get("eventName");
            const body = [{ x: "2026-10-01 12:00:00", y: Number(eventName?.split("-")[1]) + 1 }];
            payloadBytes += bytes(body);
            return response(body, eventName === "event-4" ? 500 : 200);
          },
        },
        { returnExpression: "UmamiIntegration" },
      );
      const integration = new Integration({ id: "fixture", name: "fixture" });
      return async () => {
        requests = 0;
        active = 0;
        peak = 0;
        payloadBytes = 0;
        const output = await integration.getMultiEventTimeSeriesAsync("site", "24h", eventNames);
        return { output, requests, peak, payloadBytes };
      };
    }
    return {
      before: operation("before"),
      after: operation("after"),
      verify(before: any, after: any) {
        assert.deepEqual(after.output, before.output);
        assert.equal(after.peak, 3);
        assert.equal(before.peak, 1);
        assert.deepEqual(after.output[4].dataPoints, []);
      },
      metrics(result: any) {
        return {
          upstreamHttpRequests: result.requests,
          maxConcurrentRequests: result.peak,
          responseJsonBytes: result.payloadBytes,
          selectedEvents: 9,
          simulatedRequestDelayMs: 2,
        };
      },
    };
  },
});

const omvFile = "packages/integrations/src/openmediavault/openmediavault-integration.ts";
const omvTypesFile = "packages/integrations/src/openmediavault/openmediavault-types.ts";
const omvCase = benchmarkPair({
  id: "F1",
  title: "OpenMediaVault waterfall retained pending session/concurrency proof",
  files: [omvFile, omvTypesFile],
  async: true,
  iterations: 3,
  description:
    "No production change: both sides execute the existing health method. A separate actual-auth-method diagnostic simulates login invalidating the prior session and measures four concurrent refreshes; those diagnostic numbers are not an optimized after result.",
  fixture:
    "Expired stored session, four read-only RPC response fixtures, 2ms per mocked HTTP request. Concurrent refresh diagnostic uses an explicitly simulated server that invalidates earlier logins. Actual OMV concurrency limits and session invalidation behavior remain unverified; retain serialized RPC ordering and first-failure semantics.",
  prepare(ctx) {
    const payloads: Record<string, unknown> = {
      system: {
        response: {
          version: "fixture",
          cpuModelName: null,
          cpuUtilization: 10,
          memUsed: "1",
          memAvailable: "2",
          uptime: 100,
          loadAverage: { "1min": 1, "5min": 2, "15min": 3 },
          rebootRequired: false,
          availablePkgUpdates: 0,
        },
      },
      filesystemmgmt: { response: [{ devicename: "disk", used: "1", available: 2, percentage: 33 }] },
      smart: { response: [{ devicename: "disk", temperature: "35", overallstatus: "GOOD" }] },
      cputemp: { response: { cputemp: 35 } },
    };
    const raceResults: Record<string, { logins: number; unauthorized: number }> = {};
    function operation(side: Side) {
      const schemas = ctx.evaluate<any>(
        side,
        omvTypesFile,
        ["systemInformationSchema", "fileSystemSchema", "smartSchema", "cpuTempSchema"],
        { z },
        { returnExpression: "({systemInformationSchema,fileSystemSchema,smartSchema,cpuTempSchema})" },
      );
      let session: any;
      let latest = "expired";
      let requests = 0;
      let logins = 0;
      let active = 0;
      let peak = 0;
      const Integration = ctx.evaluate<any>(side, omvFile, "OpenMediaVaultIntegration", {
        Integration: FixtureIntegration,
        ...schemas,
        logger,
        ResponseError: Error,
        createSessionStore: () => ({
          getAsync: async () => session,
          setAsync: async (value: unknown) => {
            session = value;
          },
        }),
        fetchWithTrustedCertificatesAsync: async (_url: URL, options: any) => {
          requests++;
          active++;
          peak = Math.max(peak, active);
          const body = JSON.parse(options.body);
          if (body.service === "session") {
            logins++;
            const token = `session-${logins}`;
            latest = token;
            await delay();
            active--;
            return response({ response: { sessionid: token } });
          }
          await delay();
          active--;
          if (options.headers["X-OPENMEDIAVAULT-SESSIONID"] !== latest || latest === "expired")
            return response({}, 401);
          return response(payloads[body.service]);
        },
      });
      const integration = new Integration({ id: "fixture", name: "fixture" });
      const reset = () => {
        session = { type: "header", sessionId: "expired" };
        latest = "expired";
        requests = 0;
        logins = 0;
        active = 0;
        peak = 0;
      };
      return {
        invoke: async () => {
          reset();
          const output = await integration.getSystemInfoAsync();
          return { output, requests, logins, peak };
        },
        race: async () => {
          reset();
          const results = await Promise.all(
            ["system", "filesystemmgmt", "smart", "cputemp"].map((service) =>
              integration.makeAuthenticatedRpcCallAsync(service, "fixture"),
            ),
          );
          raceResults[side] = {
            logins,
            unauthorized: results.filter((result: Response) => result.status === 401).length,
          };
        },
      };
    }
    const before = operation("before");
    const after = operation("after");
    return {
      before: before.invoke,
      after: after.invoke,
      async verify(beforeResult: any, afterResult: any) {
        assert.deepEqual(afterResult, beforeResult);
        assert.equal(afterResult.logins, 1);
        assert.equal(afterResult.peak, 1);
        await before.race();
        await after.race();
        assert.deepEqual(raceResults.after, raceResults.before);
        assert.equal(raceResults.after?.logins, 4);
        assert.equal(raceResults.after?.unauthorized, 3);
      },
      metrics(result: any, side) {
        const diagnostic = raceResults[side];
        assert.ok(diagnostic);
        return {
          upstreamHttpRequests: result.requests,
          sessionRefreshLogins: result.logins,
          maxConcurrentRequests: result.peak,
          simulatedRequestDelayMs: 2,
          diagnosticConcurrentRefreshLogins: diagnostic.logins,
          diagnosticUnauthorizedRetries: diagnostic.unauthorized,
        };
      },
    };
  },
});

export const cases: BenchmarkCase[] = [
  cliCase("CLI001", "packages/cli/src/commands/fix-usernames.ts", "fixUsernames", "users"),
  cliCase("CLI002", "packages/cli/src/commands/users-list.ts", "usersList", "users"),
  cliCase("CLI003", "packages/cli/src/commands/integrations-list.ts", "integrationsList", "integrations"),
  translationCase("english"),
  translationCase("wide"),
  iconCase,
  cronCase,
  gotifyCase,
  umamiCase,
  omvCase,
];
