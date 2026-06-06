import SuperJSON from "superjson";

import { createId } from "@homarr/common";
import { decryptSecretWithKey, encryptSecret } from "@homarr/common/server";
import type { Database } from "@homarr/db";
import { eq, handleTransactionsAsync } from "@homarr/db";
import { createDbInsertCollectionForTransaction } from "@homarr/db/collection";
import {
  boardGroupPermissions,
  groupMembers,
  groupPermissions,
  groups,
  integrationGroupPermissions,
  integrations,
  integrationSecrets,
  searchEngines,
  serverSettings,
  users,
} from "@homarr/db/schema";
import type { apps } from "@homarr/db/schema";
import type { IntegrationSecretKind } from "@homarr/definitions";

import { GROUP_REF_FIELDS, USER_DIRECT_FIELDS, USER_REF_FIELDS, refFieldToDbColumn } from "../entity-fields";
import { resolveEntities } from "../resolve-entities";
import type { HomarrBundleBoard, HomarrConfigBundle } from "../schema";
import { buildBoardInsertRow, mustGet, replaceAppRefsInValue, stringifyForDb } from "../utils";
import { loadExistingEntitiesAsync } from "./load-existing-entities";

export type ConfigImportReport = {
  boards: number;
  apps: number;
  integrations: number;
  groups: number;
  users: number;
  searchEngines: number;
  warnings: string[];
};

const reEncryptSecret = (encryptedValue: string, sourceKeyHex: string): `${string}.${string}` => {
  const sourceKey = Buffer.from(sourceKeyHex, "hex");
  const decrypted = decryptSecretWithKey(encryptedValue as `${string}.${string}`, sourceKey);
  return encryptSecret(decrypted);
};

const resolveRef = (map: Map<string, string>, ref: string | null | undefined): string | null => {
  if (!ref) return null;
  return map.get(ref) ?? null;
};

const resolveApps = (
  bundle: HomarrConfigBundle,
  existingApps: { id: string; name: string; iconUrl: string; href: string | null }[],
) =>
  resolveEntities(bundle.apps, existingApps, {
    getRef: (app) => app.ref,
    match: (bundle, existing) =>
      existing.name === bundle.name && existing.iconUrl === bundle.iconUrl && existing.href === bundle.href,
    toInsertRow: (app, id): (typeof apps.$inferInsert) => ({
      id,
      name: app.name,
      iconUrl: app.iconUrl,
      href: app.href,
      description: app.description ?? null,
      pingUrl: app.pingUrl ?? null,
    }),
  });

const resolveIntegrations = (
  bundle: HomarrConfigBundle,
  existingIntegrations: { id: string; kind: string; name: string; url: string }[],
) => {
  const result = resolveEntities(bundle.integrations, existingIntegrations, {
    getRef: (i) => i.ref,
    match: (bundle, existing) =>
      existing.kind === bundle.kind && existing.name === bundle.name && existing.url === bundle.url,
    toInsertRow: (integration, id): (typeof integrations.$inferInsert) => ({
      id,
      kind: integration.kind,
      name: integration.name,
      url: integration.url,
    }),
  });

  const secretRows: (typeof integrationSecrets.$inferInsert)[] = [];
  const secretWarnings: string[] = [];
  const sourceKey = bundle.encryptionKey;

  for (const bundleIntegration of bundle.integrations) {
    const newId = result.refToId.get(bundleIntegration.ref);
    if (!newId || existingIntegrations.some((e) => e.id === newId)) continue;

    for (const secret of bundleIntegration.secrets) {
      try {
        const reEncrypted = reEncryptSecret(secret.value, sourceKey);
        secretRows.push({
          integrationId: newId,
          kind: secret.kind as IntegrationSecretKind,
          value: reEncrypted,
          updatedAt: new Date(),
        });
      } catch {
        secretWarnings.push(`Failed to re-encrypt secret "${secret.kind}" for integration "${bundleIntegration.name}"`);
      }
    }
  }

  return {
    ...result,
    secretRows,
    warnings: [...result.warnings, ...secretWarnings],
  };
};

const resolveBoards = (
  bundle: HomarrConfigBundle,
  existingBoards: { id: string; name: string }[],
) => {
  const boardRefToId = new Map<string, string>();
  const boardsToCreate = new Set<string>();
  const warnings: string[] = [];
  const existingBoardNames = new Set(existingBoards.map((b) => b.name));

  for (const bundleBoard of bundle.boards) {
    if (existingBoardNames.has(bundleBoard.name)) {
      const existing = existingBoards.find((b) => b.name === bundleBoard.name);
      if (existing) {
        boardRefToId.set(bundleBoard.name, existing.id);
        if (bundleBoard.ref) boardRefToId.set(bundleBoard.ref, existing.id);
      }
      warnings.push(`Board "${bundleBoard.name}" already exists and was skipped`);
      continue;
    }
    const boardId = createId();
    boardRefToId.set(bundleBoard.name, boardId);
    if (bundleBoard.ref) boardRefToId.set(bundleBoard.ref, boardId);
    boardsToCreate.add(bundleBoard.name);
  }

  return { boardRefToId, boardsToCreate, warnings };
};

