import { describe, expect, test } from "vitest";

import { createId } from "@homarr/common";
import { boards, layouts, sections } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { placeAllWidgetsAsync } from "./widget-placement";

describe("placeAllWidgetsAsync", () => {
  test("creates independent positions for every target layout", async () => {
    const db = createDb();
    const boardId = createId();
    const sectionId = createId();
    const mobileLayoutId = createId();
    const baseLayoutId = createId();
    await db.insert(boards).values({ id: boardId, name: "dashboard" });
    await db.insert(sections).values({ id: sectionId, kind: "empty", xOffset: 0, yOffset: 0, boardId });
    await db.insert(layouts).values([
      {
        id: mobileLayoutId,
        name: "Mobile",
        role: "mobile",
        columnCount: 3,
        breakpoint: 0,
        boardId,
      },
      {
        id: baseLayoutId,
        name: "Base",
        role: "base",
        columnCount: 10,
        breakpoint: 768,
        boardId,
      },
    ]);

    await placeAllWidgetsAsync(
      db,
      [
        { boardId, sectionId, layoutId: mobileLayoutId, columnCount: 3 },
        { boardId, sectionId, layoutId: baseLayoutId, columnCount: 10 },
      ],
      [],
      [{ id: createId(), name: "Homarr" }],
    );

    const placedItems = await db.query.items.findMany({ with: { layouts: true } });
    expect(placedItems.length).toBeGreaterThan(0);
    expect(placedItems.every((item) => item.layouts.length === 2)).toBe(true);
    expect(
      placedItems.every((item) =>
        item.layouts.some((layout) => layout.layoutId === mobileLayoutId && layout.width <= 3),
      ),
    ).toBe(true);
    expect(placedItems.every((item) => item.layouts.some((layout) => layout.layoutId === baseLayoutId))).toBe(true);
  });
});
