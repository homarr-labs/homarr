import assert from "node:assert/strict";

import { iconRepositorySources } from "@homarr/icons";
import type { FetchedIconRepository, IconSynchronizationPlan, StoredIconRepository } from "@homarr/icons";

import type { JobSchedule, JobScheduler } from "@homarr/cron-jobs-core/runtime";
import { createJobsRuntime, cronerJobScheduler } from "@homarr/cron-jobs-core/runtime";
import { createJobStatusRuntime } from "../../cron-job-status/src/runtime";
import type { JobStatusBacking, JobStatusRecord } from "../../cron-job-status/src/runtime";
import type { AnalyticsSettings, AnalyticsSnapshotRows } from "./jobs/runtime-bodies";
import { createHomarrJobsRuntime } from "./runtime";
import { createJobConfigurationSqlStore } from "./sql";
import type { JobSqlStatement } from "./sql";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

const records = new Map<string, JobStatusRecord>([
  [
    "iconsUpdater",
    {
      revision: 9,
      ownerId: "old-owner",
      runId: "old-run",
      value: {
        name: "iconsUpdater",
        status: "running",
        lastExecutionStatus: "success",
        lastExecutionTimestamp: "2026-10-01T01:02:03.000Z",
      },
    },
  ],
]);
const listeners = new Set<(record: JobStatusRecord) => void>();
const disposalGate = deferred<void>();
let waitForDisposal = false;
const backing: JobStatusBacking = {
  getAsync: async (name) => records.get(name) ?? null,
  updateAsync: async (name, update) => {
    const previous = records.get(name) ?? null;
    const next = update(previous);
    if (!next) return null;
    const record = { ...next, revision: (previous?.revision ?? 0) + 1 };
    records.set(name, record);
    for (const listener of listeners) listener(record);
    return record;
  },
  subscribeAsync: async (names, listener) => {
    const allowed = new Set(names);
    const filtered = (record: JobStatusRecord) => {
      if (allowed.has(record.value.name)) listener(record);
    };
    listeners.add(filtered);
    return async () => {
      if (waitForDisposal) await disposalGate.promise;
      listeners.delete(filtered);
    };
  },
};
let id = 0;
let time = Date.parse("2026-10-10T12:00:00.000Z");
const clock = { now: () => new Date(time), monotonicMilliseconds: () => time };
const status = createJobStatusRuntime({
  backing,
  ownerId: "fresh-owner",
  now: clock.now,
  createRunId: () => `run-${++id}`,
});
const rows = new Map<string, Record<string, unknown>>([
  ["iconsUpdater", { name: "iconsUpdater", cron_expression: "7 3 * * 2", is_enabled: 0 }],
  ["ping", { name: "ping", cron_expression: "* * * * *", is_enabled: 1 }],
  ["retained-unknown-job", { name: "retained-unknown-job", cron_expression: "5 5 * * *", is_enabled: 0 }],
]);
const originalUnknownRow = rows.get("retained-unknown-job");
const sqlStatements: JobSqlStatement[] = [];
const sqlResources = {
  configuration: createJobConfigurationSqlStore({
    dialect: "sqlite",
    queryAsync: async (statement) => {
      sqlStatements.push(statement);
      if (statement.sql.startsWith('SELECT "name"')) return [...rows.values()];
      if (statement.sql.startsWith('INSERT INTO "cron_job_configuration"')) {
        const [name, cron, enabled] = statement.parameters;
        assert.equal(typeof name, "string");
        const key = String(name);
        const previous = rows.get(key);
        const next = {
          name,
          cron_expression:
            !previous || statement.sql.includes('SET "cron_expression"') ? cron : previous.cron_expression,
          is_enabled: !previous || statement.sql.includes('"is_enabled" = excluded') ? enabled : previous.is_enabled,
        };
        rows.set(key, next);
        return [next];
      }
      throw new Error(`Unexpected fixture SQL: ${statement.sql}`);
    },
  }),
};

