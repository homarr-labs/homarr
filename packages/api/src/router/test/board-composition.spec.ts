import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import { createDb } from "@homarr/db/test";
import { boards, itemLayouts, layouts, sections, users } from "@homarr/db/schema";
import type { GroupPermissionKey } from "@homarr/definitions";

import { boardRouter } from "../board";
import { expectToBeDefined } from "./helper";

const creatorId = createId();
const defaultSession = {
  user: {
    id: creatorId,
    permissions: ["board-create"] satisfies GroupPermissionKey[],
    colorScheme: "light",
  },
  expires: new Date().toISOString(),
} satisfies Session;

vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

const createCaller = (db: Database) => boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

/** Creates a board owned by the session user with a single empty section and one layout */
const createBoardAsync = async (db: Database, columnCount = 12) => {
  const boardId = createId();
  const sectionId = createId();
  const layoutId = createId();

  await db.insert(users).values({ id: creatorId });
  await db.insert(boards).values({ id: boardId, name: `board-${boardId}`, creatorId });
  await db.insert(sections).values({ id: sectionId, boardId, kind: "empty", xOffset: 0, yOffset: 0 });
  await db.insert(layouts).values({ id: layoutId, boardId, name: "Base", columnCount, breakpoint: 0 });

  return { boardId, sectionId, layoutId };
};

const getLayoutOfAsync = async (db: Database, itemId: string) =>
  expectToBeDefined(await db.query.itemLayouts.findFirst({ where: eq(itemLayouts.itemId, itemId) }));

describe("addItem should place items with the requested size", () => {
  test("should keep placing items automatically when no placement is given", async () => {
    // Arrange
    const db = createDb();
    const { boardId, sectionId, layoutId } = await createBoardAsync(db);
    const caller = createCaller(db);

    // Act
    const { itemId } = await caller.addItem({ boardId, kind: "clock", options: {}, integrationIds: [] });

    // Assert
    const layout = await getLayoutOfAsync(db, itemId);
    expect(layout).toMatchObject({ sectionId, layoutId, xOffset: 0, yOffset: 0, width: 1, height: 1 });
  });

  test("should use the default size of the widget kind", async () => {
    // Arrange
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);

    // Act
    const { itemId } = await caller.addItem({ boardId, kind: "uptimeKuma", options: {}, integrationIds: [] });

    // Assert
    const layout = await getLayoutOfAsync(db, itemId);
    expect(layout).toMatchObject({ width: 2, height: 3 });
  });

  test("should apply an explicit size and position", async () => {
    // Arrange
    const db = createDb();
    const { boardId, sectionId } = await createBoardAsync(db);
    const caller = createCaller(db);

    // Act
    const { itemId } = await caller.addItem({
      boardId,
      kind: "clock",
      options: {},
      integrationIds: [],
      sectionId,
      xOffset: 4,
      yOffset: 2,
      width: 6,
      height: 5,
    });

    // Assert
    const layout = await getLayoutOfAsync(db, itemId);
    expect(layout).toMatchObject({ sectionId, xOffset: 4, yOffset: 2, width: 6, height: 5 });
  });

  test("should place an item with an explicit size at the next free position", async () => {
    // Arrange
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);
    await caller.addItem({ boardId, kind: "clock", options: {}, integrationIds: [], width: 4, height: 2 });

    // Act
    const { itemId } = await caller.addItem({
      boardId,
      kind: "clock",
      options: {},
      integrationIds: [],
      width: 4,
      height: 2,
    });

    // Assert
    const layout = await getLayoutOfAsync(db, itemId);
    expect(layout).toMatchObject({ xOffset: 4, yOffset: 0, width: 4, height: 2 });
  });

  test("should reject a position that is already taken", async () => {
    // Arrange
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);
    await caller.addItem({ boardId, kind: "clock", options: {}, integrationIds: [], width: 4, height: 4 });

    // Act
    const actAsync = async () =>
      await caller.addItem({
        boardId,
        kind: "clock",
        options: {},
        integrationIds: [],
        xOffset: 2,
        yOffset: 2,
        width: 4,
        height: 4,
      });

    // Assert
    await expect(actAsync()).rejects.toThrowError("Position is already taken");
  });

  test("should reject an explicit layout placement that exceeds the column count", async () => {
    // Arrange
    const db = createDb();
    const { boardId, sectionId, layoutId } = await createBoardAsync(db, 6);
    const caller = createCaller(db);

    // Act
    const actAsync = async () =>
      await caller.addItem({
        boardId,
        kind: "clock",
        options: {},
        integrationIds: [],
        layouts: [{ layoutId, sectionId, xOffset: 3, yOffset: 0, width: 5, height: 1 }],
      });

    // Assert
    await expect(actAsync()).rejects.toThrowError("exceeds the 6 columns");
  });

  test("should clamp the shorthand size to the column count of narrow layouts", async () => {
    // Arrange
    const db = createDb();
    const { boardId, layoutId } = await createBoardAsync(db, 12);
    const smallLayoutId = createId();
    await db.insert(layouts).values({ id: smallLayoutId, boardId, name: "Small", columnCount: 4, breakpoint: 768 });
    const caller = createCaller(db);

    // Act
    const { itemId } = await caller.addItem({
      boardId,
      kind: "clock",
      options: {},
      integrationIds: [],
      width: 8,
      height: 3,
    });

    // Assert
    const allLayouts = await db.query.itemLayouts.findMany({ where: eq(itemLayouts.itemId, itemId) });
    expect(allLayouts.find((layout) => layout.layoutId === layoutId)?.width).toBe(8);
    expect(allLayouts.find((layout) => layout.layoutId === smallLayoutId)?.width).toBe(4);
  });
});

