import { stringify } from "superjson";
import { describe, expect, test } from "vitest";

import { createId } from "@homarr/common";

import type { Database } from "..";
import { and, eq } from "..";
import { migrateLegacySectionsToContainersAsync } from "../migrations/custom/0004_unify_sections_and_gutters";
import { seedProtectedBoardLayoutsAsync } from "../migrations/seed";
import { boards, itemLayouts, items, layouts, sectionLayouts, sections, users } from "../schema";
import { createDb } from "./db-mock";

type TestDatabase = ReturnType<typeof createDb>;

describe("sections to containers migration", () => {
  test("keeps category and dynamic items inside their containers on every layout", async () => {
    const database = createDb();
    try {
      const userId = createId();
      const boardId = createId();
      const layoutId = createId();
      const rootId = createId();
      const spacerId = createId();
      const watchId = createId();
      const moviesId = createId();
      const dynamicId = createId();
      const clockId = createId();
      const watchAppId = createId();
      const nestedAppId = createId();
      const notesId = createId();
      const movieAppId = createId();

      await database.insert(users).values({ id: userId });
      await database.insert(boards).values({ id: boardId, name: `legacy-${boardId}`, creatorId: userId });
      await database.insert(layouts).values({
        id: layoutId,
        name: "Base",
        boardId,
        columnCount: 10,
        breakpoint: 0,
      });
      await database.insert(sections).values([
        { id: rootId, boardId, kind: "empty", xOffset: 0, yOffset: 0 },
        { id: spacerId, boardId, kind: "empty", xOffset: 0, yOffset: 2 },
        {
          id: watchId,
          boardId,
          kind: "category" as never,
          name: "Watch",
          xOffset: 0,
          yOffset: 1,
        },
        {
          id: moviesId,
          boardId,
          kind: "category" as never,
          name: "Movies",
          xOffset: 0,
          yOffset: 3,
        },
        {
          id: dynamicId,
          boardId,
          kind: "dynamic" as never,
          options: stringify({
            title: "Queue",
            customCssClasses: [],
            borderColor: "",
          }),
        },
      ]);
      await database.insert(items).values([
        { id: clockId, boardId, kind: "clock" },
        { id: watchAppId, boardId, kind: "app" },
        { id: nestedAppId, boardId, kind: "app" },
        { id: notesId, boardId, kind: "clock" },
        { id: movieAppId, boardId, kind: "app" },
      ]);
      await database.insert(itemLayouts).values([
        { itemId: clockId, layoutId, sectionId: rootId, xOffset: 0, yOffset: 0, width: 2, height: 2 },
        { itemId: watchAppId, layoutId, sectionId: watchId, xOffset: 0, yOffset: 0, width: 2, height: 2 },
        { itemId: nestedAppId, layoutId, sectionId: dynamicId, xOffset: 0, yOffset: 0, width: 2, height: 1 },
        { itemId: notesId, layoutId, sectionId: spacerId, xOffset: 0, yOffset: 0, width: 2, height: 1 },
        { itemId: movieAppId, layoutId, sectionId: moviesId, xOffset: 1, yOffset: 1, width: 3, height: 2 },
      ]);
      await database.insert(sectionLayouts).values({
        sectionId: dynamicId,
        layoutId,
        parentSectionId: watchId,
        xOffset: 4,
        yOffset: 0,
        width: 4,
        height: 2,
      });

      await upgradeLegacyBoardAsync(database);

      const savedLayouts = await database.query.layouts.findMany({ where: eq(layouts.boardId, boardId) });
      const baseLayout = savedLayouts.find((layout) => layout.role === "base");
      const mobileLayout = savedLayouts.find((layout) => layout.role === "mobile");
      expect(baseLayout?.id).toBe(layoutId);
      expect(mobileLayout).toBeDefined();

      const savedSections = await database.query.sections.findMany({
        where: eq(sections.boardId, boardId),
        with: { layouts: true },
      });
      const savedItems = await database.query.itemLayouts.findMany();
      const sectionIds = new Set(savedSections.map((section) => section.id));

      for (const layout of savedItems) {
        expect(sectionIds.has(layout.sectionId)).toBe(true);
      }

      const containerById = new Map(
        savedSections.filter((section) => section.kind === "container").map((section) => [section.id, section]),
      );
      expect(containerById.get(watchId)?.kind).toBe("container");
      expect(containerById.get(moviesId)?.kind).toBe("container");
      expect(containerById.get(dynamicId)?.kind).toBe("container");

      for (const layout of [baseLayout, mobileLayout]) {
        if (!layout) continue;
        expect(placement(savedItems, watchAppId, layout.id)?.sectionId).toBe(watchId);
        expect(placement(savedItems, movieAppId, layout.id)?.sectionId).toBe(moviesId);
        expect(placement(savedItems, nestedAppId, layout.id)?.sectionId).toBe(dynamicId);
        expect(placement(savedItems, notesId, layout.id)?.sectionId).not.toBe(spacerId);
        expect(sectionIds.has(placement(savedItems, notesId, layout.id)?.sectionId ?? "")).toBe(true);
        expect(placement(savedItems, clockId, layout.id)?.sectionId).not.toBe(watchId);

        for (const containerId of [watchId, moviesId, dynamicId]) {
          const containerLayout = containerById
            .get(containerId)
            ?.layouts.find((candidate) => candidate.layoutId === layout.id);
          expect(containerLayout?.parentSectionId).toBeTruthy();
          expect(sectionIds.has(containerLayout?.parentSectionId ?? "")).toBe(true);
          const children = savedItems.filter((item) => item.layoutId === layout.id && item.sectionId === containerId);
          for (const child of children) {
            expect(child.xOffset).toBeGreaterThanOrEqual(0);
            expect(child.yOffset).toBeGreaterThanOrEqual(0);
            expect(child.xOffset + child.width).toBeLessThanOrEqual(containerLayout?.width ?? 0);
            expect(child.yOffset + child.height).toBeLessThanOrEqual(containerLayout?.height ?? 0);
          }
        }
      }

      await upgradeLegacyBoardAsync(database);
      const afterRepeat = await database.query.itemLayouts.findMany();
      expect(placement(afterRepeat, watchAppId, mobileLayout?.id ?? "")?.sectionId).toBe(watchId);
      expect(placement(afterRepeat, nestedAppId, mobileLayout?.id ?? "")?.sectionId).toBe(dynamicId);
    } finally {
      database.$client.close();
    }
  });

  test("repairs containers that already lost their items on a generated layout", async () => {
    const database = createDb();
    try {
      const userId = createId();
      const boardId = createId();
      const baseLayoutId = createId();
      const mobileLayoutId = createId();
      const rootId = createId();
      const containerId = createId();
      const moviesId = createId();
      const scrollableId = createId();
      const appId = createId();
      const movieAppId = createId();
      const clockId = createId();
      const scrollableAppId = createId();

      await database.insert(users).values({ id: userId });
      await database.insert(boards).values({ id: boardId, name: `repaired-${boardId}`, creatorId: userId });
      await database.insert(layouts).values([
        { id: mobileLayoutId, name: "Mobile", boardId, columnCount: 3, breakpoint: 0, role: "mobile" },
        { id: baseLayoutId, name: "Base", boardId, columnCount: 10, breakpoint: 768, role: "base" },
      ]);
      await database.insert(sections).values([
        { id: rootId, boardId, kind: "empty", xOffset: 0, yOffset: 0 },
        { id: containerId, boardId, kind: "container", options: stringify({ title: "Watch" }) },
        { id: moviesId, boardId, kind: "container", options: stringify({ title: "Movies" }) },
        {
          id: scrollableId,
          boardId,
          kind: "container",
          options: stringify({ title: "Queue", scrollable: true }),
        },
      ]);
      await database.insert(sectionLayouts).values([
        {
          sectionId: containerId,
          layoutId: baseLayoutId,
          parentSectionId: rootId,
          xOffset: 0,
          yOffset: 2,
          width: 10,
          height: 3,
        },
        {
          sectionId: containerId,
          layoutId: mobileLayoutId,
          parentSectionId: rootId,
          xOffset: 0,
          yOffset: 0,
          width: 3,
          height: 1,
        },
        {
          sectionId: moviesId,
          layoutId: baseLayoutId,
          parentSectionId: rootId,
          xOffset: 0,
          yOffset: 5,
          width: 10,
          height: 2,
        },
        {
          sectionId: moviesId,
          layoutId: mobileLayoutId,
          parentSectionId: rootId,
          xOffset: 0,
          yOffset: 1,
          width: 3,
          height: 1,
        },
        {
          sectionId: scrollableId,
          layoutId: baseLayoutId,
          parentSectionId: rootId,
          xOffset: 0,
          yOffset: 8,
          width: 10,
          height: 2,
        },
        {
          sectionId: scrollableId,
          layoutId: mobileLayoutId,
          parentSectionId: rootId,
          xOffset: 0,
          yOffset: 3,
          width: 3,
          height: 1,
        },
      ]);
      await database.insert(items).values([
        { id: appId, boardId, kind: "app" },
        { id: movieAppId, boardId, kind: "app" },
        { id: clockId, boardId, kind: "clock" },
        { id: scrollableAppId, boardId, kind: "app" },
      ]);
      await database.insert(itemLayouts).values([
        {
          itemId: appId,
          layoutId: baseLayoutId,
          sectionId: containerId,
          xOffset: 0,
          yOffset: 1,
          width: 4,
          height: 2,
        },
        {
          itemId: movieAppId,
          layoutId: baseLayoutId,
          sectionId: moviesId,
          xOffset: 0,
          yOffset: 0,
          width: 2,
          height: 1,
        },
        {
          itemId: clockId,
          layoutId: baseLayoutId,
          sectionId: rootId,
          xOffset: 0,
          yOffset: 7,
          width: 2,
          height: 1,
        },
        {
          itemId: clockId,
          layoutId: mobileLayoutId,
          sectionId: rootId,
          xOffset: 0,
          yOffset: 2,
          width: 3,
          height: 1,
        },
        {
          itemId: scrollableAppId,
          layoutId: baseLayoutId,
          sectionId: scrollableId,
          xOffset: 0,
          yOffset: 0,
          width: 2,
          height: 2,
        },
      ]);

      await seedProtectedBoardLayoutsAsync(database as unknown as Database);

      const repaired = await database.query.itemLayouts.findMany();
      expect(placement(repaired, appId, mobileLayoutId)).toMatchObject({
        sectionId: containerId,
        xOffset: 0,
        yOffset: 0,
      });
      const mobileContainer = await database.query.sectionLayouts.findFirst({
        where: and(eq(sectionLayouts.layoutId, mobileLayoutId), eq(sectionLayouts.sectionId, containerId)),
      });
      expect(mobileContainer?.height).toBeGreaterThanOrEqual(2);
      const mobileMovies = await database.query.sectionLayouts.findFirst({
        where: and(eq(sectionLayouts.layoutId, mobileLayoutId), eq(sectionLayouts.sectionId, moviesId)),
      });
      const mobileClock = placement(repaired, clockId, mobileLayoutId);
      const scrollableContainer = await database.query.sectionLayouts.findFirst({
        where: and(eq(sectionLayouts.layoutId, mobileLayoutId), eq(sectionLayouts.sectionId, scrollableId)),
      });
      expect(placement(repaired, movieAppId, mobileLayoutId)?.sectionId).toBe(moviesId);
      expect(mobileMovies?.yOffset).toBeGreaterThanOrEqual(
        (mobileContainer?.yOffset ?? 0) + (mobileContainer?.height ?? 0),
      );
      expect(mobileClock).toMatchObject({ sectionId: rootId });
      expect(mobileClock?.yOffset).toBeGreaterThanOrEqual((mobileMovies?.yOffset ?? 0) + (mobileMovies?.height ?? 0));
      expect(placement(repaired, scrollableAppId, mobileLayoutId)?.sectionId).toBe(scrollableId);
      expect(scrollableContainer?.height).toBe(1);
      expect(scrollableContainer?.yOffset).toBeGreaterThanOrEqual((mobileClock?.yOffset ?? 0) + 1);
      expect(placement(repaired, appId, baseLayoutId)?.sectionId).toBe(containerId);
      const baseMovies = await database.query.sectionLayouts.findFirst({
        where: and(eq(sectionLayouts.layoutId, baseLayoutId), eq(sectionLayouts.sectionId, moviesId)),
      });
      expect(baseMovies).toMatchObject({ yOffset: 5, height: 2 });

      await seedProtectedBoardLayoutsAsync(database as unknown as Database);
      const repeated = await database.query.itemLayouts.findMany();
      const repeatedMovies = await database.query.sectionLayouts.findFirst({
        where: and(eq(sectionLayouts.layoutId, mobileLayoutId), eq(sectionLayouts.sectionId, moviesId)),
      });
      expect(placement(repeated, clockId, mobileLayoutId)?.yOffset).toBe(mobileClock?.yOffset);
      expect(repeatedMovies?.yOffset).toBe(mobileMovies?.yOffset);
      expect(repeatedMovies?.height).toBe(mobileMovies?.height);
    } finally {
      database.$client.close();
    }
  });
});

const upgradeLegacyBoardAsync = async (database: TestDatabase) => {
  await seedProtectedBoardLayoutsAsync(database as unknown as Database);
  await migrateLegacySectionsToContainersAsync(database as unknown as Database);
};

const placement = <TRow extends { itemId: string; layoutId: string }>(
  rows: readonly TRow[],
  itemId: string,
  layoutId: string,
) => rows.find((row) => row.itemId === itemId && row.layoutId === layoutId);
