import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { z } from "zod/v4";

import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { eq, inArray } from "@homarr/db";
import { createDbInsertCollectionWithoutTransaction } from "@homarr/db/collection";
import { boards, integrations, items, layouts, sections } from "@homarr/db/schema";
import { emptySuperJSON } from "@homarr/definitions";
import type { boardExportSchema, boardImportSchema } from "@homarr/validation/board";
import { itemAdvancedOptionsSchema } from "@homarr/validation/shared";

import type { BoardForPlacement } from "../board";
import type { DbOperation } from "../db-operations";
import { runDbOperationsAsync } from "../db-operations";
import type { OccupiedArea } from "./item-placement";
import { getDefaultSizeForKind, resolvePlacementForAllLayouts } from "./item-placement";

export type BoardImportDocument = z.infer<typeof boardImportSchema>;
export type BoardExportDocument = z.infer<typeof boardExportSchema>;

/**
 * Turns a board into a portable document.
 * The ids inside the document are only used to reference layouts and sections between each other,
 * on import they are replaced with freshly generated ids.
 */
export const createBoardExportDocument = (board: BoardForPlacement): BoardExportDocument => ({
  name: board.name,
  isPublic: board.isPublic,
  settings: {
    pageTitle: board.pageTitle,
    metaTitle: board.metaTitle,
    logoImageUrl: board.logoImageUrl,
    faviconImageUrl: board.faviconImageUrl,
    backgroundImageUrl: board.backgroundImageUrl,
    backgroundImageAttachment: board.backgroundImageAttachment,
    backgroundImageRepeat: board.backgroundImageRepeat,
    backgroundImageSize: board.backgroundImageSize,
    primaryColor: board.primaryColor,
    secondaryColor: board.secondaryColor,
    opacity: board.opacity,
    customCss: board.customCss,
    iconColor: board.iconColor,
    itemRadius: board.itemRadius,
    disableStatus: board.disableStatus,
  },
  layouts: board.layouts
    .map(({ id, name, columnCount, breakpoint }) => ({ id, name, columnCount, breakpoint }))
    .toSorted((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint),
  sections: board.sections.map((section) => ({
    id: section.id,
    kind: section.kind,
    name: section.name,
    yOffset: section.yOffset,
    options:
      section.kind === "dynamic"
        ? (superjson.parse<Record<string, unknown>>(section.options ?? emptySuperJSON) as never)
        : undefined,
    layouts: section.layouts.map(({ layoutId, parentSectionId, xOffset, yOffset, width, height }) => ({
      layoutId,
      parentSectionId,
      xOffset,
      yOffset,
      width,
      height,
    })),
  })),
  items: board.items.map((item) => ({
    id: item.id,
    kind: item.kind,
    options: superjson.parse<Record<string, unknown>>(item.options),
    advancedOptions: itemAdvancedOptionsSchema.parse(superjson.parse(item.advancedOptions)),
    integrationIds: item.integrations.map(({ integrationId }) => integrationId),
    layouts: item.layouts.map(({ layoutId, sectionId, xOffset, yOffset, width, height }) => ({
      layoutId,
      sectionId,
      xOffset,
      yOffset,
      width,
      height,
    })),
  })),
});

type DocumentSection = Omit<BoardImportDocument, "onConflict">["sections"][number];

/**
 * Orders the sections so that a dynamic section comes after the section it is nested in.
 *
 * A dynamic section is a sub grid, so the placement of everything inside of it is bound by its
 * width. That width only exists once the section itself was placed, which means a document that
 * lists a child before its parent would otherwise be validated against the width of the board.
 *
 * Nesting is stored per layout, so two sections can legitimately be nested into each other on
 * different breakpoints and no order satisfies both. The remaining sections then keep their
 * document order instead of the request being rejected, and an id that simply does not exist is
 * reported by the placement itself, which knows whether it is a typo or a nesting cycle.
 */
const sortDynamicSectionsByNesting = (sections: DocumentSection[]) => {
  const parentIdsOf = (section: DocumentSection) =>
    (section.layouts ?? []).map((layout) => layout.parentSectionId).filter((id) => id !== null && id !== undefined);

  const remaining = [...sections];
  const ordered: DocumentSection[] = [];
  const placedIds = new Set<string>();

  while (remaining.length > 0) {
    const index = remaining.findIndex(
      (section) => section.kind !== "dynamic" || parentIdsOf(section).every((id) => placedIds.has(id)),
    );

    if (index === -1) {
      ordered.push(...remaining);
      break;
    }

    const [section] = remaining.splice(index, 1) as [DocumentSection];
    ordered.push(section);
    placedIds.add(section.id);
  }

  return ordered;
};

const throwIfSectionNestingCycles = (document: Omit<BoardImportDocument, "onConflict">) => {
  for (const layout of document.layouts) {
    const parentBySectionId = new Map(
      document.sections.flatMap((section) => {
        const parentSectionId = section.layouts?.find((entry) => entry.layoutId === layout.id)?.parentSectionId;
        return parentSectionId ? [[section.id, parentSectionId] as const] : [];
      }),
    );

    for (const sectionId of parentBySectionId.keys()) {
      const visited = new Set([sectionId]);
      let parentSectionId = parentBySectionId.get(sectionId);

      while (parentSectionId) {
        if (visited.has(parentSectionId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Section nesting cannot form a cycle in layout '${layout.id}'`,
          });
        }

        visited.add(parentSectionId);
        parentSectionId = parentBySectionId.get(parentSectionId);
      }
    }
  }
};

const requireReference = (map: Map<string, string>, reference: string, kind: string) => {
  const resolved = map.get(reference);
  if (!resolved) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown ${kind} reference '${reference}' in document` });
  }

  return resolved;
};

const resolveReference = (map: Map<string, string>, reference: string | undefined | null, kind: string) =>
  reference === undefined || reference === null ? undefined : requireReference(map, reference, kind);

export const boardDocumentTables = [
  "boards",
  "layouts",
  "sections",
  "sectionLayouts",
  "items",
  "itemLayouts",
  "integrationItems",
] as const;

type BoardDocumentCollection = Pick<
  ReturnType<typeof createDbInsertCollectionWithoutTransaction<(typeof boardDocumentTables)[number]>>,
  (typeof boardDocumentTables)[number]
>;

/**
 * Turns a board document into the rows of every affected table without touching the database.
 *
 * By default the ids inside the document are treated as local references and replaced with
 * freshly generated ones, so the same document can be imported repeatedly. A full configuration
 * import passes `preserveIds` instead, because widget options can reference other entities by id
 * and those references cannot be rewritten from the outside.
 */
export const collectBoardDocumentRows = (
  collection: BoardDocumentCollection,
  document: Omit<BoardImportDocument, "onConflict">,
  options: { boardId: string; creatorId: string | null; preserveIds?: boolean },
) => {
  const { boardId, creatorId, preserveIds = false } = options;
  const nextId = (reference: string) => (preserveIds ? reference : createId());

  const layoutIdMap = new Map(document.layouts.map((layout) => [layout.id, nextId(layout.id)]));
  const sectionIdMap = new Map(document.sections.map((section) => [section.id, nextId(section.id)]));

  if (layoutIdMap.size !== document.layouts.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Layout references must be unique" });
  }

  if (sectionIdMap.size !== document.sections.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Section references must be unique" });
  }

  throwIfSectionNestingCycles(document);

  collection.boards.push({
    ...document.settings,
    id: boardId,
    name: document.name,
    isPublic: document.isPublic,
    creatorId,
  });

  for (const layout of document.layouts) {
    collection.layouts.push({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: layoutIdMap.get(layout.id)!,
      name: layout.name,
      columnCount: layout.columnCount,
      breakpoint: layout.breakpoint,
      boardId,
    });
  }

  for (const [index, section] of document.sections.entries()) {
    collection.sections.push({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: sectionIdMap.get(section.id)!,
      boardId,
      kind: section.kind,
      name: section.kind === "category" ? (section.name ?? null) : null,
      xOffset: section.kind === "dynamic" ? null : 0,
      yOffset: section.kind === "dynamic" ? null : (section.yOffset ?? index),
      options: section.kind === "dynamic" ? superjson.stringify(section.options ?? {}) : emptySuperJSON,
    });
  }

  // The virtual board mirrors what will exist after the insert, so the shared placement
  // helper can validate positions and place items that come without explicit coordinates.
  const virtualBoard = {
    layouts: document.layouts.map((layout) => ({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: layoutIdMap.get(layout.id)!,
      name: layout.name,
      columnCount: layout.columnCount,
    })),
    sections: document.sections.map((section, index) => ({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: sectionIdMap.get(section.id)!,
      kind: section.kind,
      yOffset: section.kind === "dynamic" ? null : (section.yOffset ?? index),
      // Filled in while the dynamic sections are placed, items inside them are bound by their width
      layouts: [] as {
        layoutId: string;
        parentSectionId: string | null;
        xOffset: number;
        yOffset: number;
        width: number;
        height: number;
      }[],
    })),
    items: [],
  };

  const occupiedAreas: OccupiedArea[] = [];

  for (const section of sortDynamicSectionsByNesting(document.sections)) {
    if (section.kind !== "dynamic") continue;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sectionId = sectionIdMap.get(section.id)!;
    const placements = resolvePlacementForAllLayouts({
      board: virtualBoard,
      placement: {
        layouts: section.layouts?.map((sectionLayout) => ({
          layoutId: requireReference(layoutIdMap, sectionLayout.layoutId, "layout"),
          sectionId: resolveReference(sectionIdMap, sectionLayout.parentSectionId, "section"),
          xOffset: sectionLayout.xOffset,
          yOffset: sectionLayout.yOffset,
          width: sectionLayout.width,
          height: sectionLayout.height,
        })),
      },
      occupiedAreas,
      defaultSize: { width: 1, height: 1 },
      context: "the section",
    });

    const virtualSection = virtualBoard.sections.find((entry) => entry.id === sectionId);

    for (const placement of placements) {
      collection.sectionLayouts.push({
        sectionId,
        layoutId: placement.layoutId,
        parentSectionId: placement.sectionId,
        xOffset: placement.xOffset,
        yOffset: placement.yOffset,
        width: placement.width,
        height: placement.height,
      });
      occupiedAreas.push({ elementId: sectionId, ...placement });
      virtualSection?.layouts.push({
        layoutId: placement.layoutId,
        parentSectionId: placement.sectionId,
        xOffset: placement.xOffset,
        yOffset: placement.yOffset,
        width: placement.width,
        height: placement.height,
      });
    }
  }

  for (const item of document.items) {
    const itemId = item.id && preserveIds ? item.id : createId();

    const placements = resolvePlacementForAllLayouts({
      board: virtualBoard,
      placement: {
        sectionId: resolveReference(sectionIdMap, item.sectionId, "section"),
        xOffset: item.xOffset,
        yOffset: item.yOffset,
        width: item.width,
        height: item.height,
        layouts: item.layouts?.map((itemLayout) => ({
          layoutId: requireReference(layoutIdMap, itemLayout.layoutId, "layout"),
          sectionId: resolveReference(sectionIdMap, itemLayout.sectionId, "section"),
          xOffset: itemLayout.xOffset,
          yOffset: itemLayout.yOffset,
          width: itemLayout.width,
          height: itemLayout.height,
        })),
      },
      occupiedAreas,
      defaultSize: getDefaultSizeForKind(item.kind),
    });

    collection.items.push({
      id: itemId,
      boardId,
      kind: item.kind,
      options: superjson.stringify(item.options),
      advancedOptions: item.advancedOptions ? superjson.stringify(item.advancedOptions) : emptySuperJSON,
    });

    for (const placement of placements) {
      collection.itemLayouts.push({ itemId, ...placement });
      occupiedAreas.push({ elementId: itemId, ...placement });
    }

    for (const integrationId of item.integrationIds) {
      collection.integrationItems.push({ itemId, integrationId });
    }
  }
};

export const throwIfIntegrationsMissingAsync = async (db: Database, requiredIntegrationIds: string[]) => {
  const uniqueIds = [...new Set(requiredIntegrationIds)];
  if (uniqueIds.length === 0) return;

  const existing = await db.query.integrations.findMany({
    columns: { id: true },
    where: inArray(integrations.id, uniqueIds),
  });
  const validIds = new Set(existing.map((row) => row.id));
  const invalid = uniqueIds.filter((id) => !validIds.has(id));

  if (invalid.length > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid integration IDs: ${invalid.join(", ")}` });
  }
};

/**
 * Turns a board document into the statements that create it.
 *
 * Everything is validated while the statements are collected, so a document that is rejected
 * never reaches the database. With `replaceExisting` the board row itself is kept and only its
 * content is exchanged, which preserves its id and everything pointing at it, such as the home
 * board of a user or the per user permissions.
 */
export const collectBoardDocumentOperations = (
  document: Omit<BoardImportDocument, "onConflict">,
  options: { boardId: string; creatorId: string | null; preserveIds?: boolean; replaceExisting?: boolean },
): DbOperation[] => {
  const { boardId, replaceExisting = false } = options;
  const collection = createDbInsertCollectionWithoutTransaction([...boardDocumentTables]);

  collectBoardDocumentRows(collection, document, options);

  const operations: DbOperation[] = [];
  const [boardRow] = collection.boards;

  if (replaceExisting) {
    const { id: _id, creatorId: _creatorId, ...boardValues } = boardRow ?? {};
    operations.push({ type: "update", table: "boards", set: boardValues, where: eq(boards.id, boardId) });
    // The children cascade from these three, including item layouts and collapse states
    operations.push({ type: "delete", table: "items", where: eq(items.boardId, boardId) });
    operations.push({ type: "delete", table: "sections", where: eq(sections.boardId, boardId) });
    operations.push({ type: "delete", table: "layouts", where: eq(layouts.boardId, boardId) });
  } else if (boardRow) {
    operations.push({ type: "insert", table: "boards", values: [boardRow] });
  }

  for (const table of boardDocumentTables) {
    if (table === "boards") continue;

    const values = collection[table];
    if (values.length > 0) {
      operations.push({ type: "insert", table, values });
    }
  }

  return operations;
};

/**
 * Creates a single complete board from a document, generating fresh ids for everything.
 */
export const insertBoardDocumentAsync = async (db: Database, document: BoardImportDocument, creatorId: string) => {
  await throwIfIntegrationsMissingAsync(
    db,
    document.items.flatMap((item) => item.integrationIds),
  );

  const boardId = createId();
  const operations = collectBoardDocumentOperations(document, { boardId, creatorId });

  await runDbOperationsAsync(db, operations);

  return { boardId };
};

/**
 * Exchanges the content of an existing board without recreating the board itself.
 */
export const replaceBoardDocumentAsync = async (
  db: Database,
  document: BoardImportDocument,
  options: { boardId: string; creatorId: string | null },
) => {
  await throwIfIntegrationsMissingAsync(
    db,
    document.items.flatMap((item) => item.integrationIds),
  );

  const operations = collectBoardDocumentOperations(document, { ...options, replaceExisting: true });

  await runDbOperationsAsync(db, operations);

  return { boardId: options.boardId };
};
