import { describe, expect, test } from "vitest";

import { createId } from "@homarr/common";
import { eq } from "@homarr/db";
import { boards, itemLayouts, items, layouts, sections } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import { emptySuperJSON } from "@homarr/definitions";

import { seedProtectedBoardLayoutsAsync } from "./seed";

describe("protected board layout migration", () => {
  test("turns a single saved layout into Base and generates Mobile", async () => {
    const db = createDb();
    const boardId = createId();
    const baseLayoutId = createId();
    const sectionId = createId();
    const itemId = createId();
    await db.insert(boards).values({ id: boardId, name: "single" });
    await db.insert(layouts).values({
      id: baseLayoutId,
      boardId,
      name: "Wide",
      columnCount: 12,
      breakpoint: 0,
    });
    await db.insert(sections).values({ id: sectionId, boardId, kind: "empty", xOffset: 0, yOffset: 0 });
    await db.insert(items).values({ id: itemId, boardId, kind: "clock", options: emptySuperJSON });
    await db.insert(itemLayouts).values({
      itemId,
      sectionId,
      layoutId: baseLayoutId,
      width: 5,
      height: 2,
      xOffset: 6,
      yOffset: 1,
    });

    await seedProtectedBoardLayoutsAsync(db);
    await seedProtectedBoardLayoutsAsync(db);

    const savedLayouts = await db.query.layouts.findMany({ where: eq(layouts.boardId, boardId) });
    expect(savedLayouts).toHaveLength(2);
    expect(savedLayouts.find((layout) => layout.role === "base")).toMatchObject({
      id: baseLayoutId,
      name: "Wide",
      columnCount: 12,
      breakpoint: 768,
    });
    const mobileLayout = savedLayouts.find((layout) => layout.role === "mobile");
    expect(mobileLayout).toMatchObject({ name: "Mobile", columnCount: 3, breakpoint: 0 });
    const mobileItemPosition = await db.query.itemLayouts.findFirst({
      where: eq(itemLayouts.layoutId, mobileLayout?.id ?? ""),
    });
    expect(mobileItemPosition).toMatchObject({ width: 3, height: 2, xOffset: 0, yOffset: 0 });
  });

  test("assigns roles and resolves duplicate breakpoints without rebuilding existing layouts", async () => {
    const db = createDb();
    const boardId = createId();
    await db.insert(boards).values({ id: boardId, name: "responsive" });
    await db.insert(layouts).values([
      { id: "layout-mobile", boardId, name: "Phone", columnCount: 3, breakpoint: 0 },
      { id: "layout-tablet-a", boardId, name: "Tablet A", columnCount: 6, breakpoint: 480 },
      { id: "layout-tablet-b", boardId, name: "Tablet B", columnCount: 8, breakpoint: 480 },
      { id: "layout-wide", boardId, name: "Wide", columnCount: 12, breakpoint: 1200 },
    ]);

    await seedProtectedBoardLayoutsAsync(db);
    await seedProtectedBoardLayoutsAsync(db);

    const savedLayouts = await db.query.layouts.findMany({ where: eq(layouts.boardId, boardId) });
    expect(savedLayouts.toSorted((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint)).toMatchObject([
      { id: "layout-mobile", name: "Phone", columnCount: 3, breakpoint: 0, role: "mobile" },
      { id: "layout-tablet-a", name: "Tablet A", columnCount: 6, breakpoint: 480, role: "custom" },
      { id: "layout-tablet-b", name: "Tablet B", columnCount: 8, breakpoint: 481, role: "custom" },
      { id: "layout-wide", name: "Wide", columnCount: 12, breakpoint: 1200, role: "base" },
    ]);
  });

  test("creates both protected layouts for a board with no layouts", async () => {
    const db = createDb();
    const boardId = createId();
    await db.insert(boards).values({ id: boardId, name: "empty" });

    await seedProtectedBoardLayoutsAsync(db);
    await seedProtectedBoardLayoutsAsync(db);

    const savedLayouts = await db.query.layouts.findMany({ where: eq(layouts.boardId, boardId) });
    expect(savedLayouts).toHaveLength(2);
    expect(savedLayouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "mobile", columnCount: 3, breakpoint: 0 }),
        expect.objectContaining({ role: "base", columnCount: 10, breakpoint: 768 }),
      ]),
    );
  });
});