const schedules: (JobSchedule & { expression: string; resumed: number; stopped: boolean })[] = [];
const scheduler: JobScheduler = {
  validate: cronerJobScheduler.validate,
  create: (expression) => {
    const schedule = {
      expression,
      resumed: 0,
      stopped: false,
      resume() {
        this.resumed++;
      },
      pause() {
        this.resumed = 0;
      },
      stop() {
        this.stopped = true;
        this.resumed = 0;
      },
    };
    schedules.push(schedule);
    return schedule;
  },
};
const lifecycle: string[] = [];
const effectsLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
let externalDisabled = true;
let analyticsSettings: AnalyticsSettings = {
  enableGeneral: true,
  instanceId: "preserved-instance",
  lastSuccessfulSnapshotAt: null as string | null,
};
const sends: { uuid: string; properties: Record<string, unknown> }[] = [];
const iconPlans: IconSynchronizationPlan[] = [];
let iconFetchResults: readonly FetchedIconRepository[] = [
  {
    slug: iconRepositorySources[0].slug,
    success: true,
    icons: [
      { checksum: "kept-checksum", fileNameWithExtension: "kept.png", imageUrl: "https://fixture.invalid/kept" },
      { checksum: "new-checksum", fileNameWithExtension: "new.png", imageUrl: "https://fixture.invalid/new" },
    ],
  },
];
const storedIconRepositories: readonly StoredIconRepository[] = [
  {
    id: "preserved-repository-id",
    slug: iconRepositorySources[0].slug,
    icons: [
      {
        id: "preserved-icon-id",
        checksum: "kept-checksum",
        name: "kept.png",
        url: "https://fixture.invalid/kept",
        iconRepositoryId: "preserved-repository-id",
      },
    ],
  },
];
let urls = ["https://fixture.invalid/a", "https://fixture.invalid/a", "https://fixture.invalid/b"];
const heldPingStarted = deferred<void>();
const pingReleased = deferred<void>();
let holdPing = false;
let pingCalls = 0;
let publishedPings = 0;
const snapshot: AnalyticsSnapshotRows = {
  cultureSettings: { defaultLocale: "fr" },
  boardSettings: { forceDisableStatus: false },
  counts: {
    countBoards: 2,
    countPublicBoards: 0,
    countBoardsWithStatusEnabled: 1,
    countGroups: 0,
    countApps: 1,
    countSections: 1,
    countSearchEngines: 0,
    countIconRepositories: 1,
    countIcons: 1,
    countLayouts: 1,
    countItemLayouts: 1,
    countSectionLayouts: 1,
    countCronJobConfigs: 2,
    countCustomWidgets: 0,
    countTrustedCertificates: 0,
    countUsers: 1,
    countApiKeys: 0,
    countInvites: 0,
    countMedias: 0,
    countSessions: 1,
    countAccounts: 0,
  },
  integrationKinds: [{ kind: "mock", count: 1 }],
  widgetKinds: [{ kind: "clock", count: 1 }],
  boardsWithWidgetKinds: [{ kind: "clock", count: 1 }],
  boardsWithIntegrationKinds: [{ kind: "mock", count: 1 }],
  boardItemCounts: [{ boardId: "unchanged-board", count: 1 }],
  layoutRoleCounts: [{ kind: "custom", count: 1 }],
  sectionKindCounts: [{ kind: "normal", count: 1 }],
};
const jobs = createHomarrJobsRuntime(
  {
    analytics: {
      noExternalConnection: () => externalDisabled,
      readSettingsAsync: async () => analyticsSettings,
      updateSettingsAsync: async (update) => {
        analyticsSettings = update(analyticsSettings);
        return analyticsSettings;
      },
      collectSnapshotAsync: async () => snapshot,
      createId: () => `id-${++id}`,
      clock,
      logger: effectsLogger,
      runtimeProperties: () => ({
        homarrVersion: "fixture",
        databaseType: "sqlite",
        dockerEnabled: false,
        kubernetesEnabled: false,
        authProviders: ["credentials"],
        osPlatform: "fixture",
        osArch: "fixture",
        uptimeSeconds: 0,
      }),
      sendAsync: async (event) => {
        sends.push(event);
      },
    },
    icons: {
      noExternalConnection: () => externalDisabled,
      assertCurrentAuthorityAsync: async (signal) => signal?.throwIfAborted(),
      createId: () => `icon-${++id}`,
      logger: effectsLogger,
      clock,
      fetchIconsAsync: async () => iconFetchResults,
      readRepositoriesAsync: async () => storedIconRepositories,
      readSelectedUrlsAsync: async () => [],
      atomicApply: {
        revision: "homarr.icons.atomic-apply.v1",
        applyAsync: async (plan, options) => {
          options.signal?.throwIfAborted();
          await options.assertCurrentAuthorityAsync();
          assert.equal(options.noExternalConnection(), false);
          iconPlans.push(plan);
          return { deletedIcons: 0 };
        },
      },
    },
    ping: {
      logger: effectsLogger,
      readBoardSettingsAsync: async () => ({ forceDisableStatus: false }),
      clearUrlsAsync: async () => {
        lifecycle.push("ping-clear");
        urls = [];
      },
      getUrlsAsync: async () => urls,
      sendPingRequestAsync: async () => {
        pingCalls++;
        if (holdPing) {
          heldPingStarted.resolve();
          await pingReleased.promise;
        }
        return { statusCode: 200, durationMs: 2 };
      },
      publishAsync: async () => {
        publishedPings++;
      },
    },
    cleanup: {
      supportedProviders: ["credentials", "oidc", "ldap"],
      enabledProviders: ["credentials"],
      logger: effectsLogger,
      deleteSessionsForProvidersAsync: async (providers) => {
        lifecycle.push("cleanup");
        assert.deepEqual(providers, ["oidc", "ldap"]);
        return 2;
      },
    },
  },
  {
    configuration: sqlResources.configuration,
    status,
    clock,
    scheduler,
    assertReadyAsync: async () => {
      lifecycle.push("ready");
    },
    logger: {
      logDebug: effectsLogger.debug,
      logInfo: effectsLogger.info,
      logWarning: effectsLogger.warn,
      logError: effectsLogger.error,
    },
  },
);