describe("updateItem should move and resize items", () => {
  test("should keep the current position when only the size changes", async () => {
    // Arrange
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);
    const { itemId } = await caller.addItem({
      boardId,
      kind: "clock",
      options: {},
      integrationIds: [],
      xOffset: 2,
      yOffset: 3,
      width: 2,
      height: 2,
    });

    // Act
    await caller.updateItem({ boardId, itemId, width: 5, height: 4 });

    // Assert
    const layout = await getLayoutOfAsync(db, itemId);
    expect(layout).toMatchObject({ xOffset: 2, yOffset: 3, width: 5, height: 4 });
  });

  test("should update the options without touching the placement", async () => {
    // Arrange
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);
    const { itemId } = await caller.addItem({
      boardId,
      kind: "clock",
      options: { is24HourFormat: false },
      integrationIds: [],
      xOffset: 1,
      yOffset: 1,
    });

    // Act
    await caller.updateItem({ boardId, itemId, options: { is24HourFormat: true } });

    // Assert
    const items = await caller.getItems({ id: boardId });
    expect(items.at(0)?.options).toStrictEqual({ is24HourFormat: true });
    expect(items.at(0)?.layouts.at(0)).toMatchObject({ xOffset: 1, yOffset: 1 });
  });

  test("should keep the section of the item when a layout entry does not name one", async () => {
    // Arrange
    const db = createDb();
    const { boardId, layoutId } = await createBoardAsync(db);
    const caller = createCaller(db);
    const { sectionId } = await caller.addSection({ boardId, kind: "category", name: "Media", yOffset: 1 });
    const { itemId } = await caller.addItem({ boardId, kind: "clock", options: {}, integrationIds: [], sectionId });

    // Act
    await caller.updateItem({
      boardId,
      itemId,
      layouts: [{ layoutId, xOffset: 0, yOffset: 0, width: 2, height: 2 }],
    });

    // Assert
    const layout = await getLayoutOfAsync(db, itemId);
    expect(layout).toMatchObject({ sectionId, width: 2, height: 2 });
  });

  test("should reject a layout entry that does not belong to the board", async () => {
    // Arrange
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);
    const { itemId } = await caller.addItem({ boardId, kind: "clock", options: {}, integrationIds: [] });

    // Act
    const actAsync = async () =>
      await caller.updateItem({
        boardId,
        itemId,
        layouts: [{ layoutId: "not-a-layout", xOffset: 0, yOffset: 0, width: 2, height: 2 }],
      });

    // Assert
    await expect(actAsync()).rejects.toThrowError("do not belong to this board");
  });

  test("should reject moving an item onto another one", async () => {
    // Arrange
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);
    await caller.addItem({ boardId, kind: "clock", options: {}, integrationIds: [], xOffset: 0, yOffset: 0 });
    const { itemId } = await caller.addItem({
      boardId,
      kind: "clock",
      options: {},
      integrationIds: [],
      xOffset: 4,
      yOffset: 0,
    });

    // Act
    const actAsync = async () => await caller.updateItem({ boardId, itemId, xOffset: 0, yOffset: 0 });

    // Assert
    await expect(actAsync()).rejects.toThrowError("Position is already taken");
  });

  test("should not update options when a placement is rejected", async () => {
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);
    await caller.addItem({ boardId, kind: "clock", options: {}, integrationIds: [], xOffset: 0, yOffset: 0 });
    const { itemId } = await caller.addItem({
      boardId,
      kind: "clock",
      options: { is24HourFormat: false },
      integrationIds: [],
      xOffset: 4,
      yOffset: 0,
    });

    await expect(
      caller.updateItem({ boardId, itemId, options: { is24HourFormat: true }, xOffset: 0, yOffset: 0 }),
    ).rejects.toThrowError("Position is already taken");

    expect((await caller.getItems({ id: boardId })).find((item) => item.id === itemId)?.options).toStrictEqual({
      is24HourFormat: false,
    });
  });
});

