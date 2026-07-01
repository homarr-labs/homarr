import SuperJSON from "superjson";

import { createId } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { emptySuperJSON } from "@homarr/definitions";
import type { InferInsertModel, InferSelectModel } from "@homarr/db";
import { and, asc, db, eq, handleTransactionsAsync } from "@homarr/db";
import { createDbInsertCollectionForTransaction } from "@homarr/db/collection";
import { apps, boards, dockerAppSources, itemLayouts, items, layouts, sections } from "@homarr/db/schema";

import type { DiscoveredService } from "./types";

const logger = createLogger({ module: "dockerDiscoverySync" });

export interface SyncDiscoveredServicesOptions {
  targetBoardName?: string | null;
  enableStatusByDefault?: boolean;
  forceDisableStatus?: boolean;
  defaultItemWidth?: number;
  defaultItemHeight?: number;
}

export interface SyncDiscoveredServicesResult {
  created: number;
  updated: number;
  skipped: number;
}

interface SyncMetadata {
  appId: string;
  itemId?: string;
}

interface AppItemOptions {
  appId: string;
  openInNewTab: boolean;
  showTitle: boolean;
  descriptionDisplayMode: "hidden";
  layout: "column";
  pingEnabled: boolean;
}

type AppRow = InferSelectModel<typeof apps>;

type BoardWithRelations = NonNullable<Awaited<ReturnType<typeof loadBoardsWithRelationsAsync>>>[number];

type BoardItem = BoardWithRelations["items"][number];

const createSyncKey = (service: DiscoveredService) => `${service.host}/${service.containerId}`;

const appsMatchByHref = (app: Pick<AppRow, "href">, href: string) => app.href === href;

