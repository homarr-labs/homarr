import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { eq, sql } from "@homarr/db";
import {
  customWidgetDefinitions,
  customWidgetSecrets,
  legacyCustomWidgetDefinitions,
  legacyCustomWidgetSecrets,
  users,
} from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import { BUNDLED_CUSTOM_WIDGETS } from "@homarr/custom-widgets/core";
import { describe, expect, test } from "vitest";

import { customWidgetRouter } from "../../custom-widget/custom-widget-router";
import { getCustomWidgetConfigurationRequestForUser } from "../../custom-widget/configuration-requests";

const userId = createId();
const session = {
  user: {
    id: userId,
    permissions: ["custom-widget-manage", "custom-widget-secret-write"],
    colorScheme: "light",
  },
  expires: new Date().toISOString(),
} satisfies Session;
const manageOnlySession = {
  ...session,
  user: { ...session.user, permissions: ["custom-widget-manage"] },
} satisfies Session;

const jellyfin = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-jellyfin")?.widget;
if (!jellyfin) throw new Error("Jellyfin bundled widget is missing");
const jellyfinDefaultSource = jellyfin.sources.default;
if (!jellyfinDefaultSource) throw new Error("Jellyfin default source is missing");

function createCaller(db: ReturnType<typeof createDb>) {
  return customWidgetRouter.createCaller({ db, deviceType: undefined, session });
}

function createManageOnlyCaller(db: ReturnType<typeof createDb>) {
  return customWidgetRouter.createCaller({
    db,
    deviceType: undefined,
    session: manageOnlySession,
  });
}

async function prepareDatabase() {
  const db = createDb();
  await db.insert(users).values({ id: userId });
  return db;
}

function rejectSecretInserts(db: ReturnType<typeof createDb>) {
  db.run(
    sql.raw(`CREATE TRIGGER reject_custom_widget_secret_insert
      BEFORE INSERT ON custom_widget_secret
      BEGIN
        SELECT RAISE(ABORT, 'forced secret insert failure');
      END`),
  );
}

async function insertLegacyJellyfin(db: ReturnType<typeof createDb>) {
  const id = "legacy-jellyfin";
  const encryptedValue = "preserved.secret" as `${string}.${string}`;
  await db.insert(legacyCustomWidgetDefinitions).values({
    id,
    name: "Legacy Jellyfin",
    url: "http://jellyfin.local/Items/Counts",
    authType: "apiKeyHeader",
    headerName: "X-Emby-Token",
    method: "GET",
    displayType: "singleValue",
    enabled: false,
    creatorId: userId,
  });
  await db.insert(legacyCustomWidgetSecrets).values({
    definitionId: id,
    kind: "apiKey",
    encryptedValue,
    updatedAt: new Date(0),
  });
  return { id, encryptedValue };
}

const secret = { sourceId: "default", kind: "apiKey" as const, value: "test-secret" };