assert.equal(jobs.getState(), "configured");
assert.equal(schedules.length, 0);
assert.deepEqual(jobs.getKeys(), ["analytics", "iconsUpdater", "ping"]);
await assert.rejects(async () => jobs.sendServerAnalyticsAsync(), /not ready/);
await Promise.all([jobs.initializeAsync(), jobs.initializeAsync()]);
assert.equal(lifecycle.filter((event) => event === "cleanup").length, 1);
assert.equal(schedules.length, 2);
assert.equal(schedules[0]?.expression, "0 0 * * 1");
assert.equal(records.get("iconsUpdater")?.value.lastExecutionTimestamp, "2026-10-01T01:02:03.000Z");
assert.equal(records.get("iconsUpdater")?.value.lastExecutionStatus, "error");
assert.equal(records.get("iconsUpdater")?.value.status, "idle");
await jobs.startAllAsync();
assert.equal(jobs.getState(), "running");
assert.equal(lifecycle.indexOf("cleanup") < lifecycle.indexOf("ping-clear"), true);
assert.equal(sends.length, 0);
assert.equal(iconPlans.length, 0);
await assert.rejects(jobs.sendAnalyticsAsync(), { code: "PRECONDITION_FAILED" });
assert.equal(rows.get("retained-unknown-job"), originalUnknownRow);
assert.deepEqual(
  (await jobs.getAllAsync()).map((job) => job.name),
  ["iconsUpdater", "ping"],
);
await assert.rejects(jobs.triggerAsync("analytics"), /can not be executed manually/);
await assert.rejects(jobs.updateIntervalAsync("analytics", "* * * * *"), /not allowed/);
const priorWrites = sqlStatements.length;
await assert.rejects(jobs.updateIntervalAsync("iconsUpdater", "not a cron expression"));
assert.equal(sqlStatements.length, priorWrites);
externalDisabled = false;
await jobs.enableAsync("iconsUpdater");
assert.equal(schedules.length, 3);
assert.equal(schedules[2]?.expression, "7 3 * * 2");
assert.equal(rows.get("iconsUpdater")?.cron_expression, "7 3 * * 2");
assert.equal(rows.get("iconsUpdater")?.is_enabled, 1);
assert.equal(iconPlans.length, 1);
assert.deepEqual(iconPlans[0]?.insertRepositories, []);
assert.equal(iconPlans[0]?.revision, "homarr.icons.replacement.v1");
assert.deepEqual(iconPlans[0]?.deleteIconIds, []);
assert.deepEqual(iconPlans[0]?.deleteRepositoryIds, []);
assert.deepEqual(iconPlans[0]?.expectedRepositories, storedIconRepositories);
assert.equal(iconPlans[0]?.insertIconBatches[0]?.[0]?.iconRepositoryId, "preserved-repository-id");
const successfulIconResults = iconFetchResults;
const allFailedIconResults: readonly FetchedIconRepository[] = [
  ...iconRepositorySources.map((source) => source.slug),
  "local",
].map((slug) => ({
  slug,
  success: false,
  icons: [],
  failure: "source-unavailable",
}));
const plansBeforeIconFailure = structuredClone(iconPlans);
const repositoriesBeforeIconFailure = structuredClone(storedIconRepositories);
iconFetchResults = allFailedIconResults;
await jobs.triggerAsync("iconsUpdater");
assert.deepEqual(iconPlans, plansBeforeIconFailure, "All-source failure must not apply a replacement plan");
assert.deepEqual(
  storedIconRepositories,
  repositoriesBeforeIconFailure,
  "All-source failure must retain the known icon repository",
);
assert.equal(
  records.get("iconsUpdater")?.value.lastExecutionStatus,
  "error",
  "All six unavailable icon sources must fail the actual iconsUpdater job, not report success",
);
externalDisabled = true;
await jobs.triggerAsync("iconsUpdater");
assert.equal(
  records.get("iconsUpdater")?.value.lastExecutionStatus,
  "success",
  "Explicit external opt-out remains a permitted skip",
);
assert.deepEqual(iconPlans, plansBeforeIconFailure);
externalDisabled = false;
iconFetchResults = allFailedIconResults.map((group) =>
  group.slug === "local" ? { slug: "local", success: true, icons: [] } : group,
);
await jobs.triggerAsync("iconsUpdater");
assert.equal(
  records.get("iconsUpdater")?.value.lastExecutionStatus,
  "success",
  "One successful empty feed is not an all-source failure",
);
assert.equal(iconPlans.length, plansBeforeIconFailure.length + 1);
assert.deepEqual(iconPlans.at(-1)?.deleteIconIds, []);
assert.deepEqual(iconPlans.at(-1)?.deleteRepositoryIds, []);
assert.deepEqual(storedIconRepositories, repositoriesBeforeIconFailure);
iconFetchResults = successfulIconResults;
console.log(
  "PASS iconsUpdater: all six unavailable fails without replacement; external opt-out and empty success remain successful",
);
await jobs.updateIntervalAsync("iconsUpdater", "9 4 * * 2");
assert.equal(schedules[2]?.stopped, true);
assert.equal(rows.get("iconsUpdater")?.cron_expression, "9 4 * * 2");
assert.equal(await jobs.sendServerAnalyticsAsync(), "sent");
assert.equal(await jobs.sendServerAnalyticsAsync(), "skipped");
assert.equal(sends.length, 1);
assert.equal(sends[0]?.properties.defaultLocale, "fr");
assert.equal(sends[0]?.properties.countBoards, 2);
assert.equal(sends[0]?.properties.boardsWithItemCount_empty, 1);
assert.equal("countPublicBoards" in (sends[0]?.properties ?? {}), false);
assert.equal(analyticsSettings.instanceId, "preserved-instance");