export const syncDiscoveredServicesAsync = async (
  discoveredServices: DiscoveredService[],
  options: SyncDiscoveredServicesOptions = {},
): Promise<SyncDiscoveredServicesResult> => {
  const itemWidth = options.defaultItemWidth ?? 1;
  const itemHeight = options.defaultItemHeight ?? 1;
  const result: SyncDiscoveredServicesResult = { created: 0, updated: 0, skipped: 0 };
  const syncMetadata = new Map<string, SyncMetadata>();
  const existingApps = await db.query.apps.findMany();
  const existingSources = await db.query.dockerAppSources.findMany();
  const boardList = await loadBoardsWithRelationsAsync();

  const appsToInsert: InferInsertModel<typeof apps>[] = [];
  const appsToUpdate: { id: string; values: Partial<InferInsertModel<typeof apps>> }[] = [];
  const sectionsToInsert: InferInsertModel<typeof sections>[] = [];
  const itemsToInsert: InferInsertModel<typeof items>[] = [];
  const itemLayoutsToInsert: InferInsertModel<typeof itemLayouts>[] = [];

  const pendingSectionsByBoard = new Map<string, InferInsertModel<typeof sections>[]>();
  const sectionYOffsetByBoard = new Map<string, number>();
  const itemYOffsetBySection = new Map<string, number>();
  const pendingItemLayouts: InferInsertModel<typeof itemLayouts>[] = [];

  for (const service of discoveredServices) {
    const syncKey = createSyncKey(service);

    if (syncMetadata.has(syncKey)) {
      result.skipped += 1;
      continue;
    }

    const board = resolveTargetBoard(boardList, service, options.targetBoardName);
    if (!board) {
      logger.warn("No target board found for discovered service", { syncKey, boardName: service.boardName });
      result.skipped += 1;
      continue;
    }

    const firstLayout = getFirstLayout(board.layouts);
    if (!firstLayout) {
      logger.warn("Board has no layouts for discovered service", { boardId: board.id, syncKey });
      result.skipped += 1;
      continue;
    }

    const existingSource = existingSources.find(
      (source) => source.host === service.host && source.externalId === service.externalId,
    );
    const existingApp = existingSource
      ? existingApps.find((app) => app.id === existingSource.appId)
      : existingApps.find((app) => appsMatchByHref(app, service.href));
    let appId: string;
    let wasCreated = false;
    let wasUpdated = false;

    if (existingApp) {
      appId = existingApp.id;
      const updateValues = buildAppUpdateValues(service, existingApp);
      if (updateValues) {
        appsToUpdate.push({ id: appId, values: updateValues });
        wasUpdated = true;
        Object.assign(existingApp, updateValues);
      }
    } else {
      appId = createId();
      const newApp = buildAppInsert(service, appId);
      appsToInsert.push(newApp);
      existingApps.push(newApp as AppRow);
      wasCreated = true;
    }

    const categorySection = findOrCreateCategorySection(
      board,
      service.group,
      sectionsToInsert,
      pendingSectionsByBoard,
      sectionYOffsetByBoard,
    );

    const existingItem = findAppItemForApp(board.items, itemsToInsert, pendingItemLayouts, appId, categorySection.id);

    if (!existingItem) {
      const newItemId = createId();
      const yOffset = getNextItemYOffset(
        board,
        categorySection.id,
        firstLayout.id,
        itemYOffsetBySection,
        pendingItemLayouts,
        itemHeight,
      );

      const newItemLayouts = board.layouts.map((layout) => ({
        itemId: newItemId,
        sectionId: categorySection.id,
        layoutId: layout.id,
        xOffset: 0,
        yOffset,
        width: itemWidth,
        height: itemHeight,
      }));

      itemsToInsert.push({
        id: newItemId,
        boardId: board.id,
        kind: "app",
        options: SuperJSON.stringify(buildAppItemOptions(appId, service, options)),
        advancedOptions: SuperJSON.stringify({
          title: null,
          customCssClasses: [],
          borderColor: "",
        }),
      });

      itemLayoutsToInsert.push(...newItemLayouts);
      pendingItemLayouts.push(...newItemLayouts);
      syncMetadata.set(syncKey, { appId, itemId: newItemId });
      wasCreated = true;
    } else {
      syncMetadata.set(syncKey, { appId, itemId: existingItem.id });
    }

    if (wasCreated) {
      result.created += 1;
    } else if (wasUpdated) {
      result.updated += 1;
    } else {
      result.skipped += 1;
    }
  }

  const sourcesToUpsert: InferInsertModel<typeof dockerAppSources>[] = [];
  for (const [syncKey, meta] of syncMetadata.entries()) {
    const service = discoveredServices.find((svc) => createSyncKey(svc) === syncKey);
    if (!service) continue;

    const board = resolveTargetBoard(boardList, service, options.targetBoardName);
    if (!board) continue;

    sourcesToUpsert.push({
      host: service.host,
      containerId: service.containerId,
      externalId: service.externalId,
      appId: meta.appId,
      boardId: board.id,
      itemId: meta.itemId ?? null,
    });
  }

  if (
    appsToInsert.length === 0 &&
    appsToUpdate.length === 0 &&
    sectionsToInsert.length === 0 &&
    itemsToInsert.length === 0 &&
    sourcesToUpsert.length === 0
  ) {
    return result;
  }

  const insertCollection = createDbInsertCollectionForTransaction(["apps", "sections", "items", "itemLayouts"]);
  insertCollection.apps.push(...appsToInsert);
  insertCollection.sections.push(...sectionsToInsert);
  insertCollection.items.push(...itemsToInsert);
  insertCollection.itemLayouts.push(...itemLayoutsToInsert);

  await handleTransactionsAsync(db, {
    async handleAsync(innerDb) {
      for (const { id, values } of appsToUpdate) {
        await innerDb.update(apps as never).set(values).where(eq(apps.id, id));
      }
      await insertCollection.insertAllAsync(innerDb);
      const table = dockerAppSources as never;
      for (const source of sourcesToUpsert) {
        const existing = await innerDb.query.dockerAppSources.findFirst({
          where: and(eq(dockerAppSources.host, source.host), eq(dockerAppSources.containerId, source.containerId)),
        });
        if (existing) {
          await innerDb
            .update(table)
            .set({ appId: source.appId, boardId: source.boardId, itemId: source.itemId, externalId: source.externalId })
            .where(and(eq(dockerAppSources.host, source.host), eq(dockerAppSources.containerId, source.containerId)));
        } else {
          await innerDb.insert(table).values(source as never);
        }
      }
    },
    handleSync(innerDb) {
      for (const { id, values } of appsToUpdate) {
        innerDb.update(apps as never).set(values).where(eq(apps.id, id)).run();
      }
      insertCollection.insertAll(innerDb);
      for (const source of sourcesToUpsert) {
        try {
          innerDb.insert(dockerAppSources).values(source).run();
        } catch {
          innerDb
            .update(dockerAppSources)
            .set({ appId: source.appId, boardId: source.boardId, itemId: source.itemId, externalId: source.externalId })
            .where(and(eq(dockerAppSources.host, source.host), eq(dockerAppSources.containerId, source.containerId)))
            .run();
        }
      }
    },
  });

  return result;
};

