// @vitest-environment node

import { parse, stringify } from "superjson";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { eq } from "@homarr/db";
import {
  boardUserPermissions,
  boards,
  integrationItems,
  integrations,
  itemLayouts,
  items,
  users,
} from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { boardRouter } from "../board";

const originalOptions = { presentation: "entities", title: "Bedroom", blocks: ["areas:bedroom"] };

const createFixtureAsync = async () => {
  const db = createDb();
  await db.insert(users).values([{ id: "owner" }, { id: "viewer" }]);
  const session: Session = {
    user: { id: "owner", permissions: ["board-create"], colorScheme: "light" },
    expires: new Date().toISOString(),
  };
  const caller = boardRouter.createCaller({ db, session, deviceType: undefined });
  const { boardId } = await caller.createBoard({ name: "LAB", columnCount: 12, isPublic: false });
  const boardLayouts = await db.query.layouts.findMany();
  const section = await db.query.sections.findFirst();
  if (!section) throw new Error("Missing fixture section");
  await db.insert(items).values([
    { id: "item-a", boardId, kind: "smartHome-controls", options: stringify(originalOptions) },
    { id: "item-b", boardId, kind: "notebook", options: stringify({ content: "Keep this" }) },
  ]);
  await db.insert(itemLayouts).values(
    boardLayouts.flatMap((layout) => [
      { itemId: "item-a", layoutId: layout.id, sectionId: section.id, xOffset: 0, yOffset: 0, width: 2, height: 3 },
      { itemId: "item-b", layoutId: layout.id, sectionId: section.id, xOffset: 0, yOffset: 4, width: 2, height: 2 },
    ]),
  );
  await db.insert(integrations).values({ id: "ha", kind: "homeAssistant", name: "HA", url: "http://fixture.invalid" });
  await db.insert(integrationItems).values({ itemId: "item-a", integrationId: "ha" });
  await db.insert(boardUserPermissions).values({ boardId, userId: "viewer", permission: "view" });
  const viewer = boardRouter.createCaller({
    db,
    session: { ...session, user: { ...session.user, id: "viewer", permissions: [] } },
    deviceType: undefined,
  });
  return { db, boardId, caller, viewer, session };
};

afterEach(() => vi.restoreAllMocks());

describe("targeted board item management", () => {
  test("pages stable item IDs and reads one item's options, bindings and placements", async () => {
    const { db, boardId, caller, viewer } = await createFixtureAsync();
    await db.insert(boards).values({ id: "other-board", name: "Other", creatorId: "owner" });
    await db.insert(items).values({ id: "item-0", boardId: "other-board", kind: "notebook" });
    const first = await viewer.getItems({ boardId, limit: 1 });
    expect(first.items.map(({ id }) => id)).toEqual(["item-a"]);
    expect(first.nextCursor).toBe("item-a");
    const second = await viewer.getItems({ boardId, cursor: first.nextCursor ?? undefined, limit: 1 });
    expect(second.items.map(({ id }) => id)).toEqual(["item-b"]);
    expect(second.nextCursor).toBeNull();
    expect((await caller.getItems({ boardId, itemId: "item-a" })).items[0]).toMatchObject({
      id: "item-a",
      options: originalOptions,
      integrationIds: ["ha"],
      layouts: expect.any(Array),
    });
    expect((await caller.getItems({ boardId, itemId: "item-0" })).items).toEqual([]);
    const anonymous = boardRouter.createCaller({ db, session: null, deviceType: undefined });
    await expect(anonymous.getItems({ boardId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("patches presentation without changing other options, bindings, placements or items", async () => {
    const { db, boardId, caller, viewer } = await createFixtureAsync();
    const placements = await db.query.itemLayouts.findMany();
    const bindings = await db.query.integrationItems.findMany();
    const otherItem = await db.query.items.findFirst({ where: eq(items.id, "item-b") });
    await expect(
      viewer.updateItemOptions({ boardId, itemId: "item-a", options: { presentation: "controlPanel" } }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await caller.updateItemOptions({ boardId, itemId: "item-a", options: { presentation: "controlPanel" } });
    const patched = await db.query.items.findFirst({ where: eq(items.id, "item-a") });
    expect(parse(patched?.options ?? "{}")).toEqual({ ...originalOptions, presentation: "controlPanel" });
    expect(await db.query.itemLayouts.findMany()).toEqual(placements);
    expect(await db.query.integrationItems.findMany()).toEqual(bindings);
    expect(await db.query.items.findFirst({ where: eq(items.id, "item-b") })).toEqual(otherItem);
  });

  test.each([
    { field: "options", change: { options: stringify({ ...originalOptions, title: "Concurrent edit" }) } },
    { field: "kind", change: { kind: "customApi" as const } },
  ])("rejects concurrent $field changes before writing the patch", async ({ change }) => {
    const { db, boardId, caller } = await createFixtureAsync();
    const update = db.update.bind(db);
    // Simulate another board save after the patch's read and guard, immediately before its write.
    vi.spyOn(db, "update").mockImplementationOnce((table) => {
      update(items).set(change).where(eq(items.id, "item-a")).run();
      return update(table);
    });
    await expect(
      caller.updateItemOptions({ boardId, itemId: "item-a", options: { presentation: "controlPanel" } }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const stored = await db.query.items.findFirst({ where: eq(items.id, "item-a") });
    expect(stored).toMatchObject(change);
    expect(parse<Record<string, unknown>>(stored?.options ?? "{}").presentation).toBe("entities");
  });

  test("retains the Custom Widget admin and timetable URL guards", async () => {
    const { db, boardId, caller, session } = await createFixtureAsync();
    await db
      .update(items)
      .set({ kind: "customApi", options: stringify({ definitionId: "widget", configuration: {} }) })
      .where(eq(items.id, "item-a"));
    await expect(
      caller.updateItemOptions({ boardId, itemId: "item-a", options: { configuration: { enabled: true } } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const admin = boardRouter.createCaller({
      db,
      session: { ...session, user: { ...session.user, permissions: ["admin"] } },
      deviceType: undefined,
    });
    await expect(
      admin.updateItemOptions({ boardId, itemId: "item-a", options: { configuration: { enabled: true } } }),
    ).resolves.toEqual({ itemId: "item-a" });
    await db
      .update(items)
      .set({ kind: "timetable", options: stringify({}) })
      .where(eq(items.id, "item-a"));
    await expect(
      caller.updateItemOptions({ boardId, itemId: "item-a", options: { baseUrl: "http://127.0.0.1/private" } }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("deletes only the selected item's placements and bindings within the requested board", async () => {
    const { db, boardId, caller, viewer } = await createFixtureAsync();
    const otherPlacements = await db.query.itemLayouts.findMany({
      where: eq(itemLayouts.itemId, "item-b"),
      orderBy: (table, { asc }) => asc(table.layoutId),
    });
    await db.insert(boards).values({ id: "other-board", name: "Other", creatorId: "owner" });
    await expect(caller.deleteItem({ boardId: "other-board", itemId: "item-a" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(viewer.deleteItem({ boardId, itemId: "item-a" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await caller.deleteItem({ boardId, itemId: "item-a" });
    expect((await db.query.items.findMany()).map(({ id }) => id)).toEqual(["item-b"]);
    expect(await db.query.itemLayouts.findMany({ orderBy: (table, { asc }) => asc(table.layoutId) })).toEqual(
      otherPlacements,
    );
    expect(await db.query.integrationItems.findMany()).toEqual([]);
  });
});
