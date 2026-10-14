import assert from "node:assert/strict";
import { Database as SqliteDatabase } from "bun:sqlite";
import { call } from "@orpc/server";
import { parse, stringify } from "superjson";

import type { Database } from "@homarr/db";
import {
  arrangeIconPickerSections,
  createIconFetcher,
  createIconSynchronizationService,
  findIconsAsync,
  getIconForName,
  getIconRepositoryMetadata,
  iconRepositorySources,
  mapMediaToIcon,
  parseGitHubIconIndex,
  parseJsdelivrIconIndex,
  planIconSynchronization,
  readLocalIconMediasAsync,
  readSelectedIconUrlsAsync,
  readStoredIconRepositoriesAsync,
  synchronizeIconsAsync,
} from "@homarr/icons";
import type { IconFetchResources, IconReadScope, IconSyncResources, StoredIconRepository } from "@homarr/icons";
import { updateIconsAsync } from "@homarr/cron-jobs/runtime-bodies";

import { backendContractRevision } from "../context";
import type { BackendContext } from "../context";
import { getSourceProcedureMeta, getSourceProjectionMeta } from "../procedure";
import { createIconContribution, iconImplementedPaths } from "../routers/icon";

const limits = { maximumIndexBytes: 16384, maximumFiles: 50, maximumPathLength: 2048 };
const codec = { decode: parse, maximumSerializedBytes: 16384, maximumValueNodes: 200 };
const githubFixture = {
  truncated: false,
  tree: [
    { path: "svg/homarr.svg", sha: "homarr-sha", size: 12 },
    { path: "png/homarr.png", sha: "homarr-png-sha", size: 14 },
    { path: "LICENSE", sha: "license-sha", size: 20 },
  ],
};
const jsdelivrFixture = {
  files: [
    { name: "/svg/homarr.svg", hash: "homarr-hash", size: 12 },
    { name: "/README.md", hash: "readme-hash", size: 20 },
  ],
};
const deadlineDisposals: string[] = [];
const fetchResources: IconFetchResources = {
  noExternalConnection: () => false,
  assertCurrentAuthorityAsync: async (signal) => signal?.throwIfAborted(),
  clock: {
    monotonicMilliseconds: () => 100,
    createDeadline(milliseconds, signal) {
      assert.equal(milliseconds, 10000);
      return {
        signal: signal ?? new AbortController().signal,
        dispose: () => {
          deadlineDisposals.push("disposed");
        },
      };
    },
  },
  limits,
  reportSourceError: () => undefined,
  fetchWithTrustedCertificatesAsync: async (url) => {
    const source = iconRepositorySources.find((value) => value.repositoryIndexingUrl.href === url.href);
    assert.ok(source, "Only one of the five exact source URLs may be requested");
    return Response.json(source.kind === "github" ? githubFixture : jsdelivrFixture);
  },
};

const database = new SqliteDatabase(":memory:");
const scope: IconReadScope = {
  dialect: "sqlite",
  queryAsync: async ({ sql, parameters }) =>
    database.query<Record<string, unknown>, (string | number | boolean | null)[]>(sql).all(...parameters),
};
database.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE "iconRepository" ("id" TEXT PRIMARY KEY, "slug" TEXT NOT NULL);
  CREATE TABLE "icon" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "url" TEXT NOT NULL, "checksum" TEXT NOT NULL, "icon_repository_id" TEXT NOT NULL REFERENCES "iconRepository"("id") ON DELETE CASCADE);
  CREATE TABLE "media" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "content" BLOB NOT NULL, "size" INTEGER NOT NULL);
  CREATE TABLE "app" ("icon_url" TEXT);
  CREATE TABLE "search_engine" ("icon_url" TEXT);
  CREATE TABLE "board" ("logo_image_url" TEXT, "favicon_image_url" TEXT, "background_image_url" TEXT);
  CREATE TABLE "item" ("options" TEXT, "advanced_options" TEXT);
  CREATE TABLE "section" ("options" TEXT);
  CREATE TABLE "serverSetting" ("setting_key" TEXT PRIMARY KEY, "value" TEXT NOT NULL);
  CREATE TABLE "custom_widget_definition" ("icon_url" TEXT, "display_config" TEXT);
  CREATE TABLE "custom_widget_v2_definition" ("icon_url" TEXT, "options" TEXT);
