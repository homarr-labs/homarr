import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { eq, sql } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets, users } from "@homarr/db/schema";
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

const jellyfin = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-jellyfin")?.widget;
if (!jellyfin) throw new Error("Jellyfin bundled widget is missing");

function createCaller(db: ReturnType<typeof createDb>) {
  return customWidgetRouter.createCaller({ db, deviceType: undefined, session });
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

const secret = { sourceId: "default", kind: "apiKey" as const, value: "test-secret" };

describe("custom widget definition persistence", () => {
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
});