describe("custom widget definition persistence", () => {
  test("atomically replaces a confirmed legacy widget while preserving its stable ID and credential", async () => {
    const db = await prepareDatabase();
    const legacy = await insertLegacyJellyfin(db);

    await createCaller(db).migrateLegacy({ id: legacy.id, widget: jellyfin, secrets: [] });

    expect(await db.query.legacyCustomWidgetDefinitions.findMany()).toHaveLength(0);
    expect(await db.query.customWidgetDefinitions.findFirst()).toMatchObject({
      id: legacy.id,
      enabled: false,
      creatorId: userId,
    });
    expect(await db.query.customWidgetSecrets.findFirst()).toMatchObject({
      definitionId: legacy.id,
      sourceId: "default",
      kind: "apiKey",
      encryptedValue: legacy.encryptedValue,
    });
  });

  test("keeps the legacy widget recoverable when confirmed replacement fails", async () => {
    const db = await prepareDatabase();
    const legacy = await insertLegacyJellyfin(db);
    rejectSecretInserts(db);

    await expect(createCaller(db).migrateLegacy({ id: legacy.id, widget: jellyfin, secrets: [] })).rejects.toThrow(
      "forced secret insert failure",
    );

    expect(await db.query.legacyCustomWidgetDefinitions.findFirst()).toMatchObject({ id: legacy.id });
    expect(await db.query.legacyCustomWidgetSecrets.findFirst()).toMatchObject({
      definitionId: legacy.id,
      encryptedValue: legacy.encryptedValue,
    });
    expect(await db.query.customWidgetDefinitions.findMany()).toHaveLength(0);
  });

  test("rolls back create when its secret cannot be stored", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    rejectSecretInserts(db);

    await expect(caller.create({ ...jellyfin, secrets: [secret] })).rejects.toThrow("forced secret insert failure");

    expect(await db.query.customWidgetDefinitions.findMany()).toHaveLength(0);
    expect(await db.query.customWidgetSecrets.findMany()).toHaveLength(0);
  });

  test("rolls back import when its secret cannot be stored", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    rejectSecretInserts(db);

    await expect(caller.import({ widget: jellyfin, secrets: [secret] })).rejects.toThrow(
      "forced secret insert failure",
    );

    expect(await db.query.customWidgetDefinitions.findMany()).toHaveLength(0);
    expect(await db.query.customWidgetSecrets.findMany()).toHaveLength(0);
  });

  test("rolls back definition and secret changes when a replacement secret cannot be stored", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    const created = await caller.create({ ...jellyfin, secrets: [secret] });
    const originalDefinition = await db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, created.id),
    });
    const originalSecret = await db.query.customWidgetSecrets.findFirst({
      where: eq(customWidgetSecrets.definitionId, created.id),
    });
    rejectSecretInserts(db);

    await expect(
      caller.update({
        id: created.id,
        name: "Changed Jellyfin Library",
        secrets: [{ ...secret, value: "replacement-secret" }],
      }),
    ).rejects.toThrow("forced secret insert failure");

    const storedDefinition = await db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, created.id),
    });
    const storedSecret = await db.query.customWidgetSecrets.findFirst({
      where: eq(customWidgetSecrets.definitionId, created.id),
    });
    expect(storedDefinition?.name).toBe(originalDefinition?.name);
    expect(storedDefinition?.updatedAt).toEqual(originalDefinition?.updatedAt);
    expect(storedSecret).toEqual(originalSecret);
  });

  test("configures a source URL and credential together", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    const created = await caller.create({ ...jellyfin, secrets: [] });

    await caller.sourceConfigure({
      definitionId: created.id,
      sourceId: "default",
      baseUrl: "http://jellyfin.local:8096",
      networkScope: "private",
      secrets: [secret],
    });

    const definition = await caller.get({ id: created.id });
    expect(definition.sources.default?.baseUrl).toBe("http://jellyfin.local:8096");
    expect(definition.secrets).toMatchObject([{ sourceId: "default", kind: "apiKey", hasValue: true }]);
  });

  test("rolls back a source URL when its credential cannot be stored", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    const created = await caller.create({ ...jellyfin, secrets: [] });
    const before = await caller.get({ id: created.id });
    rejectSecretInserts(db);

    await expect(
      caller.sourceConfigure({
        definitionId: created.id,
        sourceId: "default",
        baseUrl: "http://jellyfin.local:8096",
        networkScope: "private",
        secrets: [secret],
      }),
    ).rejects.toThrow("forced secret insert failure");

    expect((await caller.get({ id: created.id })).sources.default?.baseUrl).toBe(before.sources.default?.baseUrl);
  });

  test("uses the preview widget name in a user configuration request", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    const preview = await caller.previewCreate({
      definition: { ...jellyfin, name: "Living room Jellyfin" },
      secrets: [],
    });

    const request = await caller.configurationRequestUser({
      previewSessionId: preview.previewSession.id,
      sourceId: "default",
    });

    expect(await getCustomWidgetConfigurationRequestForUser(request.requestId, userId)).toMatchObject({
      widgetName: "Living room Jellyfin",
    });
  });

  test("does not inherit a stored credential after a preview source binding changes", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    const created = await caller.create({ ...jellyfin, secrets: [secret] });
    const changedDefinition = {
      ...jellyfin,
      sources: {
        ...jellyfin.sources,
        default: { ...jellyfinDefaultSource, baseUrl: "https://attacker.example" },
      },
    };

    await expect(
      createManageOnlyCaller(db).previewCreate({
        definitionId: created.id,
        definition: changedDefinition,
        secrets: [],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.previewCreate({ definitionId: created.id, definition: changedDefinition, secrets: [secret] }),
    ).resolves.toMatchObject({ success: true });
  });

  test("clears persisted credentials when a manage-only source edit changes its binding", async () => {
    const db = await prepareDatabase();
    const created = await createCaller(db).create({ ...jellyfin, secrets: [secret] });

    await createManageOnlyCaller(db).sourceConfigure({
      definitionId: created.id,
      sourceId: "default",
      baseUrl: "https://other.example/api",
      networkScope: "public",
      secrets: [],
    });

    expect(
      await db.query.customWidgetSecrets.findMany({
        where: eq(customWidgetSecrets.definitionId, created.id),
      }),
    ).toHaveLength(0);
  });

  test("clears persisted credentials when a general definition update changes its binding", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    const created = await caller.create({ ...jellyfin, secrets: [secret] });

    await createManageOnlyCaller(db).update({
      id: created.id,
      sources: {
        ...jellyfin.sources,
        default: { ...jellyfinDefaultSource, baseUrl: "https://other.example/api" },
      },
    });

    expect(
      await db.query.customWidgetSecrets.findMany({
        where: eq(customWidgetSecrets.definitionId, created.id),
      }),
    ).toHaveLength(0);
  });

  test("requires secret-write permission to create a stored-definition setup link", async () => {
    const db = await prepareDatabase();
    const created = await createCaller(db).create({ ...jellyfin, secrets: [] });

    await expect(
      createManageOnlyCaller(db).configurationRequestUser({ definitionId: created.id, sourceId: "default" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("allows only one concurrent template patch for a revision", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    const created = await caller.create({ ...jellyfin, template: "<Text>Original</Text>", secrets: [] });
    const read = await caller.readTemplate({ id: created.id });

    const results = await Promise.allSettled([
      caller.templatePatch({
        id: created.id,
        expectedRevision: read.revision,
        edits: [{ startLine: 1, deleteCount: 1, replacementLines: ["<Text>First</Text>"] }],
      }),
      caller.templatePatch({
        id: created.id,
        expectedRevision: read.revision,
        edits: [{ startLine: 1, deleteCount: 1, replacementLines: ["<Text>Second</Text>"] }],
      }),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(1);
  });
});
