import SuperJSON from "superjson";
import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/db";
import { serverSettings } from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";
import { defaultServerSettings, defaultServerSettingsKeys } from "@homarr/server-settings";

import { serverSettingsRouter } from "../serverSettings";

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

const defaultSession = {
  user: {
    id: createId(),
    permissions: [],
  },
  expires: new Date().toISOString(),
} satisfies Session;

describe("getAll server settings", () => {
  test("getAll should throw error when unauthorized", async () => {
    const db = createDb();
    const caller = serverSettingsRouter.createCaller({
      db,
      session: null,
    });

    await db.insert(serverSettings).values([
      {
        settingKey: defaultServerSettingsKeys[0],
        value: SuperJSON.stringify(defaultServerSettings.analytics),
      },
    ]);

    const actAsync = async () => await caller.getAll();

    await expect(actAsync()).rejects.toThrow();
  });
  test("getAll should return server", async () => {
    const db = createDb();
    const caller = serverSettingsRouter.createCaller({
      db,
      session: defaultSession,
    });

    await db.insert(serverSettings).values([
      {
        settingKey: defaultServerSettingsKeys[0],
        value: SuperJSON.stringify(defaultServerSettings.analytics),
      },
    ]);

    const result = await caller.getAll();

    expect(result).toStrictEqual({
      analytics: {
        enableGeneral: true,
        enableWidgetData: false,
        enableIntegrationData: false,
        enableUserData: false,
      },
    });
  });
});

describe("saveSettings", () => {
  test("saveSettings should return false when it did not update one", async () => {
    const db = createDb();
    const caller = serverSettingsRouter.createCaller({
      db,
      session: defaultSession,
    });

    const result = await caller.saveSettings({
      settingsKey: "analytics",
      value: {
        enableGeneral: true,
        enableWidgetData: true,
        enableIntegrationData: true,
        enableUserData: true,
      },
    });

    expect(result).toBe(false);

    const dbSettings = await db.select().from(serverSettings);
    expect(dbSettings.length).toBe(0);
  });
  test("saveSettings should update settings and return true when it updated only one", async () => {
    const db = createDb();
    const caller = serverSettingsRouter.createCaller({
      db,
      session: defaultSession,
    });

    await db.insert(serverSettings).values([
      {
        settingKey: defaultServerSettingsKeys[0],
        value: SuperJSON.stringify(defaultServerSettings.analytics),
      },
    ]);

    const result = await caller.saveSettings({
      settingsKey: "analytics",
      value: {
        enableGeneral: true,
        enableWidgetData: true,
        enableIntegrationData: true,
        enableUserData: true,
      },
    });

    expect(result).toBe(true);

    const dbSettings = await db.select().from(serverSettings);
    expect(dbSettings).toStrictEqual([
      {
        settingKey: "analytics",
        value: SuperJSON.stringify({
          enableGeneral: true,
          enableWidgetData: true,
          enableIntegrationData: true,
          enableUserData: true,
        }),
      },
    ]);
  });
});