const resolveSearchEngines = (
  bundle: HomarrConfigBundle,
  existingSearchEngines: { id: string; short: string }[],
  integrationRefToId: Map<string, string>,
) => {
  const result = resolveEntities(bundle.searchEngines, existingSearchEngines, {
    getRef: (se) => se.ref,
    match: (bundle, existing) => existing.short === bundle.short,
    toInsertRow: (se, id): (typeof searchEngines.$inferInsert) => ({
      id,
      iconUrl: se.iconUrl,
      name: se.name,
      short: se.short,
      description: se.description ?? null,
      urlTemplate: se.urlTemplate ?? null,
      type: se.type as never,
      integrationId: resolveRef(integrationRefToId, se.integrationRef),
    }),
    skipMessage: (se) => `Search engine "${se.name}" (short: ${se.short}) already exists and was skipped`,
  });

  for (const existing of existingSearchEngines) {
    result.refToId.set(existing.id, existing.id);
  }

  return result;
};

/**
 * Uses USER_DIRECT_FIELDS and USER_REF_FIELDS to build user insert rows.
 * Adding a new user preference to USER_DIRECT_FIELDS automatically
 * includes it here — no other changes needed.
 */
const resolveUsers = (
  bundle: HomarrConfigBundle,
  existingUsers: { id: string; email: string | null }[],
  refMaps: Record<string, Map<string, string>>,
) =>
  resolveEntities(bundle.users ?? [], existingUsers, {
    getRef: (u) => u.ref,
    match: (bundle, existing) => Boolean(bundle.email) && existing.email === bundle.email,
    toInsertRow: (bundleUser, id): (typeof users.$inferInsert) => {
      const row: Record<string, unknown> = { id };

      for (const field of USER_DIRECT_FIELDS) {
        row[field] = (bundleUser as Record<string, unknown>)[field] ?? null;
      }

      for (const [refField, mapName] of Object.entries(USER_REF_FIELDS)) {
        const dbCol = refFieldToDbColumn(refField);
        row[dbCol] = resolveRef(refMaps[mapName]!, (bundleUser as Record<string, unknown>)[refField] as string);
      }

      return row as typeof users.$inferInsert;
    },
  });

const resolveGroups = (
  bundle: HomarrConfigBundle,
  existingGroups: { id: string; name: string }[],
  existingMembershipKeys: Set<string>,
  refMaps: Record<string, Map<string, string>>,
) => {
  const result = resolveEntities(bundle.groups, existingGroups, {
    getRef: (g) => g.ref,
    match: (bundle, existing) => existing.name === bundle.name,
    toInsertRow: (bundleGroup, id): (typeof groups.$inferInsert) => {
      const row: Record<string, unknown> = { id, name: bundleGroup.name, position: bundleGroup.position };

      for (const [refField, mapName] of Object.entries(GROUP_REF_FIELDS)) {
        const dbCol = refFieldToDbColumn(refField);
        row[dbCol] = resolveRef(refMaps[mapName]!, (bundleGroup as Record<string, unknown>)[refField] as string);
      }

      return row as typeof groups.$inferInsert;
    },
    skipMessage: (g) => `Group "${g.name}" already exists and was skipped`,
  });

  const groupPermRows: (typeof groupPermissions.$inferInsert)[] = [];
  const boardGroupPermRows: (typeof boardGroupPermissions.$inferInsert)[] = [];
  const integrationGroupPermRows: (typeof integrationGroupPermissions.$inferInsert)[] = [];
  const memberRows: (typeof groupMembers.$inferInsert)[] = [];
  const extraWarnings: string[] = [];

  for (const bundleGroup of bundle.groups) {
    const groupId = result.refToId.get(bundleGroup.ref);
    if (!groupId || existingGroups.some((g) => g.id === groupId)) continue;

    for (const perm of bundleGroup.permissions) {
      groupPermRows.push({ groupId, permission: perm as never });
    }
  }

  for (const bundleGroup of bundle.groups) {
    const groupId = result.refToId.get(bundleGroup.ref);
    if (!groupId) continue;

    for (const bp of bundleGroup.boardPermissions) {
      const resolvedBoardId = resolveRef(refMaps.boards!, bp.boardRef);
      if (!resolvedBoardId) {
        extraWarnings.push(`Board permission for group "${bundleGroup.name}" references unknown board, skipped`);
        continue;
      }
      boardGroupPermRows.push({ groupId, boardId: resolvedBoardId, permission: bp.permission as never });
    }

    for (const ip of bundleGroup.integrationPermissions) {
      const resolvedIntegrationId = resolveRef(refMaps.integrations!, ip.integrationRef);
      if (resolvedIntegrationId) {
        integrationGroupPermRows.push({ groupId, integrationId: resolvedIntegrationId, permission: ip.permission as never });
      }
    }

    for (const memberRef of bundleGroup.memberRefs ?? []) {
      const userId = refMaps.users!.get(memberRef);
      if (!userId) continue;
      const key = `${groupId}:${userId}`;
      if (existingMembershipKeys.has(key)) continue;
      memberRows.push({ groupId, userId });
    }
  }

  return {
    ...result,
    groupPermRows,
    boardGroupPermRows,
    integrationGroupPermRows,
    memberRows,
    warnings: [...result.warnings, ...extraWarnings],
  };
};

