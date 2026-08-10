// @vitest-environment node

import { parse } from "superjson";
import { describe, expect, test } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { eq as dbEq } from "@homarr/db";
import {
  boards,
  integrations,
  integrationUserPermissions,
  items,
  layouts,
  sectionLayouts,
  sections,
  users,
} from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { boardRouter } from "../board";

const createBoardCallerAsync = async () => {
  const db = createDb();
  const userId = createId();
  const boardId = createId();
  await db.insert(users).values({ id: userId });
  await db.insert(boards).values({ id: boardId, name: "Home", creatorId: userId });
  const layoutId = createId();
  await db.insert(layouts).values({
    id: layoutId,
    name: "Base",
    boardId,
    columnCount: 12,
    breakpoint: 0,
  });
  const sectionId = createId();
  await db.insert(sections).values({ id: sectionId, boardId, kind: "empty", xOffset: 0, yOffset: 0 });
  const session = {
    user: { id: userId, permissions: [], colorScheme: "light" },
    expires: new Date().toISOString(),
  } satisfies Session;
  return {
    db,
    userId,
    boardId,
    layoutId,
    sectionId,
    caller: boardRouter.createCaller({ db, deviceType: undefined, session }),
  };
};

describe("board.addItem", () => {
  test("preserves configured notebook content when placing the widget", async () => {
    const { db, boardId, caller } = await createBoardCallerAsync();
    const content = "<h2>Self-host Plex</h2><p>Install Docker and configure your media volumes.</p>";

    const result = await caller.addItem({
      boardId,
      kind: "notebook",
      options: { content, showToolbar: true, allowReadOnlyCheck: true },
      integrationIds: [],
    });

    const item = await db.query.items.findFirst({ where: (table, { eq }) => eq(table.id, result.itemId) });
    expect(item?.kind).toBe("notebook");
    expect(parse(item?.options ?? "{}")).toEqual({
      content,
      showToolbar: true,
      allowReadOnlyCheck: true,
    });
  });

  test("places a new item after the complete footprint of an existing container", async () => {
    const { db, boardId, caller, layoutId, sectionId } = await createBoardCallerAsync();
    const mobileLayoutId = createId();
    await db.insert(layouts).values({
      id: mobileLayoutId,
      name: "Mobile",
      boardId,
      columnCount: 4,
      breakpoint: 640,
    });
    const containerId = createId();
    await db.insert(sections).values({ id: containerId, boardId, kind: "container" });
    await db.insert(sectionLayouts).values([
      {
        sectionId: containerId,
        parentSectionId: sectionId,
        layoutId,
        xOffset: 0,
        yOffset: 0,
        width: 4,
        height: 3,
      },
      {
        sectionId: containerId,
        parentSectionId: sectionId,
        layoutId: mobileLayoutId,
        xOffset: 0,
        yOffset: 0,
        width: 2,
        height: 1,
      },
    ]);

    const result = await caller.addItem({ boardId, kind: "app", options: {}, integrationIds: [] });
    const placements = await db.query.itemLayouts.findMany({
      where: (table, { eq }) => eq(table.itemId, result.itemId),
    });

    expect(placements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ layoutId, xOffset: 4, yOffset: 0, width: 1, height: 1 }),
        expect.objectContaining({ layoutId: mobileLayoutId, xOffset: 2, yOffset: 0, width: 1, height: 1 }),
      ]),
    );
  });

  test("uses the main section width instead of placing into gutter columns", async () => {
    const { db, boardId, caller, layoutId, sectionId } = await createBoardCallerAsync();
    await db
      .update(layouts)
      .set({ leftGutterColumnCount: 2, rightGutterColumnCount: 2 })
      .where(dbEq(layouts.id, layoutId));
    const containerId = createId();
    await db.insert(sections).values({ id: containerId, boardId, kind: "container" });
    await db.insert(sectionLayouts).values({
      sectionId: containerId,
      parentSectionId: sectionId,
      layoutId,
      xOffset: 0,
      yOffset: 0,
      width: 8,
      height: 1,
    });

    const result = await caller.addItem({ boardId, kind: "app", options: {}, integrationIds: [] });
    const placement = await db.query.itemLayouts.findFirst({
      where: (table, { eq }) => eq(table.itemId, result.itemId),
    });

    expect(placement).toMatchObject({ xOffset: 0, yOffset: 1 });
  });

  test("serializes concurrent automatic placements on the same board", async () => {
    const { db, boardId, caller } = await createBoardCallerAsync();

    const results = await Promise.all([
      caller.addItem({ boardId, kind: "app", options: {}, integrationIds: [] }),
      caller.addItem({ boardId, kind: "app", options: {}, integrationIds: [] }),
    ]);
    const placements = await db.query.itemLayouts.findMany({
      where: (table, { inArray }) =>
        inArray(
          table.itemId,
          results.map((result) => result.itemId),
        ),
    });

    expect(placements).toHaveLength(2);
    expect(new Set(placements.map((placement) => `${placement.xOffset}:${placement.yOffset}`)).size).toBe(2);
  });

  test("accepts an integration the current user can use", async () => {
    const { db, userId, boardId, caller } = await createBoardCallerAsync();
    const integrationId = createId();
    await db.insert(integrations).values({
      id: integrationId,
      name: "Plex",
      kind: "plex",
      url: "https://plex.example.com",
    });
    await db.insert(integrationUserPermissions).values({ integrationId, userId, permission: "use" });

    await expect(
      caller.addItem({ boardId, kind: "mediaServer", options: {}, integrationIds: [integrationId] }),
    ).resolves.toMatchObject({ itemId: expect.any(String) });
  });

  test("rejects an integration the current user cannot use", async () => {
    const { db, boardId, caller } = await createBoardCallerAsync();
    const integrationId = createId();
    await db.insert(integrations).values({
      id: integrationId,
      name: "Private Plex",
      kind: "plex",
      url: "https://private.example.com",
    });

    await expect(
      caller.addItem({ boardId, kind: "mediaServer", options: {}, integrationIds: [integrationId] }),
    ).rejects.toThrow("Integration not found");

    await expect(db.$count(items)).resolves.toBe(0);
  });

  test("rejects a missing required integration", async () => {
    const { db, boardId, caller } = await createBoardCallerAsync();

    await expect(caller.addItem({ boardId, kind: "mediaServer", options: {}, integrationIds: [] })).rejects.toThrow(
      "mediaServer requires an integration",
    );

    await expect(db.$count(items)).resolves.toBe(0);
  });

  test("allows an explicitly optional integration to be omitted", async () => {
    const { boardId, caller } = await createBoardCallerAsync();

    await expect(caller.addItem({ boardId, kind: "calendar", options: {}, integrationIds: [] })).resolves.toMatchObject(
      { itemId: expect.any(String) },
    );
  });

  test("rejects an incompatible integration kind", async () => {
    const { db, userId, boardId, caller } = await createBoardCallerAsync();
    const integrationId = createId();
    await db.insert(integrations).values({
      id: integrationId,
      name: "Sonarr",
      kind: "sonarr",
      url: "https://sonarr.example.com",
    });
    await db.insert(integrationUserPermissions).values({ integrationId, userId, permission: "use" });

    await expect(
      caller.addItem({ boardId, kind: "mediaServer", options: {}, integrationIds: [integrationId] }),
    ).rejects.toThrow("mediaServer does not support integration kind: sonarr");

    await expect(db.$count(items)).resolves.toBe(0);
  });

  test("rejects more integrations than the widget supports", async () => {
    const { db, userId, boardId, caller } = await createBoardCallerAsync();
    const navidromeId = createId();
    const audiobookshelfId = createId();
    await db.insert(integrations).values([
      { id: navidromeId, name: "Navidrome", kind: "navidrome", url: "https://music.example.com" },
      {
        id: audiobookshelfId,
        name: "Audiobookshelf",
        kind: "audiobookshelf",
        url: "https://books.example.com",
      },
    ]);
    await db.insert(integrationUserPermissions).values([
      { integrationId: navidromeId, userId, permission: "use" },
      { integrationId: audiobookshelfId, userId, permission: "use" },
    ]);

    await expect(
      caller.addItem({
        boardId,
        kind: "audioStats",
        options: {},
        integrationIds: [navidromeId, audiobookshelfId],
      }),
    ).rejects.toThrow("audioStats supports at most 1 integration");

    await expect(db.$count(items)).resolves.toBe(0);
  });
});
