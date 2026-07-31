import { parse, stringify } from "superjson";

import { createId } from "@homarr/common";
import type { BoardLane } from "@homarr/definitions";
import { emptySuperJSON, getRootSectionLane, rootSectionOffsets } from "@homarr/definitions";
import { categorySectionOptionsSchema, dynamicSectionOptionsSchema } from "@homarr/validation/shared";

import { and, eq, handleTransactionsAsync, inArray } from "../..";
import type { Database } from "../..";
import type { HomarrDatabase } from "../../driver";
import { itemLayouts, layouts, sectionCollapseStates, sectionLayouts, sections } from "../../schema";

interface MigrationPlacement {
  id: string;
  type: "item" | "section";
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MigrationBoard {
  items: {
    id: string;
    layouts: {
      layoutId: string;
      sectionId: string;
      xOffset: number;
      yOffset: number;
      width: number;
      height: number;
    }[];
  }[];
  sections: {
    id: string;
    kind: string;
    layouts: {
      layoutId: string;
      parentSectionId: string | null;
      xOffset: number;
      yOffset: number;
      width: number;
      height: number;
    }[];
  }[];
}

interface MigrationOperation {
  applyAsync(db: Database): Promise<void>;
  applySync(db: HomarrDatabase): void;
}

/**
 * Categories and dynamic sections used to be separate concepts. Categories
 * were full-width roots and also doubled as side rails. Convert every category
 * into the same resizable section used by the canvas, and create internal
 * gutter roots for the board-level left/right sidebar settings.
 */
export async function migrateCategoriesToUnifiedSectionsAsync(db: Database) {
  const existingBoards = await db.query.boards.findMany({
    with: {
      layouts: true,
      sections: {
        with: {
          collapseStates: true,
          layouts: true,
        },
      },
      items: {
        with: {
          layouts: true,
        },
      },
    },
  });

  let migratedCategoryCount = 0;

  for (const board of existingBoards) {
    const categories = board.sections.filter((section) => section.kind === "category");
    if (categories.length === 0) continue;
    const operations: MigrationOperation[] = [];

    const categoryDetails = categories.map((category) => {
      const options = categorySectionOptionsSchema.parse(parse(category.options ?? emptySuperJSON));
      return {
        category,
        lane: options.railPlacement as BoardLane,
        options,
      };
    });
    const emptyRoots = board.sections.filter((section) => section.kind === "empty");
    let mainRoot = emptyRoots.find((section) => getRootSectionLane(section.xOffset) === "main");
    if (!mainRoot) {
      const id = createId();
      operations.push(
        insertSectionsOperation([
          {
            id,
            boardId: board.id,
            kind: "empty",
            xOffset: rootSectionOffsets.main,
            yOffset: 0,
            options: emptySuperJSON,
          },
        ]),
      );
      mainRoot = {
        id,
        boardId: board.id,
        kind: "empty",
        xOffset: rootSectionOffsets.main,
        yOffset: 0,
        name: null,
        options: emptySuperJSON,
        collapseStates: [],
        layouts: [],
      };
      emptyRoots.push(mainRoot);
    }

    const rootByLane = new Map<BoardLane, (typeof emptyRoots)[number]>([["main", mainRoot]]);
    for (const lane of ["left", "right"] as const) {
      const existing = emptyRoots.find((section) => getRootSectionLane(section.xOffset) === lane);
      if (existing) {
        rootByLane.set(lane, existing);
        continue;
      }
      if (!categoryDetails.some((detail) => detail.lane === lane)) continue;

      const id = createId();
      operations.push(
        insertSectionsOperation([
          {
            id,
            boardId: board.id,
            kind: "empty",
            xOffset: rootSectionOffsets[lane],
            yOffset: 0,
            options: emptySuperJSON,
          },
        ]),
      );
      rootByLane.set(lane, {
        id,
        boardId: board.id,
        kind: "empty",
        xOffset: rootSectionOffsets[lane],
        yOffset: 0,
        name: null,
        options: emptySuperJSON,
        collapseStates: [],
        layouts: [],
      });
    }

    for (const layout of board.layouts) {
      const requestedLeft = Math.max(
        0,
        ...categoryDetails.filter((detail) => detail.lane === "left").map((detail) => detail.options.columnCount),
      );
      const requestedRight = Math.max(
        0,
        ...categoryDetails.filter((detail) => detail.lane === "right").map((detail) => detail.options.columnCount),
      );
      const left = Math.min(3, requestedLeft, Math.max(0, layout.columnCount - 1));
      const right = Math.min(3, requestedRight, Math.max(0, layout.columnCount - left - 1));
      const widths = {
        left,
        main: Math.max(1, layout.columnCount - left - right),
        right,
      } satisfies Record<BoardLane, number>;

      operations.push(updateLayoutGuttersOperation(layout.id, left, right));

      for (const lane of ["left", "main", "right"] as const) {
        const targetRoot = rootByLane.get(lane);
        const laneWidth = widths[lane];
        if (!targetRoot || laneWidth === 0) continue;

        const sourceRoots = emptyRoots
          .filter((section) => getRootSectionLane(section.xOffset) === lane)
          .toSorted((first, second) => (first.yOffset ?? 0) - (second.yOffset ?? 0));
        const sourceBlocks = [
          ...sourceRoots.map((root) => ({
            id: root.id,
            yOffset: root.yOffset ?? 0,
            type: "root" as const,
          })),
          ...categoryDetails
            .filter((detail) => detail.lane === lane)
            .map((detail) => ({
              id: detail.category.id,
              yOffset: detail.category.yOffset ?? 0,
              type: "category" as const,
              detail,
            })),
        ].toSorted(
          (first, second) =>
            first.yOffset - second.yOffset ||
            (first.type === second.type ? first.id.localeCompare(second.id) : first.type === "category" ? -1 : 1),
        );

        let nextRow = 0;
        for (const block of sourceBlocks) {
          if (block.type === "category") {
            const content = getDirectPlacements(board, layout.id, block.id);
            const packedContent = packPlacements(content, laneWidth);
            operations.push(...persistPlacementOperations(layout.id, block.id, packedContent));
            const height = Math.max(1, getPlacementRowCount(packedContent));
            const existingLayout = block.detail.category.layouts.find((candidate) => candidate.layoutId === layout.id);
            const values = {
              sectionId: block.id,
              layoutId: layout.id,
              parentSectionId: targetRoot.id,
              xOffset: 0,
              yOffset: nextRow,
              width: laneWidth,
              height,
            };
            if (existingLayout) {
              operations.push(updateSectionLayoutOperation(block.id, layout.id, values));
            } else {
              operations.push(insertSectionLayoutOperation(values));
            }
            nextRow += height;
            continue;
          }

          const content = getDirectPlacements(board, layout.id, block.id);
          const relativePackedContent = packPlacements(content, laneWidth);
          const packedContent = relativePackedContent.map((placement) => ({
            ...placement,
            y: placement.y + nextRow,
          }));
          operations.push(...persistPlacementOperations(layout.id, targetRoot.id, packedContent));
          nextRow += getPlacementRowCount(relativePackedContent);
        }
      }
    }

    for (const { category, options } of categoryDetails) {
      const legacyCollapseStates = category.collapseStates;
      for (const state of legacyCollapseStates) {
        operations.push(updateCollapseStateOperation(category.id, state.userId, !state.collapsed));
      }

      operations.push(
        updateSectionOperation(category.id, {
          kind: "dynamic",
          xOffset: null,
          yOffset: null,
          name: null,
          options: stringify(
            dynamicSectionOptionsSchema.parse({
              title: (category.name ?? "").slice(0, 64),
              customCssClasses: [],
              borderColor: "",
              showLabel: options.showLabel,
              collapsible: options.collapsible,
              showOpenAll: options.showOpenAll,
            }),
          ),
        }),
      );
      migratedCategoryCount += 1;
    }

    const retainedRootIds = new Set(Array.from(rootByLane.values(), (root) => root.id));
    const obsoleteRootIds = emptyRoots.filter((root) => !retainedRootIds.has(root.id)).map((root) => root.id);
    if (obsoleteRootIds.length > 0) {
      operations.push(deleteSectionsOperation(obsoleteRootIds));
    }

    await executeBoardMigrationOperationsAsync(db, operations);
  }

  if (migratedCategoryCount > 0) {
    console.log(`Migrated categories to unified sections count="${migratedCategoryCount}"`);
  }
}

const getDirectPlacements = (board: MigrationBoard, layoutId: string, sectionId: string): MigrationPlacement[] => [
  ...board.items.flatMap((item) => {
    const layout = item.layouts.find(
      (candidate) => candidate.layoutId === layoutId && candidate.sectionId === sectionId,
    );
    return layout
      ? [
          {
            id: item.id,
            type: "item" as const,
            x: layout.xOffset,
            y: layout.yOffset,
            w: layout.width,
            h: layout.height,
          },
        ]
      : [];
  }),
  ...board.sections.flatMap((section) => {
    if (section.kind !== "dynamic") return [];
    const layout = section.layouts.find(
      (candidate) => candidate.layoutId === layoutId && candidate.parentSectionId === sectionId,
    );
    return layout
      ? [
          {
            id: section.id,
            type: "section" as const,
            x: layout.xOffset,
            y: layout.yOffset,
            w: layout.width,
            h: layout.height,
          },
        ]
      : [];
  }),
];

const executeBoardMigrationOperationsAsync = async (db: Database, operations: readonly MigrationOperation[]) => {
  await handleTransactionsAsync(db, {
    async handleAsync(transactionDb) {
      await transactionDb.transaction(async (transaction) => {
        for (const operation of operations) {
          await operation.applyAsync(transaction as unknown as Database);
        }
      });
    },
    handleSync(sqliteDb) {
      sqliteDb.transaction((transaction) => {
        for (const operation of operations) {
          operation.applySync(transaction);
        }
      });
    },
  });
};

const insertSectionsOperation = (values: (typeof sections.$inferInsert)[]): MigrationOperation => ({
  async applyAsync(db) {
    await db.insert(sections).values(values);
  },
  applySync(db) {
    db.insert(sections).values(values).run();
  },
});

const updateLayoutGuttersOperation = (
  layoutId: string,
  leftGutterColumnCount: number,
  rightGutterColumnCount: number,
): MigrationOperation => ({
  async applyAsync(db) {
    await db.update(layouts).set({ leftGutterColumnCount, rightGutterColumnCount }).where(eq(layouts.id, layoutId));
  },
  applySync(db) {
    db.update(layouts).set({ leftGutterColumnCount, rightGutterColumnCount }).where(eq(layouts.id, layoutId)).run();
  },
});

const persistPlacementOperations = (
  layoutId: string,
  sectionId: string,
  placements: readonly MigrationPlacement[],
): MigrationOperation[] =>
  placements.map((placement) => {
    const values = {
      xOffset: placement.x,
      yOffset: placement.y,
      width: placement.w,
      height: placement.h,
    };
    if (placement.type === "item") {
      return {
        async applyAsync(db) {
          await db
            .update(itemLayouts)
            .set({ ...values, sectionId })
            .where(and(eq(itemLayouts.itemId, placement.id), eq(itemLayouts.layoutId, layoutId)));
        },
        applySync(db) {
          db.update(itemLayouts)
            .set({ ...values, sectionId })
            .where(and(eq(itemLayouts.itemId, placement.id), eq(itemLayouts.layoutId, layoutId)))
            .run();
        },
      };
    }

    return {
      async applyAsync(db) {
        await db
          .update(sectionLayouts)
          .set({ ...values, parentSectionId: sectionId })
          .where(and(eq(sectionLayouts.sectionId, placement.id), eq(sectionLayouts.layoutId, layoutId)));
      },
      applySync(db) {
        db.update(sectionLayouts)
          .set({ ...values, parentSectionId: sectionId })
          .where(and(eq(sectionLayouts.sectionId, placement.id), eq(sectionLayouts.layoutId, layoutId)))
          .run();
      },
    };
  });

const updateSectionLayoutOperation = (
  sectionId: string,
  layoutId: string,
  values: typeof sectionLayouts.$inferInsert,
): MigrationOperation => ({
  async applyAsync(db) {
    await db
      .update(sectionLayouts)
      .set(values)
      .where(and(eq(sectionLayouts.sectionId, sectionId), eq(sectionLayouts.layoutId, layoutId)));
  },
  applySync(db) {
    db.update(sectionLayouts)
      .set(values)
      .where(and(eq(sectionLayouts.sectionId, sectionId), eq(sectionLayouts.layoutId, layoutId)))
      .run();
  },
});

const insertSectionLayoutOperation = (values: typeof sectionLayouts.$inferInsert): MigrationOperation => ({
  async applyAsync(db) {
    await db.insert(sectionLayouts).values(values);
  },
  applySync(db) {
    db.insert(sectionLayouts).values(values).run();
  },
});

const updateCollapseStateOperation = (sectionId: string, userId: string, collapsed: boolean): MigrationOperation => ({
  async applyAsync(db) {
    await db
      .update(sectionCollapseStates)
      .set({ collapsed })
      .where(and(eq(sectionCollapseStates.sectionId, sectionId), eq(sectionCollapseStates.userId, userId)));
  },
  applySync(db) {
    db.update(sectionCollapseStates)
      .set({ collapsed })
      .where(and(eq(sectionCollapseStates.sectionId, sectionId), eq(sectionCollapseStates.userId, userId)))
      .run();
  },
});

const updateSectionOperation = (
  sectionId: string,
  values: Partial<typeof sections.$inferInsert>,
): MigrationOperation => ({
  async applyAsync(db) {
    await db.update(sections).set(values).where(eq(sections.id, sectionId));
  },
  applySync(db) {
    db.update(sections).set(values).where(eq(sections.id, sectionId)).run();
  },
});

const deleteSectionsOperation = (sectionIds: string[]): MigrationOperation => ({
  async applyAsync(db) {
    await db.delete(sections).where(inArray(sections.id, sectionIds));
  },
  applySync(db) {
    db.delete(sections).where(inArray(sections.id, sectionIds)).run();
  },
});

const packPlacements = (placements: readonly MigrationPlacement[], columnCount: number): MigrationPlacement[] => {
  const placed: MigrationPlacement[] = [];
  const candidates = placements
    .map((placement) => ({
      ...placement,
      x: Math.min(Math.max(0, placement.x), Math.max(0, columnCount - Math.min(columnCount, placement.w))),
      y: Math.max(0, placement.y),
      w: Math.min(columnCount, Math.max(1, placement.w)),
      h: Math.max(1, placement.h),
    }))
    .toSorted((first, second) => first.y - second.y || first.x - second.x || first.id.localeCompare(second.id));

  for (const candidate of candidates) {
    let row = 0;
    while (placed.some((placement) => overlaps({ ...candidate, y: row }, placement))) row += 1;
    placed.push({ ...candidate, y: row });
  }

  return placed;
};

const overlaps = (first: MigrationPlacement, second: MigrationPlacement) =>
  first.x < second.x + second.w &&
  first.x + first.w > second.x &&
  first.y < second.y + second.h &&
  first.y + first.h > second.y;

const getPlacementRowCount = (placements: readonly MigrationPlacement[]) =>
  Math.max(0, ...placements.map((placement) => placement.y + placement.h));
