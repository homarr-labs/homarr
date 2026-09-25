import { describe, expect, test, vi } from "vitest";
import { stringify } from "superjson";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import {
  apps,
  boardGroupPermissions,
  boards,
  groupPermissions,
  groups,
  integrations,
  integrationSecrets,
  layouts,
  searchEngines,
  serverSettings,
  sections,
  users,
} from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { GroupPermissionKey } from "@homarr/definitions";
import { defaultServerSettings } from "@homarr/server-settings";

import { boardRouter } from "../board";
import { configRouter } from "../config/config-router";
import { expectToBeDefined } from "./helper";

const adminId = createId();
const session = {
  user: {
    id: adminId,
    permissions: ["admin", "board-create"] satisfies GroupPermissionKey[],
    colorScheme: "light",
  },
  expires: new Date(Date.now() + 100_000).toISOString(),
} satisfies Session;

vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

const createConfigCaller = (db: Database) => configRouter.createCaller({ db, deviceType: undefined, session });

/** Builds an instance with one of every entity the configuration document covers */
const createSourceInstanceAsync = async () => {
  const db = createDb();
  const appId = createId();
  const integrationId = createId();
  const groupId = createId();
  const boardId = createId();
  const sectionId = createId();
  const layoutId = createId();

  await db.insert(users).values({ id: adminId, name: "admin" });
  await db.insert(apps).values({ id: appId, name: "Sonarr", iconUrl: "https://example.com/sonarr.svg" });
  await db
    .insert(integrations)
    .values({ id: integrationId, name: "Sonarr", url: "https://sonarr.local", kind: "sonarr", appId });
  await db.insert(searchEngines).values({
    id: createId(),
    name: "Kagi",
    short: "k",
    iconUrl: "https://example.com/kagi.svg",
    type: "generic",
    urlTemplate: "https://kagi.com/search?q=%s",
  });
  await db.insert(groups).values({ id: groupId, name: "automation", position: 1 });
  await db.insert(groupPermissions).values({ groupId, permission: "board-create" });

  await db.insert(boards).values({ id: boardId, name: "homelab", creatorId: adminId, opacity: 80 });
  await db.insert(sections).values({ id: sectionId, boardId, kind: "empty", xOffset: 0, yOffset: 0 });
  await db.insert(layouts).values({ id: layoutId, boardId, name: "Base", columnCount: 12, breakpoint: 0 });

  await boardRouter.createCaller({ db, deviceType: undefined, session }).addItem({
    boardId,
    kind: "clock",
    options: { is24HourFormat: true },
    integrationIds: [integrationId],
    xOffset: 2,
    yOffset: 1,
    width: 5,
    height: 3,
  });

  return { db, appId, integrationId, groupId, boardId };
};

const createTargetInstanceAsync = async () => {
  const db = createDb();
  await db.insert(users).values({ id: adminId, name: "admin" });
  return db;
};