describe("sections should be manageable through the api", () => {
  test("should add a category section and place an item inside it", async () => {
    // Arrange
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);

    // Act
    const { sectionId } = await caller.addSection({ boardId, kind: "category", name: "Media", yOffset: 1 });
    const { itemId } = await caller.addItem({
      boardId,
      kind: "clock",
      options: {},
      integrationIds: [],
      sectionId,
      width: 3,
      height: 2,
    });

    // Assert
    const layout = await getLayoutOfAsync(db, itemId);
    expect(layout).toMatchObject({ sectionId, width: 3, height: 2 });

    const boardSections = await caller.getSections({ id: boardId });
    expect(boardSections).toHaveLength(2);
    expect(boardSections.find((section) => section.id === sectionId)?.name).toBe("Media");
  });

  test("should add a dynamic section with an explicit size inside the empty section", async () => {
    // Arrange
    const db = createDb();
    const { boardId, sectionId: parentSectionId, layoutId } = await createBoardAsync(db);
    const caller = createCaller(db);

    // Act
    const { sectionId } = await caller.addSection({
      boardId,
      kind: "dynamic",
      parentSectionId,
      xOffset: 2,
      yOffset: 1,
      width: 5,
      height: 3,
    });

    // Assert
    const dynamicSection = expectToBeDefined(
      (await caller.getSections({ id: boardId })).find((section) => section.id === sectionId),
    );
    expect(dynamicSection.kind).toBe("dynamic");
    expect(dynamicSection.layouts.at(0)).toMatchObject({
      layoutId,
      parentSectionId,
      xOffset: 2,
      yOffset: 1,
      width: 5,
      height: 3,
    });
  });

  test("should reject an item that overlaps a dynamic section", async () => {
    // Arrange
    const db = createDb();
    const { boardId, sectionId: parentSectionId } = await createBoardAsync(db);
    const caller = createCaller(db);
    await caller.addSection({ boardId, kind: "dynamic", parentSectionId, xOffset: 0, yOffset: 0, width: 4, height: 2 });

    // Act
    const actAsync = async () =>
      await caller.addItem({
        boardId,
        kind: "clock",
        options: {},
        integrationIds: [],
        sectionId: parentSectionId,
        xOffset: 1,
        yOffset: 1,
      });

    // Assert
    await expect(actAsync()).rejects.toThrowError("Position is already taken");
  });

  test("should bound items inside a dynamic section by the width of that section", async () => {
    // Arrange
    const db = createDb();
    const { boardId, sectionId: parentSectionId, layoutId } = await createBoardAsync(db, 12);
    const caller = createCaller(db);
    const { sectionId } = await caller.addSection({
      boardId,
      kind: "dynamic",
      parentSectionId,
      xOffset: 0,
      yOffset: 0,
      width: 2,
      height: 4,
    });

    // Act
    const actAsync = async () =>
      await caller.addItem({
        boardId,
        kind: "clock",
        options: {},
        integrationIds: [],
        layouts: [{ layoutId, sectionId, xOffset: 8, yOffset: 0, width: 4, height: 1 }],
      });

    // Assert
    await expect(actAsync()).rejects.toThrowError("exceeds the 2 columns");
  });

  test("should clamp automatic placement to the width of a dynamic section", async () => {
    // Arrange
    const db = createDb();
    const { boardId, sectionId: parentSectionId } = await createBoardAsync(db, 12);
    const caller = createCaller(db);
    const { sectionId } = await caller.addSection({
      boardId,
      kind: "dynamic",
      parentSectionId,
      xOffset: 0,
      yOffset: 0,
      width: 3,
      height: 4,
    });

    // Act
    const { itemId } = await caller.addItem({
      boardId,
      kind: "clock",
      options: {},
      integrationIds: [],
      sectionId,
      width: 8,
      height: 1,
    });

    // Assert
    const layout = await getLayoutOfAsync(db, itemId);
    expect(layout).toMatchObject({ sectionId, xOffset: 0, width: 3 });
  });

  test("should ignore a name patch on a section that has none", async () => {
    // Arrange
    const db = createDb();
    const { boardId, sectionId } = await createBoardAsync(db);
    const caller = createCaller(db);

    // Act
    const actAsync = async () => await caller.updateSection({ boardId, sectionId, name: "ignored" });

    // Assert
    await expect(actAsync()).resolves.toBeUndefined();
  });

  test("should not remove the last empty section", async () => {
    // Arrange
    const db = createDb();
    const { boardId, sectionId } = await createBoardAsync(db);
    const caller = createCaller(db);

    // Act
    const actAsync = async () => await caller.removeSection({ boardId, sectionId });

    // Assert
    await expect(actAsync()).rejects.toThrowError("last empty section");
  });

  test("should remove a section together with its items", async () => {
    // Arrange
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);
    const { sectionId } = await caller.addSection({ boardId, kind: "category", name: "Media", yOffset: 1 });
    await caller.addItem({ boardId, kind: "clock", options: {}, integrationIds: [], sectionId });

    // Act
    await caller.removeSection({ boardId, sectionId });

    // Assert
    expect(await caller.getSections({ id: boardId })).toHaveLength(1);
    expect(await caller.getItems({ id: boardId })).toHaveLength(0);
  });

  test("should remove an item when any responsive placement loses its section", async () => {
    const db = createDb();
    const { boardId, sectionId: mainSectionId, layoutId } = await createBoardAsync(db);
    const mobileLayoutId = createId();
    await db.insert(layouts).values({
      id: mobileLayoutId,
      boardId,
      name: "Mobile",
      columnCount: 4,
      breakpoint: 768,
    });
    const caller = createCaller(db);
    const { sectionId } = await caller.addSection({ boardId, kind: "category", name: "Media", yOffset: 1 });
    await caller.addItem({
      boardId,
      kind: "clock",
      options: {},
      integrationIds: [],
      layouts: [
        { layoutId, sectionId, xOffset: 0, yOffset: 0, width: 1, height: 1 },
        { layoutId: mobileLayoutId, sectionId: mainSectionId, xOffset: 0, yOffset: 0, width: 1, height: 1 },
      ],
    });

    await caller.removeSection({ boardId, sectionId });

    expect(await caller.getItems({ id: boardId })).toHaveLength(0);
  });

  test("should reject a dynamic section nesting cycle without updating options", async () => {
    const db = createDb();
    const { boardId, sectionId: mainSectionId } = await createBoardAsync(db);
    const caller = createCaller(db);
    const { sectionId: parentSectionId } = await caller.addSection({
      boardId,
      kind: "dynamic",
      parentSectionId: mainSectionId,
      options: { title: "original" },
    });
    const { sectionId: childSectionId } = await caller.addSection({
      boardId,
      kind: "dynamic",
      parentSectionId,
    });

    await expect(
      caller.updateSection({
        boardId,
        sectionId: parentSectionId,
        parentSectionId: childSectionId,
        options: { title: "changed" },
      }),
    ).rejects.toThrowError("cannot form a cycle");

    const section = (await caller.getSections({ id: boardId })).find(({ id }) => id === parentSectionId);
    expect(section?.options).toMatchObject({ title: "original" });
  });
});