const resolveServerSettings = (
  bundle: HomarrConfigBundle,
  existingSettings: { settingKey: string; value: string }[],
) => {
  const existingKeys = new Set(existingSettings.map((s) => s.settingKey));
  const toInsert: (typeof serverSettings.$inferInsert)[] = [];
  const toUpdate: { key: string; value: string }[] = [];

  for (const [key, value] of Object.entries(bundle.serverSettings)) {
    const serialized = SuperJSON.stringify(value);
    if (existingKeys.has(key)) {
      toUpdate.push({ key, value: serialized });
    } else {
      toInsert.push({ settingKey: key, value: serialized });
    }
  }

  return { toInsert, toUpdate };
};

const buildBoardInserts = (
  bundle: HomarrConfigBundle,
  boardsToCreate: Set<string>,
  boardRefToId: Map<string, string>,
  appRefToId: Map<string, string>,
  integrationRefToId: Map<string, string>,
  creatorId: string | null,
  insertCollection: Pick<ReturnType<typeof createDbInsertCollectionForTransaction>, "boards" | "layouts" | "sections" | "sectionLayouts" | "items" | "itemLayouts" | "integrationItems">,
) => {
  let boardsCreated = 0;

  for (const bundleBoard of bundle.boards) {
    if (!boardsToCreate.has(bundleBoard.name)) continue;
    const boardId = boardRefToId.get(bundleBoard.name);
    if (!boardId) continue;

    boardsCreated++;
    const sourceBoard = bundleBoard as HomarrBundleBoard;
    const layoutRefToId = new Map(sourceBoard.layouts.map((l) => [l.ref, createId()]));
    const sectionRefToId = new Map(sourceBoard.sections.map((s) => [s.ref, createId()]));
    const itemRefToId = new Map(sourceBoard.items.map((i) => [i.ref, createId()]));

    insertCollection.boards.push(buildBoardInsertRow(boardId, sourceBoard.name, creatorId, sourceBoard.settings));

    for (const layout of sourceBoard.layouts) {
      insertCollection.layouts.push({
        id: mustGet(layoutRefToId, layout.ref),
        boardId,
        name: layout.name,
        columnCount: layout.columnCount,
        breakpoint: layout.breakpoint,
      });
    }

    for (const section of sourceBoard.sections) {
      insertCollection.sections.push({
        id: mustGet(sectionRefToId, section.ref),
        boardId,
        kind: section.kind,
        name: section.name ?? null,
        xOffset: section.xOffset ?? null,
        yOffset: section.yOffset ?? null,
        options: section.options ? stringifyForDb(section.options) : undefined,
      });

      for (const layout of section.layouts ?? []) {
        insertCollection.sectionLayouts.push({
          sectionId: mustGet(sectionRefToId, section.ref),
          layoutId: mustGet(layoutRefToId, layout.layoutRef),
          parentSectionId: mustGet(sectionRefToId, layout.parentSectionRef),
          xOffset: layout.xOffset,
          yOffset: layout.yOffset,
          width: layout.width,
          height: layout.height,
        });
      }
    }

    for (const item of sourceBoard.items) {
      const optionsWithRefs = replaceAppRefsInValue(item.options, appRefToId) as Record<string, unknown>;
      insertCollection.items.push({
        id: mustGet(itemRefToId, item.ref),
        boardId,
        kind: item.kind,
        options: stringifyForDb(optionsWithRefs),
        advancedOptions: stringifyForDb(item.advancedOptions),
      });

      for (const layout of item.layouts) {
        insertCollection.itemLayouts.push({
          itemId: mustGet(itemRefToId, item.ref),
          sectionId: mustGet(sectionRefToId, layout.sectionRef),
          layoutId: mustGet(layoutRefToId, layout.layoutRef),
          xOffset: layout.x,
          yOffset: layout.y,
          width: layout.w,
          height: layout.h,
        });
      }

      for (const integrationRef of item.integrationRefs) {
        const integrationId = integrationRefToId.get(integrationRef);
        if (integrationId) {
          insertCollection.integrationItems.push({
            itemId: mustGet(itemRefToId, item.ref),
            integrationId,
          });
        }
      }
    }
  }

  return boardsCreated;
};