const received: number[] = [];
const snapshotGate = deferred<JobStatusRecord | null>();
const current = records.get("iconsUpdater");
assert.ok(current);
const raceStatus = createJobStatusRuntime({
  backing: { ...backing, getAsync: async () => snapshotGate.promise },
  ownerId: "fresh-owner",
  now: clock.now,
  createRunId: () => `run-${++id}`,
});
const subscribing = raceStatus.subscribeAsync(
  ["iconsUpdater"],
  async (record) => {
    received.push(record.revision);
  },
  (error) => {
    throw error;
  },
);
await Promise.resolve();
time++;
const newerRun = await status.beginAsync("iconsUpdater");
const newest = records.get("iconsUpdater");
assert.ok(newest);
snapshotGate.resolve(current);
const unsubscribe = await subscribing;
await Promise.resolve();
await Promise.resolve();
assert.deepEqual(received, [newest.revision]);
await status.finishAsync("iconsUpdater", "old-run", "success");
assert.equal(records.get("iconsUpdater")?.revision, newest.revision);
await status.finishAsync("iconsUpdater", newerRun, "success");
waitForDisposal = true;
let unsubscribed = false;
const disposing = unsubscribe().then(() => {
  unsubscribed = true;
});
await Promise.resolve();
assert.equal(unsubscribed, false);
disposalGate.resolve();
await disposing;
await raceStatus.disposeAsync();