describe("layouts should be readable and replaceable through the api", () => {
  test("should return the created layouts after saving", async () => {
    // Arrange
    const db = createDb();
    const { boardId, layoutId } = await createBoardAsync(db);
    const caller = createCaller(db);

    // Act
    const result = await caller.saveLayouts({
      id: boardId,
      layouts: [
        { id: layoutId, name: "Base", columnCount: 20, breakpoint: 0 },
        { id: "new-layout-reference", name: "Small", columnCount: 4, breakpoint: 768 },
      ],
    });

    // Assert
    expect(result).toHaveLength(2);
    expect(result.at(0)).toMatchObject({ name: "Base", columnCount: 20, breakpoint: 0 });
    expect(result.at(1)).toMatchObject({ name: "Small", columnCount: 4, breakpoint: 768 });
    expect(await caller.getLayouts({ id: boardId })).toHaveLength(2);
  });
});

describe("export and import should round trip a board", () => {
  test("should recreate an identical board under a new name", async () => {
    // Arrange
    const db = createDb();
    const { boardId, sectionId } = await createBoardAsync(db);
    const caller = createCaller(db);
    await caller.addItem({
      boardId,
      kind: "clock",
      options: { is24HourFormat: true },
      integrationIds: [],
      sectionId,
      xOffset: 3,
      yOffset: 1,
      width: 6,
      height: 4,
    });
    const document = await caller.exportBoard({ id: boardId });

    // Act
    const { boardId: importedBoardId } = await caller.importBoard({ ...document, name: "imported" });

    // Assert
    expect(importedBoardId).not.toBe(boardId);

    const imported = await caller.getBoardById({ id: importedBoardId });
    expect(imported.name).toBe("imported");
    expect(imported.layouts).toHaveLength(1);
    expect(imported.sections).toHaveLength(1);
    expect(imported.items).toHaveLength(1);
    expect(imported.items.at(0)?.options).toStrictEqual({ is24HourFormat: true });
    expect(imported.items.at(0)?.layouts.at(0)).toMatchObject({
      xOffset: 3,
      yOffset: 1,
      width: 6,
      height: 4,
      sectionId: imported.sections.at(0)?.id,
    });
  });

  test("should be importable twice because ids are only references", async () => {
    // Arrange
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);
    await caller.addItem({ boardId, kind: "clock", options: {}, integrationIds: [], width: 2, height: 2 });
    const document = await caller.exportBoard({ id: boardId });

    // Act
    const first = await caller.importBoard({ ...document, name: "copy-one" });
    const second = await caller.importBoard({ ...document, name: "copy-two" });

    // Assert
    expect(first.boardId).not.toBe(second.boardId);
    expect(await caller.getItems({ id: first.boardId })).toHaveLength(1);
    expect(await caller.getItems({ id: second.boardId })).toHaveLength(1);
  });

  test("should keep the existing board when onConflict is skip", async () => {
    // Arrange
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);
    const document = await caller.exportBoard({ id: boardId });

    // Act
    const result = await caller.importBoard({ ...document, onConflict: "skip" });

    // Assert
    expect(result).toStrictEqual({ boardId, created: false });
    expect(await db.$count(boards)).toBe(1);
  });

  test("should not expose a private board id through onConflict skip", async () => {
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const ownerCaller = createCaller(db);
    const document = await ownerCaller.exportBoard({ id: boardId });
    const outsiderId = createId();
    await db.insert(users).values({ id: outsiderId });
    const outsiderCaller = boardRouter.createCaller({
      db,
      deviceType: undefined,
      session: {
        ...defaultSession,
        user: { ...defaultSession.user, id: outsiderId },
      },
    });

    await expect(outsiderCaller.importBoard({ ...document, onConflict: "skip" })).rejects.toThrowError();
  });

  test("should exchange the content but keep the board when onConflict is replace", async () => {
    // Arrange
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);
    await caller.addItem({ boardId, kind: "clock", options: {}, integrationIds: [], width: 3, height: 3 });
    const document = await caller.exportBoard({ id: boardId });
    await caller.addItem({ boardId, kind: "clock", options: {}, integrationIds: [], width: 1, height: 1 });
    await db.update(users).set({ homeBoardId: boardId }).where(eq(users.id, creatorId));

    // Act
    const result = await caller.importBoard({ ...document, onConflict: "replace" });

    // Assert
    expect(result).toStrictEqual({ boardId, created: false });
    expect(await db.$count(boards)).toBe(1);

    // The board that was added after the export is gone again
    const items = await caller.getItems({ id: boardId });
    expect(items).toHaveLength(1);
    expect(items.at(0)?.layouts.at(0)).toMatchObject({ width: 3, height: 3 });

    // Everything pointing at the board survives because the board itself is never deleted
    const user = expectToBeDefined(await db.query.users.findFirst({ where: eq(users.id, creatorId) }));
    expect(user.homeBoardId).toBe(boardId);
  });

  test("should not touch the existing board when the document is invalid", async () => {
    // Arrange
    const db = createDb();
    const { boardId } = await createBoardAsync(db);
    const caller = createCaller(db);
    await caller.addItem({ boardId, kind: "clock", options: {}, integrationIds: [], width: 3, height: 3 });
    const document = await caller.exportBoard({ id: boardId });

    // Act
    const actAsync = async () =>
      await caller.importBoard({
        ...document,
        onConflict: "replace",
        items: document.items.map((item) => ({
          ...item,
          layouts: item.layouts.map((layout) => ({ ...layout, sectionId: "typo-in-the-document" })),
        })),
      });

    // Assert
    await expect(actAsync()).rejects.toThrowError("Unknown section reference");
    expect(await db.$count(boards)).toBe(1);
    expect(await caller.getItems({ id: boardId })).toHaveLength(1);
  });

  test("should bound a nested dynamic section by its parent even when listed first", async () => {
    // Arrange
    const db = createDb();
    await db.insert(users).values({ id: creatorId });
    const caller = createCaller(db);

    // Act
    const actAsync = async () =>
      await caller.importBoard({
        name: "nested",
        layouts: [{ id: "base", name: "Base", columnCount: 12, breakpoint: 0 }],
        sections: [
          // The child comes before the parent it is nested in
          {
            id: "child",
            kind: "dynamic",
            layouts: [{ layoutId: "base", parentSectionId: "parent", xOffset: 0, yOffset: 0, width: 3, height: 2 }],
          },
          { id: "main", kind: "empty", yOffset: 0 },
          {
            id: "parent",
            kind: "dynamic",
            layouts: [{ layoutId: "base", parentSectionId: "main", xOffset: 0, yOffset: 0, width: 2, height: 4 }],
          },
        ],
      });

    // Assert
    await expect(actAsync()).rejects.toThrowError("exceeds the 2 columns");
  });

  test("should accept a column count above what the board settings offer", async () => {
    // Arrange
    const db = createDb();
    await db.insert(users).values({ id: creatorId });
    const caller = createCaller(db);

    // Act, boards created by older versions or the oldmarr importer can have more columns
    const { boardId } = await caller.importBoard({
      name: "wide",
      layouts: [{ id: "base", name: "Base", columnCount: 30, breakpoint: 0 }],
      sections: [{ id: "main", kind: "empty", yOffset: 0 }],
      items: [{ kind: "clock", sectionId: "main", xOffset: 25, yOffset: 0, width: 5, height: 1 }],
    });

    // Assert
    expect(await caller.getLayouts({ id: boardId })).toMatchObject([{ columnCount: 30 }]);
    const items = await caller.getItems({ id: boardId });
    expect(items.at(0)?.layouts.at(0)).toMatchObject({ xOffset: 25, width: 5 });
  });

  test("should accept sections nested into each other on different breakpoints", async () => {
    // Arrange, this is reachable through the interface because nesting is stored per layout
    const db = createDb();
    await db.insert(users).values({ id: creatorId });
    const caller = createCaller(db);

    // Act
    const { boardId } = await caller.importBoard({
      name: "crossnested",
      layouts: [
        { id: "desktop", name: "Desktop", columnCount: 12, breakpoint: 0 },
        { id: "mobile", name: "Mobile", columnCount: 4, breakpoint: 768 },
      ],
      sections: [
        { id: "main", kind: "empty", yOffset: 0 },
        {
          id: "a",
          kind: "dynamic",
          layouts: [
            { layoutId: "desktop", parentSectionId: "b", xOffset: 0, yOffset: 0, width: 2, height: 2 },
            { layoutId: "mobile", parentSectionId: "main", xOffset: 0, yOffset: 0, width: 4, height: 4 },
          ],
        },
        {
          id: "b",
          kind: "dynamic",
          layouts: [
            { layoutId: "desktop", parentSectionId: "main", xOffset: 0, yOffset: 0, width: 6, height: 6 },
            { layoutId: "mobile", parentSectionId: "a", xOffset: 0, yOffset: 0, width: 2, height: 2 },
          ],
        },
      ],
    });

    // Assert
    const sections = await caller.getSections({ id: boardId });
    expect(sections).toHaveLength(3);
    expect(sections.filter(({ kind }) => kind === "dynamic")).toHaveLength(2);
  });

  test("should report a typo in a parent reference as an unknown reference", async () => {
    // Arrange
    const db = createDb();
    await db.insert(users).values({ id: creatorId });
    const caller = createCaller(db);

    // Act
    const actAsync = async () =>
      await caller.importBoard({
        name: "typo",
        layouts: [{ id: "base", name: "Base", columnCount: 12, breakpoint: 0 }],
        sections: [
          { id: "main", kind: "empty", yOffset: 0 },
          {
            id: "child",
            kind: "dynamic",
            layouts: [{ layoutId: "base", parentSectionId: "mian", xOffset: 0, yOffset: 0, width: 2, height: 2 }],
          },
        ],
      });

    // Assert
    await expect(actAsync()).rejects.toThrowError("Unknown section reference 'mian'");
  });

  test("should reject a same-layout dynamic section cycle", async () => {
    const db = createDb();
    await db.insert(users).values({ id: creatorId });
    const caller = createCaller(db);

    await expect(
      caller.importBoard({
        name: "cycle",
        layouts: [{ id: "base", name: "Base", columnCount: 12, breakpoint: 0 }],
        sections: [
          {
            id: "a",
            kind: "dynamic",
            layouts: [{ layoutId: "base", parentSectionId: "b", xOffset: 0, yOffset: 0, width: 2, height: 2 }],
          },
          {
            id: "b",
            kind: "dynamic",
            layouts: [{ layoutId: "base", parentSectionId: "a", xOffset: 0, yOffset: 0, width: 2, height: 2 }],
          },
        ],
      }),
    ).rejects.toThrowError("cannot form a cycle");
  });

  test("should import a category-only board when every placement names a section", async () => {
    const db = createDb();
    await db.insert(users).values({ id: creatorId });
    const caller = createCaller(db);

    const { boardId } = await caller.importBoard({
      name: "category-only",
      layouts: [{ id: "base", name: "Base", columnCount: 12, breakpoint: 0 }],
      sections: [{ id: "media", kind: "category", name: "Media", yOffset: 0 }],
      items: [
        {
          kind: "clock",
          layouts: [{ layoutId: "base", sectionId: "media", xOffset: 0, yOffset: 0, width: 2, height: 2 }],
        },
      ],
    });

    expect(await caller.getItems({ id: boardId })).toHaveLength(1);
  });

  test("should reject a grid that is larger than the documented limit", async () => {
    // Arrange
    const db = createDb();
    await db.insert(users).values({ id: creatorId });
    const caller = createCaller(db);

    // Act, laying out a grid costs work per used cell, so the size a request may ask for is capped
    const actAsync = async () =>
      await caller.importBoard({
        name: "huge",
        layouts: [{ id: "base", name: "Base", columnCount: 32767, breakpoint: 0 }],
        sections: [{ id: "main", kind: "empty", yOffset: 0 }],
        items: [{ kind: "clock" }],
      });

    // Assert
    await expect(actAsync()).rejects.toThrowError("Grid values must not exceed 256");
  });

  test("should place an item on a large board without scanning every cell", async () => {
    // Arrange, a wide board that is filled row by row is the worst case for the placement scan
    const db = createDb();
    await db.insert(users).values({ id: creatorId });
    const caller = createCaller(db);
    const columnCount = 256;
    const rows = 200;

    const { boardId } = await caller.importBoard({
      name: "wide",
      layouts: [{ id: "base", name: "Base", columnCount, breakpoint: 0 }],
      sections: [{ id: "main", kind: "empty", yOffset: 0 }],
      items: Array.from({ length: rows }, (_, index) => ({
        kind: "clock" as const,
        layouts: [{ layoutId: "base", sectionId: "main", xOffset: 0, yOffset: index, width: columnCount, height: 1 }],
      })),
    });

    // Act
    const { itemId } = await caller.addItem({ boardId, kind: "clock", options: {}, integrationIds: [] });

    // Assert, the item goes right below the filled rows and getting there stays cheap.
    const layout = await getLayoutOfAsync(db, itemId);
    expect(layout).toMatchObject({ xOffset: 0, yOffset: rows, width: 1, height: 1 });
  });

  test("should reject unknown references inside the document", async () => {
    // Arrange
    const db = createDb();
    await db.insert(users).values({ id: creatorId });
    const caller = createCaller(db);

    // Act
    const actAsync = async () =>
      await caller.importBoard({
        name: "broken",
        isPublic: false,
        layouts: [{ id: "base", name: "Base", columnCount: 12, breakpoint: 0 }],
        sections: [{ id: "main", kind: "empty", yOffset: 0 }],
        items: [
          {
            kind: "clock",
            options: {},
            integrationIds: [],
            layouts: [{ layoutId: "does-not-exist", sectionId: "main", xOffset: 0, yOffset: 0, width: 1, height: 1 }],
          },
        ],
      });

    // Assert
    await expect(actAsync()).rejects.toThrowError("Unknown layout reference");
  });
});