describe("config export and import", () => {
  test("should recreate the whole configuration with the original ids", async () => {
    // Arrange
    const source = await createSourceInstanceAsync();
    const document = await createConfigCaller(source.db).export();
    const targetDb = await createTargetInstanceAsync();

    // Act
    const result = await createConfigCaller(targetDb).import(document);

    // Assert
    expect(result.created).toMatchObject({ apps: 1, integrations: 1, searchEngines: 1, groups: 1, boards: 1 });

    const importedApp = expectToBeDefined(await targetDb.query.apps.findFirst({ where: eq(apps.id, source.appId) }));
    expect(importedApp.name).toBe("Sonarr");

    const importedIntegration = expectToBeDefined(
      await targetDb.query.integrations.findFirst({ where: eq(integrations.id, source.integrationId) }),
    );
    expect(importedIntegration.appId).toBe(source.appId);

    const importedGroup = expectToBeDefined(
      await targetDb.query.groups.findFirst({
        where: eq(groups.id, source.groupId),
        with: { permissions: true },
      }),
    );
    expect(importedGroup.permissions.map(({ permission }) => permission)).toStrictEqual(["board-create"]);

    const board = await boardRouter
      .createCaller({ db: targetDb, deviceType: undefined, session })
      .getBoardById({ id: source.boardId });
    expect(board.name).toBe("homelab");
    expect(board.items).toHaveLength(1);
    expect(board.items[0]?.layouts[0]).toMatchObject({ xOffset: 2, yOffset: 1, width: 5, height: 3 });
    expect(board.items[0]?.integrationIds).toStrictEqual([source.integrationId]);
  });

  test("should not export integration secret values", async () => {
    // Arrange
    const source = await createSourceInstanceAsync();
    await source.db.insert(integrationSecrets).values({
      integrationId: source.integrationId,
      kind: "apiKey",
      value: encryptSecret("secretValue"),
    });

    // Act
    const document = await createConfigCaller(source.db).export();

    // Assert
    expect(document.integrations[0]).not.toHaveProperty("secrets");
    expect(JSON.stringify(document)).not.toContain("secretValue");
  });

  test("should reject a second import unless a conflict strategy is given", async () => {
    // Arrange
    const source = await createSourceInstanceAsync();
    const document = await createConfigCaller(source.db).export();
    const targetDb = await createTargetInstanceAsync();
    const caller = createConfigCaller(targetDb);
    await caller.import(document);

    // Act
    const actAsync = async () => await caller.import(document);

    // Assert
    await expect(actAsync()).rejects.toThrowError("Already present");
  });

  test("should be a no-op when importing the same document with skip", async () => {
    // Arrange
    const source = await createSourceInstanceAsync();
    const document = await createConfigCaller(source.db).export();
    const targetDb = await createTargetInstanceAsync();
    const caller = createConfigCaller(targetDb);
    await caller.import(document);

    // Act
    const result = await caller.import({ ...document, onConflict: "skip" });

    // Assert
    expect(result.created).toStrictEqual({});
    expect(await targetDb.$count(boards)).toBe(1);
    expect(await targetDb.$count(apps)).toBe(1);
  });

  test("should update existing entities with replace", async () => {
    // Arrange
    const source = await createSourceInstanceAsync();
    const document = await createConfigCaller(source.db).export();
    const targetDb = await createTargetInstanceAsync();
    const caller = createConfigCaller(targetDb);
    await caller.import(document);

    // Act
    await caller.import({
      ...document,
      onConflict: "replace",
      apps: document.apps.map((app) => ({ ...app, name: "Sonarr renamed" })),
    });

    // Assert
    const app = expectToBeDefined(await targetDb.query.apps.findFirst({ where: eq(apps.id, source.appId) }));
    expect(app.name).toBe("Sonarr renamed");
    expect(await targetDb.$count(boards)).toBe(1);
    expect(await targetDb.$count(apps)).toBe(1);
  });

  test("should store integration secrets that are supplied with the import", async () => {
    // Arrange
    const source = await createSourceInstanceAsync();
    const document = await createConfigCaller(source.db).export();
    const targetDb = await createTargetInstanceAsync();

    // Act
    await createConfigCaller(targetDb).import({
      ...document,
      integrations: document.integrations.map((integration) => ({
        ...integration,
        secrets: [{ kind: "apiKey" as const, value: "super-secret" }],
      })),
    });

    // Assert
    const secrets = await targetDb.query.integrationSecrets.findMany();
    expect(secrets).toHaveLength(1);
    expect(secrets[0]?.kind).toBe("apiKey");
    expect(secrets[0]?.value).not.toContain("super-secret");
  });

  test("should adopt entities of a separately installed instance by their natural key", async () => {
    // Arrange
    const source = await createSourceInstanceAsync();
    const document = await createConfigCaller(source.db).export();

    // The target seeds its own 'everyone' group and a board of the same name, both with
    // ids that the source instance has never seen
    const targetDb = await createTargetInstanceAsync();
    const foreignGroupId = createId();
    const foreignBoardId = createId();
    await targetDb.insert(groups).values({ id: foreignGroupId, name: "automation", position: 1 });
    await targetDb.insert(boards).values({ id: foreignBoardId, name: "homelab", creatorId: adminId });

    // Act
    const result = await createConfigCaller(targetDb).import({ ...document, onConflict: "replace" });

    // Assert
    expect(result.updated).toMatchObject({ groups: 1, boards: 1 });
    expect(await targetDb.$count(groups)).toBe(1);
    expect(await targetDb.$count(boards)).toBe(1);

    // The content of the document ended up on the board that was already there
    const board = await boardRouter
      .createCaller({ db: targetDb, deviceType: undefined, session })
      .getBoardById({ id: foreignBoardId });
    expect(board.items).toHaveLength(1);

    const group = expectToBeDefined(
      await targetDb.query.groups.findFirst({ where: eq(groups.id, foreignGroupId), with: { permissions: true } }),
    );
    expect(group.permissions.map(({ permission }) => permission)).toStrictEqual(["board-create"]);
  });

  test("should stay applicable when the same document is replaced twice", async () => {
    // Arrange
    const source = await createSourceInstanceAsync();
    await source.db
      .insert(boardGroupPermissions)
      .values({ boardId: source.boardId, groupId: source.groupId, permission: "view" });
    const document = await createConfigCaller(source.db).export();
    expect(document.boards[0]?.groupPermissions).toHaveLength(1);

    const targetDb = await createTargetInstanceAsync();
    const caller = createConfigCaller(targetDb);
    await caller.import(document);

    // Act
    const actAsync = async () => await caller.import({ ...document, onConflict: "replace" });

    // Assert
    await expect(actAsync()).resolves.toBeDefined();
    await expect(actAsync()).resolves.toBeDefined();
    expect(await targetDb.$count(boardGroupPermissions)).toBe(1);
  });

  test("should follow an adopted search engine from the settings", async () => {
    // Arrange
    const source = await createSourceInstanceAsync();
    const sourceEngine = expectToBeDefined(await source.db.query.searchEngines.findFirst());
    await createConfigCaller(source.db).import({
      version: 1,
      settings: { search: { defaultSearchEngineId: sourceEngine.id } },
    });
    const document = await createConfigCaller(source.db).export();

    // The target has the same engine under a different id
    const targetDb = await createTargetInstanceAsync();
    const foreignEngineId = createId();
    await targetDb.insert(searchEngines).values({
      id: foreignEngineId,
      name: "Kagi",
      short: "k",
      iconUrl: "https://example.com/kagi.svg",
      type: "generic",
      urlTemplate: "https://kagi.com/search?q=%s",
    });

    // Act
    await createConfigCaller(targetDb).import({ ...document, onConflict: "replace" });

    // Assert
    const settings = await createConfigCaller(targetDb).export();
    expect(settings.settings.search).toMatchObject({ defaultSearchEngineId: foreignEngineId });
  });

  test("should keep what points at a board that is replaced", async () => {
    // Arrange
    const source = await createSourceInstanceAsync();
    const document = await createConfigCaller(source.db).export();
    const targetDb = await createTargetInstanceAsync();
    const caller = createConfigCaller(targetDb);
    await caller.import(document);
    await targetDb.update(users).set({ homeBoardId: source.boardId }).where(eq(users.id, adminId));

    // Act
    await caller.import({ ...document, onConflict: "replace" });

    // Assert
    const user = expectToBeDefined(await targetDb.query.users.findFirst({ where: eq(users.id, adminId) }));
    expect(user.homeBoardId).toBe(source.boardId);
  });

  test("should reject a document that references something it does not contain", async () => {
    // Arrange
    const source = await createSourceInstanceAsync();
    const document = await createConfigCaller(source.db).export();
    const targetDb = await createTargetInstanceAsync();

    // Act
    const actAsync = async () =>
      await createConfigCaller(targetDb).import({
        ...document,
        integrations: [],
      });

    // Assert
    await expect(actAsync()).rejects.toThrowError("references entities that neither exist nor are part of it");
    expect(await targetDb.$count(boards)).toBe(0);
  });

  test("should apply server settings", async () => {
    // Arrange
    const source = await createSourceInstanceAsync();
    const document = await createConfigCaller(source.db).export();
    const targetDb = await createTargetInstanceAsync();

    // Act
    await createConfigCaller(targetDb).import({
      ...document,
      settings: { appearance: { defaultColorScheme: "dark" } },
    });

    // Assert
    const settings = await createConfigCaller(targetDb).export();
    expect(settings.settings.appearance).toMatchObject({ defaultColorScheme: "dark" });
  });

  test("should reject a private global home board", async () => {
    const db = await createTargetInstanceAsync();
    const boardId = createId();
    await db.insert(boards).values({ id: boardId, name: "private", isPublic: false });

    await expect(
      createConfigCaller(db).import({ version: 1, settings: { board: { homeBoardId: boardId } } }),
    ).rejects.toThrow("must reference public boards");
  });

  test("should reject replacing the configured home board with a private board", async () => {
    const source = await createSourceInstanceAsync();
    const document = await createConfigCaller(source.db).export();
    const db = await createTargetInstanceAsync();
    await db.insert(boards).values({ id: source.boardId, name: "homelab", isPublic: true });
    await db.insert(serverSettings).values({
      settingKey: "board",
      value: stringify({ ...defaultServerSettings.board, homeBoardId: source.boardId }),
    });

    await expect(
      createConfigCaller(db).import({ ...document, settings: undefined, onConflict: "replace" }),
    ).rejects.toThrow("must reference public boards");
  });

  test("should reject unknown or invalid server settings", async () => {
    const db = await createTargetInstanceAsync();
    const caller = createConfigCaller(db);

    await expect(caller.import({ version: 1, settings: { unknown: {} } } as never)).rejects.toThrowError(
      "Unrecognized key",
    );
    await expect(
      caller.import({ version: 1, settings: { appearance: { defaultColorScheme: "purple" } } } as never),
    ).rejects.toThrowError();
  });
});
