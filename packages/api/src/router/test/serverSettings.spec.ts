import { stringify } from "superjson";
import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { boards, serverSettings } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import { defaultServerSettings, defaultServerSettingsKeys } from "@homarr/server-settings";

import { serverSettingsRouter } from "../serverSettings";

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

const defaultSession = {
  user: {
    id: createId(),
    permissions: ["admin"],
    colorScheme: "light",
  },
  expires: new Date().toISOString(),
} satisfies Session;

describe("getAll server settings", () => {
  test("getAll should throw error when unauthorized", async () => {
    const db = createDb();
    const caller = serverSettingsRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
    });

    await db.insert(serverSettings).values([
      {
        settingKey: defaultServerSettingsKeys[0],
        value: stringify(defaultServerSettings.analytics),
      },
    ]);

    const actAsync = async () => await caller.getAll();

    await expect(actAsync()).rejects.toThrow();
  });
  test("getAll should return default server settings when nothing in database", async () => {
    const db = createDb();
    const caller = serverSettingsRouter.createCaller({
      db,
      deviceType: undefined,
      session: defaultSession,
    });

    const result = await caller.getAll();

    expect(result).toStrictEqual(defaultServerSettings);
  });
});

describe("saveSettings", () => {
  test("saveSettings should update settings and return true when it updated only one", async () => {
    const db = createDb();
    const caller = serverSettingsRouter.createCaller({
      db,
      deviceType: undefined,
      session: defaultSession,
    });

    await db.insert(serverSettings).values([
      {
        settingKey: defaultServerSettingsKeys[0],
        value: stringify(defaultServerSettings.analytics),
      },
    ]);

    await caller.saveSettings({
      settingsKey: "analytics",
      value: {
        enableGeneral: true,
      },
    });

    const dbSettings = await db.select().from(serverSettings);
    expect(dbSettings).toStrictEqual([
      {
        settingKey: "analytics",
        value: stringify({
          enableGeneral: true,
          instanceId: null,
        }),
      },
    ]);
  });
});

describe("board settings API", () => {
  test("getBoardSettings should return board defaults", async () => {
    const db = createDb();
    const caller = serverSettingsRouter.createCaller({
      db,
      deviceType: undefined,
      session: defaultSession,
    });

    await expect(caller.getBoardSettings()).resolves.toStrictEqual(defaultServerSettings.board);
  });

  test("updateBoardSettings should insert settings when defaults are not persisted", async () => {
    const db = createDb();
    const caller = serverSettingsRouter.createCaller({
      db,
      deviceType: undefined,
      session: defaultSession,
    });
    const boardId = createId();
    await db.insert(boards).values({ id: boardId, name: "default", isPublic: true });

    const result = await caller.updateBoardSettings({
      homeBoardId: boardId,
      forceDisableStatus: true,
    });

    expect(result).toStrictEqual({
      ...defaultServerSettings.board,
      homeBoardId: boardId,
      forceDisableStatus: true,
    });
    const dbSettings = await db.select().from(serverSettings);
    expect(dbSettings).toStrictEqual([
      {
        settingKey: "board",
        value: stringify(result),
      },
    ]);
  });

  test("updateBoardSettings should update existing settings", async () => {
    const db = createDb();
    const caller = serverSettingsRouter.createCaller({
      db,
      deviceType: undefined,
      session: defaultSession,
    });
    const boardId = createId();
    await db.insert(boards).values({ id: boardId, name: "default", isPublic: true });

    await caller.updateBoardSettings({ homeBoardId: boardId });
    const result = await caller.updateBoardSettings({
      mobileHomeBoardId: boardId,
      enableStatusByDefault: false,
    });

    expect(result).toStrictEqual({
      ...defaultServerSettings.board,
      homeBoardId: boardId,
      mobileHomeBoardId: boardId,
      enableStatusByDefault: false,
    });
    const dbSettings = await db.select().from(serverSettings);
    expect(dbSettings).toStrictEqual([
      {
        settingKey: "board",
        value: stringify(result),
      },
    ]);
  });

  test("updateBoardSettings should reject private home boards", async () => {
    const db = createDb();
    const caller = serverSettingsRouter.createCaller({
      db,
      deviceType: undefined,
      session: defaultSession,
    });
    const boardId = createId();
    await db.insert(boards).values({ id: boardId, name: "private", isPublic: false });

    const actAsync = async () => await caller.updateBoardSettings({ homeBoardId: boardId });

    await expect(actAsync()).rejects.toThrow("must reference public boards");
  });
});
