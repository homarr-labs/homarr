import { stringify } from "superjson";
import { describe, expect, test } from "vitest";

import { createId } from "@homarr/common";
import { eq } from "@homarr/db";
import {
  getServerSettingByKeyAsync,
  getServerSettingsAsync,
  shouldEnableAutomaticMobileLayoutForUpgrade,
} from "@homarr/db/queries";
import { boards, layouts, serverSettings } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import { defaultServerSettings } from "@homarr/server-settings";

import { seedServerSettingsAsync } from "./seed";

describe("automatic mobile layout upgrade default", () => {
  test("enables automatic mode for a new instance", () => {
    expect(shouldEnableAutomaticMobileLayoutForUpgrade([])).toBe(true);
  });

  test("enables automatic mode when every existing board has only its canonical layout", () => {
    expect(
      shouldEnableAutomaticMobileLayoutForUpgrade([
        { boardId: "first", name: "Base", breakpoint: 0 },
        { boardId: "second", name: "Base", breakpoint: 0 },
      ]),
    ).toBe(true);
  });

  test("preserves legacy mode when a board has multiple responsive layouts", () => {
    expect(
      shouldEnableAutomaticMobileLayoutForUpgrade([
        { boardId: "board", name: "Base", breakpoint: 0 },
        { boardId: "board", name: "Mobile", breakpoint: 480 },
      ]),
    ).toBe(false);
  });

  test("preserves legacy mode when a board has duplicate canonical layouts", () => {
    expect(
      shouldEnableAutomaticMobileLayoutForUpgrade([
        { boardId: "board", name: "Base", breakpoint: 0 },
        { boardId: "board", name: "Base", breakpoint: 0 },
      ]),
    ).toBe(false);
  });

  test.each([
    { boardId: "board", name: "Phone", breakpoint: 0 },
    { boardId: "board", name: "Base", breakpoint: 480 },
  ])("preserves legacy mode for a noncanonical saved layout", (existingLayout) => {
    expect(shouldEnableAutomaticMobileLayoutForUpgrade([existingLayout])).toBe(false);
  });

  test("uses the upgrade heuristic when migrations and seeding are skipped", async () => {
    const db = createDb();
    const boardId = createId();
    await db.insert(boards).values({ id: boardId, name: "dashboard", isPublic: false });
    await db.insert(layouts).values([
      { id: createId(), boardId, name: "Base", columnCount: 12, breakpoint: 0 },
      { id: createId(), boardId, name: "Phone", columnCount: 4, breakpoint: 480 },
    ]);

    await expect(getServerSettingByKeyAsync(db, "board")).resolves.toMatchObject({
      enableAutomaticMobileLayout: false,
    });
    await expect(getServerSettingsAsync(db)).resolves.toMatchObject({
      board: {
        enableAutomaticMobileLayout: false,
      },
    });
  });

  test("persists the enabled default when a fresh instance is seeded repeatedly", async () => {
    const db = createDb();

    await seedServerSettingsAsync(db);
    await seedServerSettingsAsync(db);

    await expect(getServerSettingByKeyAsync(db, "board")).resolves.toStrictEqual(defaultServerSettings.board);
  });

  test("backfills the enabled default for canonical layouts", async () => {
    const db = createDb();
    const boardId = createId();
    await db.insert(boards).values({ id: boardId, name: "dashboard", isPublic: false });
    await db.insert(layouts).values({
      id: createId(),
      boardId,
      name: "Base",
      columnCount: 12,
      breakpoint: 0,
    });
    await db.insert(serverSettings).values({
      settingKey: "board",
      value: stringify({
        homeBoardId: null,
        mobileHomeBoardId: null,
        enableStatusByDefault: true,
        forceDisableStatus: false,
      }),
    });

    await seedServerSettingsAsync(db);
    await seedServerSettingsAsync(db);

    await expect(getServerSettingByKeyAsync(db, "board")).resolves.toStrictEqual(defaultServerSettings.board);
  });

  test("does not override an explicit disabled choice", async () => {
    const db = createDb();
    await db.insert(serverSettings).values({
      settingKey: "board",
      value: stringify({
        ...defaultServerSettings.board,
        enableAutomaticMobileLayout: false,
      }),
    });

    await seedServerSettingsAsync(db);
    await seedServerSettingsAsync(db);

    await expect(getServerSettingByKeyAsync(db, "board")).resolves.toStrictEqual({
      ...defaultServerSettings.board,
      enableAutomaticMobileLayout: false,
    });
  });

  test("backfills legacy responsive instances once without overriding an explicit choice", async () => {
    const db = createDb();
    const boardId = createId();
    await db.insert(boards).values({ id: boardId, name: "dashboard", isPublic: false });
    await db.insert(layouts).values([
      { id: createId(), boardId, name: "Base", columnCount: 12, breakpoint: 0 },
      { id: createId(), boardId, name: "Phone", columnCount: 4, breakpoint: 480 },
    ]);
    await db.insert(serverSettings).values({
      settingKey: "board",
      value: stringify({
        homeBoardId: null,
        mobileHomeBoardId: null,
        enableStatusByDefault: true,
        forceDisableStatus: false,
      }),
    });

    await seedServerSettingsAsync(db);
    await seedServerSettingsAsync(db);

    await expect(getServerSettingByKeyAsync(db, "board")).resolves.toStrictEqual({
      ...defaultServerSettings.board,
      enableAutomaticMobileLayout: false,
    });

    await db
      .update(serverSettings)
      .set({
        value: stringify({
          ...defaultServerSettings.board,
          enableAutomaticMobileLayout: true,
        }),
      })
      .where(eq(serverSettings.settingKey, "board"));

    await seedServerSettingsAsync(db);

    await expect(getServerSettingByKeyAsync(db, "board")).resolves.toStrictEqual(defaultServerSettings.board);
  });
});