urls = ["https://fixture.invalid/a", "https://fixture.invalid/a", "https://fixture.invalid/b"];
await jobs.triggerAsync("ping");
assert.equal(pingCalls, 2);
assert.equal(publishedPings, 2);
urls = ["https://fixture.invalid/held"];
holdPing = true;
const triggering = jobs.triggerAsync("ping");
await heldPingStarted.promise;
let stopped = false;
const stopping = jobs.stopAsync().then(() => {
  stopped = true;
});
await Promise.resolve();
assert.equal(jobs.getState(), "draining");
assert.equal(stopped, false);
await assert.rejects(jobs.triggerAsync("ping"), /not ready/);
pingReleased.resolve();
await Promise.all([triggering, stopping]);
assert.equal(jobs.getState(), "stopped");
assert.equal(publishedPings, 2);
assert.equal(records.get("ping")?.value.lastExecutionStatus, "error");
assert.equal(
  schedules.every((schedule) => schedule.stopped),
  true,
);
await jobs.stopAsync();
await status.disposeAsync();
assert.equal(listeners.size, 0);

const assertPendingAsync = async (operation: Promise<unknown>, message: string) => {
  let settled = false;
  void operation.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  for (let turn = 0; turn < 20; turn++) await Promise.resolve();
  assert.equal(settled, false, message);
};

const checkListingDrainAsync = async () => {
  const readStarted = deferred<void>();
  const readReleased = deferred<readonly never[]>();
  let holdRead = false;
  const runtime = createJobsRuntime({
    jobs: [],
    configuration: {
      getAllAsync: async () => {
        if (!holdRead) return [];
        readStarted.resolve();
        return readReleased.promise;
      },
      updateAsync: async () => {
        throw new Error("Unexpected configuration write");
      },
    },
    status: {
      repairInterruptedAsync: async () => undefined,
      beginAsync: async () => {
        throw new Error("Unexpected job run");
      },
      finishAsync: async () => {
        throw new Error("Unexpected job completion");
      },
    },
    clock,
    scheduler,
    logger: {
      logDebug: effectsLogger.debug,
      logInfo: effectsLogger.info,
      logWarning: effectsLogger.warn,
      logError: effectsLogger.error,
    },
    assertReadyAsync: async () => undefined,
    cleanupAsync: async () => undefined,
  });
  await runtime.initializeAsync();
  holdRead = true;
  const listing = runtime.getAllAsync();
  await readStarted.promise;
  const shutdown = runtime.stopAsync();
  const rejectedListing = assert.rejects(runtime.getAllAsync(), /not ready/);
  try {
    await assertPendingAsync(shutdown, "Job shutdown must wait for an in-flight configuration listing");
  } finally {
    readReleased.resolve([]);
    await Promise.all([listing, shutdown, rejectedListing]);
  }
  assert.equal(runtime.getState(), "stopped");
};

const checkFailedSnapshotDrainAsync = async () => {
  const readStarted = deferred<void>();
  const readReleased = deferred<JobStatusRecord | null>();
  const originalError = new Error("First snapshot read failed");
  let detached = false;
  let delivered = false;
  const runtime = createJobStatusRuntime({
    backing: {
      ...backing,
      getAsync: async (name) => {
        if (name === "ping") throw originalError;
        readStarted.resolve();
        return readReleased.promise;
      },
      subscribeAsync: async () => async () => {
        detached = true;
      },
    },
    ownerId: "snapshot-drain-owner",
    now: clock.now,
    createRunId: () => `run-${++id}`,
  });
  const failedSubscription = runtime.subscribeAsync(
    ["ping", "iconsUpdater"],
    async () => {
      delivered = true;
    },
    (error) => {
      throw error;
    },
  );
  const outcome = failedSubscription.then(
    () => null,
    (error: unknown) => error,
  );
  await readStarted.promise;
  const shutdown = runtime.disposeAsync();
  try {
    await assertPendingAsync(shutdown, "Status disposal must wait for every snapshot read after a sibling rejects");
    await assertPendingAsync(
      outcome,
      "Subscription failure must drain sibling reads before returning its original error",
    );
  } finally {
    readReleased.resolve(null);
    await Promise.all([outcome, shutdown]);
  }
  assert.equal(await outcome, originalError);
  assert.equal(detached, true);
  assert.equal(delivered, false);
};

