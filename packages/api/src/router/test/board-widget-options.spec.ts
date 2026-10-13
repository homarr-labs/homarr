// @vitest-environment node

import { parse, stringify } from "superjson";
import { describe, expect, test } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { eq } from "@homarr/db";
import { boards, itemLayouts, items, layouts, sections, serverSettings, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { boardRouter } from "../board";
import { optionsRouter } from "../widgets/options";

const createBoardAsync = async () => {
  const db = createDb();
  const userId = createId();
  const boardId = createId();
  const layoutId = createId();
  const sectionId = createId();
  await db.insert(users).values({ id: userId });
  await db.insert(boards).values({ id: boardId, name: "Home", creatorId: userId });
  await db.insert(layouts).values([
    { id: createId(), name: "Mobile", boardId, columnCount: 4, breakpoint: 0, role: "mobile" },
    { id: layoutId, name: "Base", boardId, columnCount: 10, breakpoint: 768, role: "base" },
  ]);
  await db.insert(sections).values({ id: sectionId, boardId, kind: "empty", xOffset: 0, yOffset: 0 });
  const session = {
    user: { id: userId, permissions: [], colorScheme: "light" },
    expires: new Date().toISOString(),
  } satisfies Session;

  const insertAppItemAsync = async (options: Record<string, unknown>, xOffset = 0) => {
    const itemId = createId();
    await db.insert(items).values({ id: itemId, boardId, kind: "app", options: stringify(options) });
    await db.insert(itemLayouts).values({ itemId, layoutId, sectionId, xOffset, yOffset: 0, width: 1, height: 1 });
    return itemId;
  };
  const createAppBoardItem = (id: string, options: Record<string, unknown>, xOffset = 0) => ({
    id,
    kind: "app" as const,
    options,
    integrationIds: [],
    advancedOptions: {},
    layouts: [{ layoutId, sectionId, xOffset, yOffset: 0, width: 1, height: 1 }],
  });
  const readOptionsAsync = async (itemId: string) => {
    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    return parse<Record<string, unknown>>(item?.options ?? "");
  };

  return {
    db,
    boardId,
    boardSections: [{ id: sectionId, kind: "empty" as const, xOffset: 0, yOffset: 0 }],
    insertAppItemAsync,
    createAppBoardItem,
    readOptionsAsync,
    boardCaller: boardRouter.createCaller({ db, deviceType: undefined, session }),
    optionsCaller: optionsRouter.createCaller({ db, deviceType: undefined, session }),
  };
};

describe("app widget option validation", () => {
  test("addItem stores complete app options with the server ping default", async () => {
    const { db, boardId, boardCaller, readOptionsAsync } = await createBoardAsync();
    await db.insert(serverSettings).values({ settingKey: "board", value: stringify({ enableStatusByDefault: false }) });
    const appId = createId();

    const { itemId } = await boardCaller.addItem({
      boardId,
      kind: "app",
      options: { appId, showTitle: false, unknownOption: true },
      integrationIds: [],
    });

    await expect(readOptionsAsync(itemId)).resolves.toEqual({
      appId,
      openInNewTab: true,
      showTitle: false,
      descriptionDisplayMode: "hidden",
      layout: "column",
      pingEnabled: false,
    });
  });

  test("addItem rejects invalid app options without creating the item", async () => {
    const { db, boardId, boardCaller } = await createBoardAsync();

    await expect(
      boardCaller.addItem({ boardId, kind: "app", options: { layout: "diagonal" }, integrationIds: [] }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("layout") });
    await expect(db.$count(items)).resolves.toBe(0);
  });

  test("saveBoard keeps unchanged legacy app options and completes changed ones", async () => {
    const { boardId, boardSections, boardCaller, insertAppItemAsync, createAppBoardItem, readOptionsAsync } =
      await createBoardAsync();
    const legacyItemId = await insertAppItemAsync({ appId: "legacy-app" });
    const changedItemId = await insertAppItemAsync({ appId: "changed-app" }, 1);

    await boardCaller.saveBoard({
      id: boardId,
      sections: boardSections,
      items: [
        createAppBoardItem(legacyItemId, { appId: "legacy-app" }),
        createAppBoardItem(changedItemId, { appId: "changed-app", showTitle: false, layout: null }, 1),
      ],
    });

    await expect(readOptionsAsync(legacyItemId)).resolves.toEqual({ appId: "legacy-app" });
    await expect(readOptionsAsync(changedItemId)).resolves.toEqual({
      appId: "changed-app",
      openInNewTab: true,
      showTitle: false,
      descriptionDisplayMode: "hidden",
      layout: "column",
      pingEnabled: true,
    });
  });

  test("saveBoard rejects invalid app options before saving", async () => {
    const { db, boardId, boardSections, boardCaller, createAppBoardItem } = await createBoardAsync();

    await expect(
      boardCaller.saveBoard({
        id: boardId,
        sections: boardSections,
        items: [createAppBoardItem(createId(), { appId: "app", pingEnabled: "yes" })],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("pingEnabled") });
    await expect(db.$count(items)).resolves.toBe(0);
  });

  test("updateItem completes changed app options and rejects invalid ones", async () => {
    const { boardId, boardCaller, insertAppItemAsync, readOptionsAsync } = await createBoardAsync();
    const itemId = await insertAppItemAsync({ appId: "app" });
    const completeOptions = {
      appId: "app",
      openInNewTab: true,
      showTitle: false,
      descriptionDisplayMode: "hidden",
      layout: "column",
      pingEnabled: true,
    };

    await boardCaller.updateItem({ boardId, itemId, options: { appId: "app", showTitle: false } });
    await expect(readOptionsAsync(itemId)).resolves.toEqual(completeOptions);

    await expect(
      boardCaller.updateItem({ boardId, itemId, options: { appId: "app", layout: "diagonal" } }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("layout") });
    await expect(readOptionsAsync(itemId)).resolves.toEqual(completeOptions);
  });

  test("saveItemOptions rejects invalid app options", async () => {
    const { boardId, optionsCaller, insertAppItemAsync, readOptionsAsync } = await createBoardAsync();
    const itemId = await insertAppItemAsync({ appId: "app" });

    await expect(
      optionsCaller.saveItemOptions({ boardId, itemId, newOptions: { descriptionDisplayMode: "always" } }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(readOptionsAsync(itemId)).resolves.toEqual({ appId: "app" });
  });
});
