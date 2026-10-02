/** @vitest-environment node */

import { parse, stringify } from "superjson";
import { describe, expect, test } from "vitest";

import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { and, eq } from "@homarr/db";
import { createDb } from "@homarr/db/test";
import { containerSectionOptionsSchema } from "@homarr/validation/shared";

import {
  boards,
  itemLayouts,
  items,
  layouts,
  sectionCollapseStates,
  sectionLayouts,
  sections,
  users,
} from "../../schema";
import { migrateLegacySectionsToContainersAsync } from "./0004_unify_sections_and_gutters";

describe("legacy section migration", () => {
  test("converts a rail category into a resizable container inside a board gutter", async () => {
    const db = createDb();
    const userId = createId();
    const boardId = createId();
    const layoutId = createId();
    const mainRootId = createId();
    const categoryId = createId();
    const itemId = createId();

    await db.insert(users).values({ id: userId });
    await db.insert(boards).values({ id: boardId, name: "migration", creatorId: userId });
    await db.insert(layouts).values({ id: layoutId, name: "Base", boardId, columnCount: 8, breakpoint: 0 });
    await db.insert(sections).values([
      { id: mainRootId, boardId, kind: "empty", xOffset: 0, yOffset: 0 },
      {
        id: categoryId,
        boardId,
        kind: "category" as never,
        name: "Pinned apps",
        xOffset: 0,
        yOffset: 1,
        options: stringify({
          showLabel: false,
          collapsible: true,
          showOpenAll: true,
          railPlacement: "left",
          columnCount: 2,
        }),
      },
    ]);
    await db.insert(items).values({ id: itemId, boardId, kind: "clock" });
    await db.insert(sectionCollapseStates).values({
      sectionId: categoryId,
      userId,
      // Legacy categories stored true when the section was open.
      collapsed: true,
    });
    await db.insert(itemLayouts).values({
      itemId,
      layoutId,
      sectionId: categoryId,
      xOffset: 1,
      yOffset: 0,
      width: 1,
      height: 1,
    });

    await migrateLegacySectionsToContainersAsync(db as unknown as Database);

    const migratedLayout = await db.query.layouts.findFirst({ where: eq(layouts.id, layoutId) });
    expect(migratedLayout?.leftGutterColumnCount).toBe(2);

    const gutterRoot = await db.query.sections.findFirst({
      where: and(eq(sections.boardId, boardId), eq(sections.kind, "empty"), eq(sections.xOffset, -1)),
    });
    expect(gutterRoot).toBeDefined();

    const migratedCategory = await db.query.sections.findFirst({ where: eq(sections.id, categoryId) });
    expect(migratedCategory?.kind).toBe("container");
    expect(containerSectionOptionsSchema.parse(parse(migratedCategory?.options ?? "{}"))).toEqual({
      title: "Pinned apps",
      customCssClasses: [],
      borderColor: "",
      showLabel: false,
      collapsible: true,
      showOpenAll: true,
    });
    const migratedCollapseState = await db.query.sectionCollapseStates.findFirst({
      where: and(eq(sectionCollapseStates.sectionId, categoryId), eq(sectionCollapseStates.userId, userId)),
    });
    expect(migratedCollapseState?.collapsed).toBe(false);

    const categoryLayout = await db.query.sectionLayouts.findFirst({
      where: and(eq(sectionLayouts.sectionId, categoryId), eq(sectionLayouts.layoutId, layoutId)),
    });
    expect(categoryLayout).toMatchObject({
      parentSectionId: gutterRoot?.id,
      width: 2,
      height: 1,
    });

    const nestedItem = await db.query.itemLayouts.findFirst({
      where: and(eq(itemLayouts.itemId, itemId), eq(itemLayouts.layoutId, layoutId)),
    });
    expect(nestedItem?.sectionId).toBe(categoryId);
  });

  test("renames a dynamic section and preserves all container options and geometry", async () => {
    const db = createDb();
    const userId = createId();
    const boardId = createId();
    const layoutId = createId();
    const rootId = createId();
    const sectionId = createId();
    const options = {
      title: "Operations",
      customCssClasses: ["dense", "accent"],
      borderColor: "#123456",
      showLabel: false,
      collapsible: true,
      showOpenAll: true,
    };

    await db.insert(users).values({ id: userId });
    await db.insert(boards).values({ id: boardId, name: "dynamic-migration", creatorId: userId });
    await db.insert(layouts).values({ id: layoutId, name: "Base", boardId, columnCount: 8, breakpoint: 0 });
    await db.insert(sections).values([
      { id: rootId, boardId, kind: "empty", xOffset: 0, yOffset: 0 },
      {
        id: sectionId,
        boardId,
        kind: "dynamic" as never,
        options: stringify(options),
      },
    ]);
    await db.insert(sectionLayouts).values({
      sectionId,
      layoutId,
      parentSectionId: rootId,
      xOffset: 2,
      yOffset: 3,
      width: 4,
      height: 5,
    });

    await migrateLegacySectionsToContainersAsync(db as unknown as Database);
    await migrateLegacySectionsToContainersAsync(db as unknown as Database);

    const migrated = await db.query.sections.findFirst({ where: eq(sections.id, sectionId) });
    expect(migrated?.kind).toBe("container");
    expect(containerSectionOptionsSchema.parse(parse(migrated?.options ?? "{}"))).toEqual(options);
    expect(
      await db.query.sectionLayouts.findFirst({
        where: and(eq(sectionLayouts.sectionId, sectionId), eq(sectionLayouts.layoutId, layoutId)),
      }),
    ).toMatchObject({
      parentSectionId: rootId,
      xOffset: 2,
      yOffset: 3,
      width: 4,
      height: 5,
    });
  });
});