`);

try {
  const media = { id: "fixture-media-a", name: "Hómarr Local.png", content: new Uint8Array([1, 2, 3]), size: 3 };
  const identicalMedia = { ...media, id: "fixture-media-b" };
  for (const entry of [media, identicalMedia])
    database.query('INSERT INTO "media" VALUES (?, ?, ?, ?)').run(entry.id, entry.name, entry.content, entry.size);
  const mapped = mapMediaToIcon(media);
  assert.equal(mapped.checksum, mapMediaToIcon(identicalMedia).checksum);
  assert.notEqual(mapped.imageUrl, mapMediaToIcon(identicalMedia).imageUrl);

  const fetched = await createIconFetcher(fetchResources, {
    readMediasAsync: () => readLocalIconMediasAsync(scope),
    assertCurrentAuthorityAsync: fetchResources.assertCurrentAuthorityAsync,
    reportSourceError: fetchResources.reportSourceError,
  }).fetchIconsAsync();
  assert.deepEqual(
    fetched.map((group) => group.slug),
    [...iconRepositorySources.map((source) => source.slug), "local"],
  );
  assert.ok(fetched.every((group) => group.success));
  assert.equal(deadlineDisposals.length, 5);
  assert.equal(fetched[2]?.icons[0]?.imageUrl, "https://cdn.simpleicons.org/homarr");
  assert.equal(
    fetched[3]?.icons[0]?.imageUrl,
    "https://cdn.jsdelivr.net/gh/PapirusDevelopmentTeam/papirus_icons//svg/homarr.svg",
  );
  assert.deepEqual(
    iconRepositorySources.map((source) => getIconRepositoryMetadata(source.slug).license),
    [undefined, "CC0-1.0", "CC0-1.0", "GPL-3.0", "MIT"],
  );
  const github = iconRepositorySources[0];
  const jsdelivr = iconRepositorySources[3];
  assert.throws(() => parseGitHubIconIndex({ ...githubFixture, truncated: true }, github, limits));
  assert.throws(() =>
    parseJsdelivrIconIndex({ files: [{ name: "/homarr.svg", size: 4, hash: null }] }, jsdelivr, limits),
  );

  const sourceErrors: unknown[] = [];
  const failed = await createIconFetcher(
    {
      ...fetchResources,
      reportSourceError: (error) => {
        sourceErrors.push(error);
      },
      fetchWithTrustedCertificatesAsync: async (url, options) =>
        url.href === github.repositoryIndexingUrl.href
          ? new Response("rate limited", { status: 429 })
          : fetchResources.fetchWithTrustedCertificatesAsync(url, options),
    },
    {
      readMediasAsync: () => readLocalIconMediasAsync(scope),
      assertCurrentAuthorityAsync: fetchResources.assertCurrentAuthorityAsync,
      reportSourceError: fetchResources.reportSourceError,
    },
  ).fetchIconsAsync();
  assert.equal(failed[0]?.success, false);
  assert.ok(failed.slice(1).every((group) => group.success));
  assert.equal(sourceErrors.length, 1);
  const oversized = await createIconFetcher(
    {
      ...fetchResources,
      fetchWithTrustedCertificatesAsync: async () => new Response("x".repeat(limits.maximumIndexBytes + 1)),
    },
    {
      readMediasAsync: async () => [],
      assertCurrentAuthorityAsync: fetchResources.assertCurrentAuthorityAsync,
      reportSourceError: fetchResources.reportSourceError,
    },
  ).fetchIconsAsync();
  assert.ok(oversized.slice(0, 5).every((group) => !group.success));
  console.log("PASS icons: five bounded actual source parsers, failure isolation, licenses and local content identity");

  let id = 0;
  const initial = planIconSynchronization(fetched, [], [], () => `fixture-${++id}`);
  assert.equal(initial.kind, "replacement");
  if (initial.kind !== "replacement") throw new Error("Fixture plan is missing");
  for (const repository of initial.plan.insertRepositories)
    database.query('INSERT INTO "iconRepository" VALUES (?, ?)').run(repository.id, repository.slug);
  for (const batch of initial.plan.insertIconBatches)
    for (const icon of batch)
      database
        .query('INSERT INTO "icon" VALUES (?, ?, ?, ?, ?)')
        .run(icon.id, icon.name, icon.url, icon.checksum, icon.iconRepositoryId);
  database.query('INSERT INTO "app" VALUES (?)').run(fetched[0]?.icons[0]?.imageUrl ?? "missing");
  database
    .query('INSERT INTO "board" VALUES (?, ?, ?)')
    .run(mapped.imageUrl, fetched[1]?.icons[0]?.imageUrl ?? "missing", fetched[4]?.icons[0]?.imageUrl ?? "missing");
  database
    .query('INSERT INTO "serverSetting" VALUES (?, ?)')
    .run("branding", stringify({ faviconImageUrl: mapped.imageUrl }));
  database
    .query('INSERT INTO "item" VALUES (?, ?)')
    .run(stringify({ imageUrl: mapped.imageUrl }), stringify({ background: fetched[2]?.icons[0]?.imageUrl }));
  database.query('INSERT INTO "section" VALUES (?)').run(stringify({ background: mapped.imageUrl }));
  const stored = await readStoredIconRepositoriesAsync(scope);
  const selected = await readSelectedIconUrlsAsync(scope, codec);
  assert.ok(selected.includes(mapped.imageUrl));
  assert.ok(selected.includes(fetched[0]?.icons[0]?.imageUrl ?? "missing"));
  assert.deepEqual(
    planIconSynchronization(fetched, stored, selected, () => {
      throw new Error("Unchanged synchronization must not allocate IDs");
    }),
    { kind: "unchanged", reason: "no-change" },
  );
  assert.deepEqual(
    planIconSynchronization(
      fetched.map((group) => ({ slug: group.slug, success: false, icons: [] })),
      stored,
      selected,
      () => "unexpected",
    ),
    { kind: "unchanged", reason: "no-success" },
  );
  const replacement = planIconSynchronization(
    failed.map((group) => (group.success && group.slug !== "local" ? { ...group, icons: [] } : group)),
    stored,
    selected,
    () => `replacement-${++id}`,
  );
  assert.equal(replacement.kind, "replacement");
  if (replacement.kind !== "replacement") throw new Error("Replacement fixture plan is missing");
  const failedIds = stored.find((repository) => repository.slug === github.slug)?.icons.map((icon) => icon.id) ?? [];
  assert.ok(failedIds.every((value) => !replacement.plan.deleteIconIds.includes(value)));
  assert.ok(
    stored
      .flatMap((repository) => repository.icons)
      .filter((icon) => selected.includes(icon.url))
      .every((icon) => !replacement.plan.deleteIconIds.includes(icon.id)),
  );
  assert.deepEqual(replacement.plan.deleteRepositoryIds, []);

  const browse = await findIconsAsync(scope, { limitPerGroup: 1 });
  assert.equal(browse.icons[0]?.slug, "local");
  assert.ok(browse.icons.every((group) => group.icons.length === 1));
  const ranked = await findIconsAsync(scope, { searchText: "Hómarr", limitPerGroup: 2 });
  const sourceGroup = ranked.icons.find((group) => group.slug === github.slug);
  assert.deepEqual(
    sourceGroup?.icons.map((icon) => icon.name),
    ["homarr.svg", "homarr.png"],
  );
  const sections = arrangeIconPickerSections(ranked.icons, "Hómarr");
  assert.equal(sections.local.length, 2);
  assert.ok(sections.svg.every((icon) => icon.url.includes(".svg")));
  database.query('DELETE FROM "media" WHERE "id" = ?').run(media.id);
  const localAfterDeletion = await findIconsAsync(scope, { searchText: "homarr", limitPerGroup: 12 });
  assert.deepEqual(
    localAfterDeletion.icons.find((group) => group.slug === "local")?.icons.map((icon) => icon.url),
    [mapMediaToIcon(identicalMedia).imageUrl],
  );
  const localRepository = stored.find((repository) => repository.slug === "local");
  assert.ok(localRepository);
  const localPlan = planIconSynchronization(
    [{ slug: "local", success: true, icons: [mapMediaToIcon(identicalMedia)] }, ...failed.slice(0, 5)],
    stored,
    selected,
    () => "unexpected",
  );
  assert.equal(localPlan.kind, "replacement");
  if (localPlan.kind !== "replacement") throw new Error("Local deletion fixture plan is missing");
  const removedId = localRepository.icons.find((icon) => icon.url === mapped.imageUrl)?.id;
  const preservedId = localRepository.icons.find((icon) => icon.url === mapMediaToIcon(identicalMedia).imageUrl)?.id;
  assert.ok(removedId && localPlan.plan.deleteIconIds.includes(removedId));
  assert.ok(preservedId && !localPlan.plan.deleteIconIds.includes(preservedId));
  assert.deepEqual(localPlan.plan.missingLocalUrls, [mapped.imageUrl]);
  assert.deepEqual(localPlan.plan.insertIconBatches, []);
  assert.equal((await getIconForName(scope, "homarr"))?.iconRepositoryId, stored[0]?.id);

  let publicScopeReads = 0;
  const contribution = createIconContribution({
    runReadAsync: async (_context, operation) => {
      publicScopeReads++;
      return operation(scope);
    },
  });
  assert.equal(contribution.revision, backendContractRevision);
  assert.deepEqual(contribution.leaves, iconImplementedPaths);
  assert.deepEqual(getSourceProcedureMeta(contribution.router.icon.findIcons), {
    path: "icon.findIcons",
    kind: "query",
    access: { kind: "public" },
    demo: "guarded",
  });
  assert.equal(getSourceProjectionMeta(contribution.router.icon.findIcons)?.mcp?.enabled, true);
  const request = new Request("https://fixture.invalid/rpc");
  const context: BackendContext = {
    request,
    signal: request.signal,
    db: new Proxy({} as Database, {
      get() {
        throw new Error("Icon public query must use only its injected read scope");
      },
    }),
    principal: { kind: "anonymous" },
    deviceType: undefined,
    demo: { enabled: true, readOnly: true },
    setup: {
      isClaimOnlyAccessAllowed: async () => {
        throw new Error("Unexpected setup access");
      },
      currentStep: async () => {
        throw new Error("Unexpected setup access");
      },
    },
    effect: () => {
      throw new Error("Unexpected response effect");
    },
    onDispose: () => {
      throw new Error("Unexpected listener");
    },
  };
  const publicResult = await call(contribution.router.icon.findIcons, {}, { context });
  assert.equal(publicScopeReads, 1);
  assert.equal(publicResult.countIcons, browse.countIcons);
  assert.deepEqual(Object.keys(publicResult.icons[0] ?? {}).toSorted(), ["icons", "id", "slug"]);
  assert.deepEqual(Object.keys(publicResult.icons[0]?.icons[0] ?? {}).toSorted(), ["id", "name", "url"]);
  await assert.rejects(call(contribution.router.icon.findIcons, { limitPerGroup: 501 }, { context }));
  assert.equal(publicScopeReads, 1);
  console.log(
    "PASS icons: native SQLite ranking, groups, selected references, deleted-local non-rebinding and anonymous v2 leaf projection",
  );

  let applyCalls = 0;
  let externalDisabled = false;
  const applyFailure = new Error("Fixture atomic adapter intentionally unavailable");
  const service = createIconSynchronizationService({
    ...fetchResources,
    noExternalConnection: () => externalDisabled,
    createId: () => `service-${++id}`,
    logger: { info: () => undefined },
    referenceCodec: codec,
    runReadAsync: (operation) => operation(scope),
    atomicApply: {
      revision: "homarr.icons.atomic-apply.v1",
      applyAsync: async (_plan, options) => {
        options.signal?.throwIfAborted();
        await options.assertCurrentAuthorityAsync();
        assert.equal(options.noExternalConnection(), false);
        applyCalls++;
        throw applyFailure;
      },
    },
  });
  assert.equal(updateIconsAsync, synchronizeIconsAsync);
  const beforeRejectedApply = await readStoredIconRepositoriesAsync(scope);
  await assert.rejects(updateIconsAsync(service.jobResources), (error: unknown) => error === applyFailure);
  assert.equal(applyCalls, 1);
  assert.deepEqual(await readStoredIconRepositoriesAsync(scope), beforeRejectedApply);
  applyCalls = 0;
  externalDisabled = true;
  await service.synchronizeAsync();
  externalDisabled = false;
  const controller = new AbortController();
  const abortedResources: IconSyncResources = {
    ...service.jobResources,
    fetchIconsAsync: async () => {
      controller.abort();
      return fetched;
    },
  };
  await assert.rejects(synchronizeIconsAsync(abortedResources, controller.signal));
  await synchronizeIconsAsync({
    ...service.jobResources,
    fetchIconsAsync: async () => {
      externalDisabled = true;
      return fetched;
    },
  });
  externalDisabled = false;
  await assert.rejects(
    synchronizeIconsAsync({
      ...service.jobResources,
      fetchIconsAsync: async () => fetched.map((group) => ({ slug: group.slug, success: false, icons: [] })),
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.name, "Error");
      assert.equal(error.message, "Icon synchronization failed: no icon source succeeded");
      assert.equal(error.cause, undefined);
      return true;
    },
  );
  assert.equal(applyCalls, 0);
  assert.deepEqual(await readStoredIconRepositoriesAsync(scope), beforeRejectedApply);
  await synchronizeIconsAsync({
    ...service.jobResources,
    fetchIconsAsync: async () => [
      { slug: github.slug, success: false, icons: [], failure: "external-disabled" },
      ...fetched.slice(1),
    ],
  });
  assert.equal(applyCalls, 0);
  const fetchAbort = new AbortController();
  const localReadStarted = Promise.withResolvers<void>();
  const localReadReleased = Promise.withResolvers<readonly (typeof media)[]>();
  let cancelledBodies = 0;
  let fetchSettled = false;
  const cancelledFetch = createIconFetcher(
    {
      ...fetchResources,
      fetchWithTrustedCertificatesAsync: async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(stream) {
              stream.enqueue(new TextEncoder().encode("{"));
            },
            cancel() {
              cancelledBodies++;
            },
          }),
        ),
    },
    {
      readMediasAsync: async () => {
        localReadStarted.resolve();
        return localReadReleased.promise;
      },
      assertCurrentAuthorityAsync: fetchResources.assertCurrentAuthorityAsync,
      reportSourceError: fetchResources.reportSourceError,
    },
  )
    .fetchIconsAsync(fetchAbort.signal)
    .then(
      () => {
        fetchSettled = true;
        return null;
      },
      (error: unknown) => {
        fetchSettled = true;
        return error;
      },
    );
  await localReadStarted.promise;
  fetchAbort.abort();
  await Promise.resolve();
  assert.equal(fetchSettled, false, "Cancelled synchronization must retain ownership of the local read");
  localReadReleased.resolve([]);
  assert.equal(await cancelledFetch, fetchAbort.signal.reason);
  assert.equal(cancelledBodies, 5);
  const failedRead = new Error("Fixture reference read failed");
  const started = Promise.withResolvers<void>();
  const heldRead = Promise.withResolvers<readonly StoredIconRepository[]>();
  let settled = false;
  const failedRun = synchronizeIconsAsync({
    ...service.jobResources,
    fetchIconsAsync: async () => fetched,
    readRepositoriesAsync: async () => {
      started.resolve();
      return heldRead.promise;
    },
    readSelectedUrlsAsync: async () => {
      throw failedRead;
    },
  }).then(
    () => {
      settled = true;
      return null;
    },
    (error: unknown) => {
      settled = true;
      return error;
    },
  );
  await started.promise;
  await Promise.resolve();
  assert.equal(settled, false, "A failed reference read must not release owned sibling reads");
  heldRead.resolve(beforeRejectedApply);
  assert.equal(await failedRun, failedRead);
  assert.equal(applyCalls, 0);
  assert.deepEqual(await readStoredIconRepositoriesAsync(scope), beforeRejectedApply);
  console.log(
    "PASS icons: shared job service, rejected apply unchanged, cancellation, external denial and failed-read settlement",
  );
} finally {
  database.close();
}
