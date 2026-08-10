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
import { BUNDLED_CUSTOM_WIDGETS, customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";
import { describe, expect, test } from "vitest";

import { customWidgetRouter } from "../../custom-widget/custom-widget-router";
import { getCustomWidgetConfigurationRequestForUser } from "../../custom-widget/configuration-requests";
import { configureCustomWidgetSourceFromRequest } from "../../custom-widget/secret-persistence";
import {
  appendPreviewJournal,
  configurePreviewSessionSource,
  getPreviewSession,
} from "../../custom-widget/preview-sessions";
import { serializeCustomWidgetDefinition } from "../../custom-widget/stored-definition";

const userId = createId();
const session = {
  user: {
    id: userId,
    permissions: ["admin"],
    colorScheme: "light",
  },
  expires: new Date().toISOString(),
} satisfies Session;
const nonAdminSession = {
  ...session,
  user: { ...session.user, permissions: ["board-modify-all"] },
} satisfies Session;

const jellyfin = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-jellyfin")?.widget;
if (!jellyfin) throw new Error("Jellyfin bundled widget is missing");
const pokedex = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-pokedex")?.widget;
if (!pokedex) throw new Error("Pokédex bundled widget is missing");
const jellyfinDefaultSource = jellyfin.sources.default;
if (!jellyfinDefaultSource) throw new Error("Jellyfin default source is missing");

function createCaller(db: ReturnType<typeof createDb>) {
  return customWidgetRouter.createCaller({ db, deviceType: undefined, session });
}

function createNonAdminCaller(db: ReturnType<typeof createDb>) {
  return customWidgetRouter.createCaller({
    db,
    deviceType: undefined,
    session: nonAdminSession,
  });
}

async function prepareDatabase() {
  const db = createDb();
  await db.insert(users).values({ id: userId });
  return db;
}

function rejectSecretInserts(db: ReturnType<typeof createDb>) {
  db.run(
    sql.raw(`CREATE TRIGGER reject_custom_widget_v2_secret_insert
      BEFORE INSERT ON custom_widget_v2_secret
      BEGIN
        SELECT RAISE(ABORT, 'forced secret insert failure');
      END`),
  );
}

function rejectDefinitionUpdates(db: ReturnType<typeof createDb>) {
  db.run(
    sql.raw(`CREATE TRIGGER reject_custom_widget_v2_definition_update
      BEFORE UPDATE ON custom_widget_v2_definition
      BEGIN
        SELECT RAISE(ABORT, 'forced definition update failure');
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
  test("creates and previews MCP-friendly multiline templateLines without losing the JSX", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    const { template, ...definition } = jellyfin;
    const templateLines = template.split("\n");

    const validation = await caller.validate({ widget: { ...definition, templateLines } });
    expect(validation).toMatchObject({
      valid: true,
      summary: {
        name: jellyfin.name,
        sourceIds: Object.keys(jellyfin.sources),
        requestIds: Object.keys(jellyfin.requests),
        templateLineCount: templateLines.length,
      },
    });
    expect(validation).not.toHaveProperty("widget");
    expect(validation).not.toHaveProperty("templateLines");
    expect(Buffer.byteLength(JSON.stringify(validation), "utf8")).toBeLessThan(2_000);
    const preview = await caller.previewCreate({ definition: { ...definition, templateLines }, secrets: [] });
    expect(preview).toMatchObject({
      success: true,
      previewPath: `/manage/custom-widgets/preview/${preview.previewSession.id}`,
    });
    expect(preview).not.toHaveProperty("definition");
    expect(Buffer.byteLength(JSON.stringify(preview), "utf8")).toBeLessThan(4_000);
    expect(preview.queries.map(({ requestId }) => requestId)).toEqual(Object.keys(jellyfin.requests));
    expect(preview.queries.every(({ nextStep }) => nextStep.includes("customWidget_previewQuery"))).toBe(true);

    const created = await caller.create({ ...definition, templateLines, secrets: [] });
    expect(created.managementPath).toBe(`/manage/custom-widgets/edit/${created.id}`);
    expect(created.nextAction).toEqual({
      type: "place-custom-widget",
      widgetKind: "customApi",
      options: { definitionId: created.id },
      whenTargetIsKnown: "Call configure_widget now with the requested board and these exact widget options.",
      whenTargetIsUnknown:
        "Call ask_user now with 'Place on a board' and 'Leave unplaced'. Never ask this choice in prose.",
    });
    expect((await caller.get({ id: created.id })).template).toBe(template);
  });

  test("persists the exact final tested Pokédex preview without resending its JSX", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    const { template, ...definition } = pokedex;
    const candidate = { ...definition, templateLines: template.split("\n") };

    // A long-running authoring request can iterate several times. Only the final preview session
    // is eligible for persistence, and its compact ID replaces a second large streamed payload.
    await caller.previewCreate({ definition: candidate, secrets: [] });
    await caller.previewCreate({ definition: candidate, secrets: [] });
    const finalPreview = await caller.previewCreate({ definition: candidate, secrets: [] });
    const createInput = { previewSessionId: finalPreview.previewSession.id, targetBoardId: "board-hey" };
    expect(Buffer.byteLength(JSON.stringify(createInput), "utf8")).toBeLessThan(128);

    await expect(caller.createFromPreview(createInput)).rejects.toThrow("Test every final preview query successfully");

    const previewSession = await getPreviewSession(finalPreview.previewSession.id, userId);
    for (const [requestId, request] of Object.entries(previewSession.requests)) {
      if (request.kind !== "query") continue;
      await appendPreviewJournal(previewSession, {
        requestId,
        kind: "query",
        method: request.method,
        path: request.path,
        status: 200,
        durationMs: 1,
        simulated: false,
      });
    }

    const defaultSource = previewSession.sources.default;
    if (!defaultSource) throw new Error("Pokédex preview source is missing");
    await configurePreviewSessionSource(previewSession.id, userId, "default", { ...defaultSource }, []);
    await expect(caller.createFromPreview(createInput)).rejects.toThrow("Test every final preview query successfully");

    const finalPreviewSession = await getPreviewSession(finalPreview.previewSession.id, userId);
    for (const [requestId, request] of Object.entries(finalPreviewSession.requests)) {
      if (request.kind !== "query") continue;
      await appendPreviewJournal(finalPreviewSession, {
        requestId,
        kind: "query",
        method: request.method,
        path: request.path,
        status: 200,
        durationMs: 1,
        simulated: false,
      });
    }

    const created = await caller.createFromPreview(createInput);
    expect(created.managementPath).toBe(`/manage/custom-widgets/edit/${created.id}`);
    expect(created.nextAction.options).toEqual({ definitionId: created.id });
    expect(created.nextAction.targetBoardId).toBe("board-hey");
    await expect(caller.get({ id: created.id })).resolves.toMatchObject({
      name: pokedex.name,
      description: pokedex.description,
      template,
      sources: pokedex.sources,
      requests: pokedex.requests,
      options: pokedex.options,
    });
  });

  test("updates a saved widget with MCP-friendly multiline templateLines", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    const created = await caller.create({ ...jellyfin, secrets: [] });
    const updatedTemplate = jellyfin.template.replace("Jellyfin library", "Updated Jellyfin library");

    const updated = await caller.update({ id: created.id, templateLines: updatedTemplate.split("\n") });

    expect(updated.managementPath).toBe(`/manage/custom-widgets/edit/${created.id}`);
    expect((await caller.get({ id: created.id })).template).toBe(updatedTemplate);
  });

  test("reports joined templateLines validation issues as BAD_REQUEST for create and update", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    const { template: _template, ...definition } = jellyfin;
    const invalidTemplateLines = ["<Stack>", '  <img src="https://example.com/logo.png" />', "</Stack>"];

    const createError = await caller
      .create({ ...definition, templateLines: invalidTemplateLines, secrets: [] })
      .catch((error: unknown) => error);
    expect(createError).toMatchObject({
      code: "BAD_REQUEST",
      cause: { issues: [expect.objectContaining({ path: ["template"] })] },
    });
    expect(await db.query.customWidgetDefinitions.findMany()).toHaveLength(0);

    const created = await caller.create({ ...jellyfin, secrets: [] });
    const updateError = await caller
      .update({ id: created.id, templateLines: invalidTemplateLines })
      .catch((error: unknown) => error);
    expect(updateError).toMatchObject({
      code: "BAD_REQUEST",
      cause: { issues: [expect.objectContaining({ path: ["template"] })] },
    });
    expect((await caller.get({ id: created.id })).template).toBe(jellyfin.template);
  });

  test("atomically creates a v2 replacement while preserving the legacy widget and its stable ID", async () => {
    const db = await prepareDatabase();
    const legacy = await insertLegacyJellyfin(db);

    await createCaller(db).migrateLegacy({ id: legacy.id, widget: jellyfin, secrets: [] });

    expect(await db.query.legacyCustomWidgetDefinitions.findFirst()).toMatchObject({
      id: legacy.id,
      name: "Legacy Jellyfin",
      enabled: false,
    });
    expect(await db.query.legacyCustomWidgetSecrets.findFirst()).toMatchObject({
      definitionId: legacy.id,
      encryptedValue: legacy.encryptedValue,
    });
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

    const migratedList = await createCaller(db).list();
    expect(migratedList).toHaveLength(1);
    expect(migratedList[0]).toMatchObject({ id: legacy.id, migrationRequired: false });

    await createCaller(db).delete({ id: legacy.id });

    const fallbackList = await createCaller(db).list();
    expect(fallbackList).toHaveLength(1);
    expect(fallbackList[0]).toMatchObject({ id: legacy.id, migrationRequired: true });
    expect(await db.query.legacyCustomWidgetSecrets.findFirst()).toMatchObject({
      definitionId: legacy.id,
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

  test("refuses to export a stored definition containing embedded credentials", async () => {
    const db = await prepareDatabase();
    const definition = customWidgetDefinitionSchema.parse(jellyfin);
    const counts = definition.requests.counts;
    if (!counts) throw new Error("Jellyfin counts request is missing");
    const id = createId();
    await db.insert(customWidgetDefinitions).values({
      id,
      ...serializeCustomWidgetDefinition({
        ...definition,
        requests: {
          ...definition.requests,
          counts: {
            ...counts,
            headers: { ...counts.headers, "X-Auth": "Bearer sk-secret-123456" },
          },
        },
      }),
      creatorId: userId,
    });

    await expect(createCaller(db).export({ id })).rejects.toThrow("Credentials must use source authentication");
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

  test("keeps the existing secret when setting its replacement fails", async () => {
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
      caller.secretSet({
        definitionId: created.id,
        secret: { ...secret, value: "replacement-secret" },
      }),
    ).rejects.toThrow("forced secret insert failure");

    expect(
      await db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, created.id),
      }),
    ).toEqual(originalDefinition);
    expect(
      await db.query.customWidgetSecrets.findFirst({
        where: eq(customWidgetSecrets.definitionId, created.id),
      }),
    ).toEqual(originalSecret);
  });

  test("keeps the existing secret when clearing it cannot update the definition revision", async () => {
    const db = await prepareDatabase();
    const caller = createCaller(db);
    const created = await caller.create({ ...jellyfin, secrets: [secret] });
    const originalDefinition = await db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, created.id),
    });
    const originalSecret = await db.query.customWidgetSecrets.findFirst({
      where: eq(customWidgetSecrets.definitionId, created.id),
    });
    rejectDefinitionUpdates(db);

    await expect(
      caller.secretClear({
        definitionId: created.id,
        sourceId: secret.sourceId,
        kind: secret.kind,
      }),
    ).rejects.toThrow("forced definition update failure");

    expect(
      await db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, created.id),
      }),
    ).toEqual(originalDefinition);
    expect(
      await db.query.customWidgetSecrets.findFirst({
        where: eq(customWidgetSecrets.definitionId, created.id),
      }),
    ).toEqual(originalSecret);
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
      createNonAdminCaller(db).previewCreate({
        definitionId: created.id,
        definition: changedDefinition,
        secrets: [],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.previewCreate({ definitionId: created.id, definition: changedDefinition, secrets: [secret] }),
    ).resolves.toMatchObject({ success: true });
  });

  test("clears persisted credentials when an admin source edit changes its binding", async () => {
    const db = await prepareDatabase();
    const created = await createCaller(db).create({ ...jellyfin, secrets: [secret] });

    await createCaller(db).sourceConfigure({
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

  test("uses the persisted source binding from inside the configuration transaction", async () => {
    const db = await prepareDatabase();
    const created = await createCaller(db).create({ ...jellyfin, secrets: [secret] });
    const definition = customWidgetDefinitionSchema.parse(jellyfin);
    const defaultSource = definition.sources.default;
    if (!defaultSource) throw new Error("Jellyfin default source is missing");
    await db
      .update(customWidgetDefinitions)
      .set(
        serializeCustomWidgetDefinition({
          ...definition,
          name: "Concurrent definition edit",
          sources: {
            ...definition.sources,
            default: { ...defaultSource, baseUrl: "https://changed.example/api" },
          },
        }),
      )
      .where(eq(customWidgetDefinitions.id, created.id));

    await expect(
      configureCustomWidgetSourceFromRequest(db, {
        definitionId: created.id,
        sourceId: "default",
        baseUrl: defaultSource.baseUrl,
        networkScope: defaultSource.networkScope,
        secrets: [],
        expectedSource: defaultSource,
      }),
    ).resolves.toMatchObject({
      status: "configured",
      source: { baseUrl: defaultSource.baseUrl },
    });

    expect(await createCaller(db).get({ id: created.id })).toMatchObject({
      name: "Concurrent definition edit",
      sources: { default: { baseUrl: defaultSource.baseUrl } },
    });
    expect(
      await db.query.customWidgetSecrets.findMany({
        where: eq(customWidgetSecrets.definitionId, created.id),
      }),
    ).toHaveLength(0);
  });

  test("rejects stale setup-link credentials after a concurrent authentication binding change", async () => {
    const db = await prepareDatabase();
    const created = await createCaller(db).create({ ...jellyfin, secrets: [] });
    const definition = customWidgetDefinitionSchema.parse(jellyfin);
    const expectedSource = definition.sources.default;
    if (!expectedSource || typeof expectedSource.auth === "string") {
      throw new Error("Jellyfin default source must use header authentication");
    }
    await db
      .update(customWidgetDefinitions)
      .set(
        serializeCustomWidgetDefinition({
          ...definition,
          name: "Concurrent definition edit",
          sources: {
            ...definition.sources,
            default: {
              ...expectedSource,
              auth: { ...expectedSource.auth, name: "X-Replaced-Credential" },
            },
          },
        }),
      )
      .where(eq(customWidgetDefinitions.id, created.id));

    await expect(
      configureCustomWidgetSourceFromRequest(db, {
        definitionId: created.id,
        sourceId: "default",
        baseUrl: "https://configured.example/api",
        networkScope: "public",
        secrets: [secret],
        expectedSource,
      }),
    ).resolves.toEqual({ status: "binding-changed" });

    expect(await createCaller(db).get({ id: created.id })).toMatchObject({
      name: "Concurrent definition edit",
      sources: {
        default: {
          baseUrl: expectedSource.baseUrl,
          auth: { name: "X-Replaced-Credential" },
        },
      },
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

    await createCaller(db).update({
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

  test("requires an administrator to create a stored-definition setup link", async () => {
    const db = await prepareDatabase();
    const created = await createCaller(db).create({ ...jellyfin, secrets: [] });

    await expect(
      createNonAdminCaller(db).configurationRequestUser({ definitionId: created.id, sourceId: "default" }),
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