const loadBoardsWithRelationsAsync = async () =>
  db.query.boards.findMany({
    orderBy: asc(boards.name),
    with: {
      layouts: true,
      sections: true,
      items: {
        with: {
          layouts: true,
        },
      },
    },
  });

const resolveTargetBoard = (
  boardList: BoardWithRelations[],
  service: DiscoveredService,
  defaultBoardName: string | null | undefined,
) => {
  const boardName = service.boardName ?? defaultBoardName ?? undefined;
  if (boardName) {
    return boardList.find((board) => board.name === boardName) ?? boardList.at(0);
  }
  return boardList.at(0);
};

const getFirstLayout = (boardLayouts: InferSelectModel<typeof layouts>[]) =>
  [...boardLayouts].sort((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint).at(0);

const buildAppInsert = (service: DiscoveredService, appId: string): InferInsertModel<typeof apps> => ({
  id: appId,
  name: service.name,
  description: service.description ?? null,
  iconUrl: service.icon ?? "",
  href: service.href,
  pingUrl: service.pingUrl ?? null,
});

const buildAppUpdateValues = (
  service: DiscoveredService,
  existingApp: AppRow,
): Partial<InferInsertModel<typeof apps>> | null => {
  const values: Partial<InferInsertModel<typeof apps>> = {};

  if (existingApp.name !== service.name) {
    values.name = service.name;
  }
  if (existingApp.href !== service.href) {
    values.href = service.href;
  }
  if (service.icon !== undefined && existingApp.iconUrl !== service.icon) {
    values.iconUrl = service.icon;
  }
  if (service.description !== undefined && existingApp.description !== service.description) {
    values.description = service.description;
  }
  if (service.pingUrl !== undefined && existingApp.pingUrl !== service.pingUrl) {
    values.pingUrl = service.pingUrl;
  }

  return Object.keys(values).length > 0 ? values : null;
};

const buildAppItemOptions = (
  appId: string,
  service: DiscoveredService,
  options: SyncDiscoveredServicesOptions,
): AppItemOptions => ({
  appId,
  openInNewTab: true,
  showTitle: true,
  descriptionDisplayMode: "hidden",
  layout: "column",
  pingEnabled: service.pingUrl
    ? true
    : !(options.forceDisableStatus ?? false) && (options.enableStatusByDefault ?? true),
});

const findOrCreateCategorySection = (
  board: BoardWithRelations,
  groupName: string,
  sectionsToInsert: InferInsertModel<typeof sections>[],
  pendingSectionsByBoard: Map<string, InferInsertModel<typeof sections>[]>,
  sectionYOffsetByBoard: Map<string, number>,
): InferInsertModel<typeof sections> & { id: string } => {
  const pendingForBoard = pendingSectionsByBoard.get(board.id) ?? [];
  const pendingMatch = pendingForBoard.find((section) => section.kind === "category" && section.name === groupName);
  if (pendingMatch) {
    return pendingMatch as InferInsertModel<typeof sections> & { id: string };
  }

  const existingSection = board.sections.find((section) => section.kind === "category" && section.name === groupName);
  if (existingSection) {
    return existingSection;
  }

  const categorySections = board.sections.filter((section) => section.kind === "category");
  const pendingCategorySections = pendingForBoard.filter((section) => section.kind === "category");
  const maxYOffset = Math.max(
    0,
    ...categorySections.map((section) => section.yOffset ?? 0),
    ...pendingCategorySections.map((section) => section.yOffset ?? 0),
    sectionYOffsetByBoard.get(board.id) ?? 0,
  );
  const yOffset = maxYOffset + 1;
  sectionYOffsetByBoard.set(board.id, yOffset);

  const newSection: InferInsertModel<typeof sections> = {
    id: createId(),
    boardId: board.id,
    kind: "category",
    xOffset: 0,
    yOffset,
    name: groupName,
    options: emptySuperJSON,
  };

  sectionsToInsert.push(newSection);
  board.sections.push(newSection as BoardWithRelations["sections"][number]);
  pendingSectionsByBoard.set(board.id, [...pendingForBoard, newSection]);

  return newSection as InferInsertModel<typeof sections> & { id: string };
};

const findAppItemForApp = (
  boardItems: BoardItem[],
  pendingItems: InferInsertModel<typeof items>[],
  pendingLayouts: InferInsertModel<typeof itemLayouts>[],
  appId: string,
  sectionId: string,
) => {
  const dbMatch = boardItems.find((item) => itemMatchesAppInSection(item, appId, sectionId));
  if (dbMatch) {
    return dbMatch;
  }

  const pendingMatch = pendingItems.find((item) => {
    if (item.kind !== "app") {
      return false;
    }
    const itemOptions = SuperJSON.parse<AppItemOptions>(item.options ?? emptySuperJSON);
    if (itemOptions.appId !== appId) {
      return false;
    }
    return pendingLayouts.some((layout) => layout.itemId === item.id && layout.sectionId === sectionId);
  });

  return pendingMatch ? { id: pendingMatch.id } : undefined;
};

const itemMatchesAppInSection = (item: BoardItem, appId: string, sectionId: string) => {
  if (item.kind !== "app") {
    return false;
  }

  const itemOptions = SuperJSON.parse<AppItemOptions>(item.options);
  if (itemOptions.appId !== appId) {
    return false;
  }

  return item.layouts.some((layout) => layout.sectionId === sectionId);
};

const getNextItemYOffset = (
  board: BoardWithRelations,
  sectionId: string,
  layoutId: string,
  itemYOffsetBySection: Map<string, number>,
  pendingLayouts: InferInsertModel<typeof itemLayouts>[],
  itemHeight: number,
) => {
  const sectionKey = `${board.id}/${sectionId}/${layoutId}`;
  const trackedYOffset = itemYOffsetBySection.get(sectionKey);
  if (trackedYOffset !== undefined) {
    const nextYOffset = trackedYOffset + itemHeight;
    itemYOffsetBySection.set(sectionKey, nextYOffset);
    return trackedYOffset;
  }

  const dbLayouts = board.items.flatMap((item) =>
    item.layouts.filter((layout) => layout.sectionId === sectionId && layout.layoutId === layoutId),
  );
  const pendingSectionLayouts = pendingLayouts.filter(
    (layout) => layout.sectionId === sectionId && layout.layoutId === layoutId,
  );

  const maxYOffset = [...dbLayouts, ...pendingSectionLayouts].reduce(
    (max, layout) => Math.max(max, layout.yOffset + layout.height),
    0,
  );

  itemYOffsetBySection.set(sectionKey, maxYOffset + itemHeight);
  return maxYOffset;
};