const checkSubscriptionCleanupErrorAsync = async () => {
  const snapshotError = new Error("Original subscription snapshot failure");
  const cleanupError = new Error("Subscription unsubscription failure");
  const reported: unknown[] = [];
  const runtime = createJobStatusRuntime({
    backing: {
      ...backing,
      getAsync: async () => {
        throw snapshotError;
      },
      subscribeAsync: async () => async () => {
        throw cleanupError;
      },
    },
    ownerId: "subscription-cleanup-error-owner",
    now: clock.now,
    createRunId: () => `run-${++id}`,
  });
  const outcome = await runtime
    .subscribeAsync(
      ["ping"],
      async () => undefined,
      (error) => {
        reported.push(error);
      },
    )
    .then(
      () => null,
      (error: unknown) => error,
    );
  const cleanupOutcome = await runtime.disposeAsync().then(
    () => null,
    (error: unknown) => error,
  );
  assert.equal(outcome, snapshotError, "Cleanup failure must not replace the original subscription error");
  assert.deepEqual(reported, [cleanupError]);
  assert.ok(cleanupOutcome instanceof AggregateError);
  assert.deepEqual(cleanupOutcome.errors, [cleanupError]);
};

const checkRuntimeCleanupErrorDrainAsync = async () => {
  const readStarted = deferred<void>();
  const readReleased = deferred<JobStatusRecord | null>();
  const unsubscribeStarted = deferred<void>();
  const unsubscribeReleased = deferred<void>();
  const cleanupError = new Error("First consumer cleanup failure");
  const runtime = createJobStatusRuntime({
    backing: {
      ...backing,
      getAsync: async (name) => {
        if (name === "ping") return null;
        readStarted.resolve();
        return readReleased.promise;
      },
      subscribeAsync: async (names) => async () => {
        if (names.includes("ping")) throw cleanupError;
        unsubscribeStarted.resolve();
        await unsubscribeReleased.promise;
      },
    },
    ownerId: "runtime-cleanup-error-owner",
    now: clock.now,
    createRunId: () => `run-${++id}`,
  });
  const errors: unknown[] = [];
  const disposeFirst = await runtime.subscribeAsync(
    ["ping"],
    async () => undefined,
    (error) => {
      errors.push(error);
    },
  );
  const secondSubscription = runtime.subscribeAsync(
    ["iconsUpdater"],
    async () => undefined,
    (error) => {
      errors.push(error);
    },
  );
  await readStarted.promise;
  const shutdown = runtime.disposeAsync();
  const outcome = shutdown.then(
    () => null,
    (error: unknown) => error,
  );
  await unsubscribeStarted.promise;
  try {
    await assertPendingAsync(
      shutdown,
      "Runtime disposal must not reject while a sibling consumer still owns reads and cleanup",
    );
    readReleased.resolve(null);
    await assertPendingAsync(
      shutdown,
      "Runtime disposal must also await a sibling unsubscription after its read settles",
    );
  } finally {
    readReleased.resolve(null);
    unsubscribeReleased.resolve();
    await Promise.all([outcome, secondSubscription]);
  }
  const failure = await outcome;
  assert.ok(failure instanceof AggregateError);
  assert.deepEqual(failure.errors, [cleanupError]);
  assert.equal(disposeFirst(), disposeFirst());
  await assert.rejects(disposeFirst(), (error: unknown) => error === cleanupError);
  assert.equal(runtime.disposeAsync(), shutdown);
  await assert.rejects(runtime.disposeAsync(), (error: unknown) => error === failure);
  assert.deepEqual(errors, [cleanupError]);
};

const shutdownResults = await Promise.allSettled([
  checkListingDrainAsync(),
  checkFailedSnapshotDrainAsync(),
  checkSubscriptionCleanupErrorAsync(),
  checkRuntimeCleanupErrorDrainAsync(),
]);
const shutdownFailures = shutdownResults
  .filter((result) => result.status === "rejected")
  .map((result) => result.reason);
if (shutdownFailures.length > 0)
  throw new AggregateError(shutdownFailures, "Critical read shutdown regressions failed");
console.log("PASS critical read shutdown: configuration listing and failed multi-key snapshot drain");
console.log("PASS critical cleanup errors: original subscription failure and all-consumer error drain");
console.log(
  "PASS source jobs: persisted controls, restrictions, real bodies, keyed freshness, interrupted repair, async disposal and stop/drain",
);