export const importFullConfigAsync = async (
  db: Database,
  bundle: HomarrConfigBundle,
  creatorId: string | null,
): Promise<ConfigImportReport> => {
  const existing = await loadExistingEntitiesAsync(db);
  const existingMembershipKeys = new Set(existing.groupMembers.map((gm) => `${gm.groupId}:${gm.userId}`));

  const resolvedApps = resolveApps(bundle, existing.apps);
  const resolvedIntegrations = resolveIntegrations(bundle, existing.integrations);
  const resolvedBoardsResult = resolveBoards(bundle, existing.boards);
  const resolvedSearchEngines = resolveSearchEngines(bundle, existing.searchEngines, resolvedIntegrations.refToId);

  const refMaps: Record<string, Map<string, string>> = {
    boards: resolvedBoardsResult.boardRefToId,
    searchEngines: resolvedSearchEngines.refToId,
    integrations: resolvedIntegrations.refToId,
    users: new Map<string, string>(),
  };

  const resolvedUsers = resolveUsers(bundle, existing.users, refMaps);
  refMaps.users = resolvedUsers.refToId;

  const resolvedGroups = resolveGroups(bundle, existing.groups, existingMembershipKeys, refMaps);

  const resolvedSettings = resolveServerSettings(bundle, existing.serverSettings);

  const insertCollection = createDbInsertCollectionForTransaction([
    "apps",
    "integrations",
    "integrationSecrets",
    "boards",
    "layouts",
    "sections",
    "sectionLayouts",
    "items",
    "itemLayouts",
    "integrationItems",
    "searchEngines",
    "users",
    "groups",
    "groupPermissions",
    "groupMembers",
    "boardGroupPermissions",
    "integrationGroupPermissions",
  ]);

  insertCollection.apps.push(...resolvedApps.rows);
  insertCollection.integrations.push(...resolvedIntegrations.rows);
  insertCollection.integrationSecrets.push(...resolvedIntegrations.secretRows);
  insertCollection.searchEngines.push(...resolvedSearchEngines.rows);
  insertCollection.users.push(...resolvedUsers.rows);
  insertCollection.groups.push(...resolvedGroups.rows);
  insertCollection.groupPermissions.push(...resolvedGroups.groupPermRows);
  insertCollection.groupMembers.push(...resolvedGroups.memberRows);
  insertCollection.boardGroupPermissions.push(...resolvedGroups.boardGroupPermRows);
  insertCollection.integrationGroupPermissions.push(...resolvedGroups.integrationGroupPermRows);

  const boardsCreated = buildBoardInserts(
    bundle,
    resolvedBoardsResult.boardsToCreate,
    resolvedBoardsResult.boardRefToId,
    resolvedApps.refToId,
    resolvedIntegrations.refToId,
    creatorId,
    insertCollection,
  );

  await handleTransactionsAsync(db, {
    async handleAsync(innerDb, dbSchema) {
      await innerDb.transaction(async (trx) => {
        await insertCollection.insertAllAsync(trx);
        if (resolvedSettings.toInsert.length > 0) {
          await trx.insert(dbSchema.serverSettings).values(resolvedSettings.toInsert as never);
        }
        for (const setting of resolvedSettings.toUpdate) {
          await trx
            .update(dbSchema.serverSettings)
            .set({ value: setting.value })
            .where(eq(dbSchema.serverSettings.settingKey, setting.key));
        }
      });
    },
    handleSync(innerDb) {
      innerDb.transaction((trx) => {
        insertCollection.insertAll(trx);
        if (resolvedSettings.toInsert.length > 0) {
          trx.insert(serverSettings).values(resolvedSettings.toInsert as never).run();
        }
        for (const setting of resolvedSettings.toUpdate) {
          trx
            .update(serverSettings)
            .set({ value: setting.value })
            .where(eq(serverSettings.settingKey, setting.key))
            .run();
        }
      });
    },
  });

  const warnings = [
    ...resolvedIntegrations.warnings,
    ...resolvedBoardsResult.warnings,
    ...resolvedSearchEngines.warnings,
    ...resolvedGroups.warnings,
  ];

  return {
    boards: boardsCreated,
    apps: resolvedApps.rows.length,
    integrations: resolvedIntegrations.rows.length,
    groups: resolvedGroups.rows.length,
    users: resolvedUsers.rows.length,
    searchEngines: resolvedSearchEngines.rows.length,
    warnings,
  };
};
