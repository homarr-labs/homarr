import SuperJSON from "superjson";

import { createId } from "@homarr/common";
import { decryptSecretWithKey, encryptSecret } from "@homarr/common/server";
import type { Database } from "@homarr/db";
import { eq, handleTransactionsAsync } from "@homarr/db";
import { createDbInsertCollectionForTransaction } from "@homarr/db/collection";
import {
  apps,
  boardGroupPermissions,
  boards,
  groupPermissions,
  groups,
  integrationGroupPermissions,
  integrations,
  integrationSecrets,
  itemLayouts,
  items,
  layouts,
  searchEngines,
  sectionLayouts,
  sections,
  serverSettings,
} from "@homarr/db/schema";
import { backgroundImageAttachments, backgroundImageRepeats, backgroundImageSizes } from "@homarr/definitions";
import type { IntegrationSecretKind } from "@homarr/definitions";

import type { HomarrBundleBoard, HomarrConfigBundle } from "../schema";
import { replaceAppRefsInValue, stringifyForDb } from "../utils";

export type ConfigImportReport = {
  boards: number;
  apps: number;
  integrations: number;
  groups: number;
  searchEngines: number;
  warnings: string[];
};

const mustGet = <T>(map: Map<string, T>, key: string): T => {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`Missing map entry for key "${key}"`);
  }
  return value;
};

const reEncryptSecret = (encryptedValue: string, sourceKeyHex: string): `${string}.${string}` => {
  const sourceKey = Buffer.from(sourceKeyHex, "hex");
  const decrypted = decryptSecretWithKey(encryptedValue as `${string}.${string}`, sourceKey);
  return encryptSecret(decrypted);
};

export const importFullConfigAsync = async (
  db: Database,
  bundle: HomarrConfigBundle,
  creatorId: string | null,
): Promise<ConfigImportReport> => {
  const warnings: string[] = [];
  const sourceKey = bundle.encryptionKey;

  const existingApps = await db.query.apps.findMany();
  const existingIntegrations = await db.query.integrations.findMany();
  const existingBoards = await db.query.boards.findMany();
  const existingGroups = await db.select().from(groups);
  const existingSearchEngines = await db.select().from(searchEngines);

  const existingBoardNames = new Set(existingBoards.map((b) => b.name));
  const existingGroupNames = new Set(existingGroups.map((g) => g.name));
  const existingSearchEngineShorts = new Set(existingSearchEngines.map((se) => se.short));

  const appRefToId = new Map<string, string>();
  const appsToInsert: typeof apps.$inferInsert[] = [];

  for (const bundleApp of bundle.apps) {
    const existing = existingApps.find(
      (a) => a.name === bundleApp.name && a.iconUrl === bundleApp.iconUrl && a.href === bundleApp.href,
    );

    if (existing) {
      appRefToId.set(bundleApp.ref, existing.id);
      continue;
    }

    const newId = createId();
    appRefToId.set(bundleApp.ref, newId);
    appsToInsert.push({
      id: newId,
      name: bundleApp.name,
      iconUrl: bundleApp.iconUrl,
      href: bundleApp.href,
      description: bundleApp.description ?? null,
      pingUrl: bundleApp.pingUrl ?? null,
    });
  }

  const integrationRefToId = new Map<string, string>();
  const integrationsToInsert: typeof integrations.$inferInsert[] = [];
  const secretsToInsert: typeof integrationSecrets.$inferInsert[] = [];

  for (const bundleIntegration of bundle.integrations) {
    const existing = existingIntegrations.find(
      (i) =>
        i.kind === bundleIntegration.kind &&
        i.name === bundleIntegration.name &&
        i.url === bundleIntegration.url,
    );

    if (existing) {
      integrationRefToId.set(bundleIntegration.ref, existing.id);
      continue;
    }

    const newId = createId();
    integrationRefToId.set(bundleIntegration.ref, newId);
    integrationsToInsert.push({
      id: newId,
      kind: bundleIntegration.kind,
      name: bundleIntegration.name,
      url: bundleIntegration.url,
    });

    for (const secret of bundleIntegration.secrets) {
      try {
        const reEncrypted = reEncryptSecret(secret.value, sourceKey);
        secretsToInsert.push({
          integrationId: newId,
          kind: secret.kind as IntegrationSecretKind,
          value: reEncrypted,
          updatedAt: new Date(),
        });
      } catch {
        warnings.push(`Failed to re-encrypt secret "${secret.kind}" for integration "${bundleIntegration.name}"`);
      }
    }
  }

  const groupRefToId = new Map<string, string>();
  const groupsToInsert: typeof groups.$inferInsert[] = [];
  const groupPermsToInsert: typeof groupPermissions.$inferInsert[] = [];
  const boardGroupPermsToInsert: typeof boardGroupPermissions.$inferInsert[] = [];
  const integrationGroupPermsToInsert: typeof integrationGroupPermissions.$inferInsert[] = [];

  const boardRefToId = new Map<string, string>();

  for (const bundleBoard of bundle.boards) {
    if (existingBoardNames.has(bundleBoard.name)) {
      warnings.push(`Board "${bundleBoard.name}" already exists and was skipped`);
      continue;
    }
    const boardId = createId();
    boardRefToId.set(bundleBoard.name, boardId);
  }

  for (const bundleGroup of bundle.groups) {
    if (existingGroupNames.has(bundleGroup.name)) {
      const existing = existingGroups.find((g) => g.name === bundleGroup.name);
      if (existing) {
        groupRefToId.set(bundleGroup.ref, existing.id);
      }
      warnings.push(`Group "${bundleGroup.name}" already exists and was skipped`);
      continue;
    }

    const newId = createId();
    groupRefToId.set(bundleGroup.ref, newId);
    groupsToInsert.push({
      id: newId,
      name: bundleGroup.name,
      position: bundleGroup.position,
    });

    for (const perm of bundleGroup.permissions) {
      groupPermsToInsert.push({
        groupId: newId,
        permission: perm as never,
      });
    }
  }

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
    "groups",
    "groupPermissions",
    "boardGroupPermissions",
    "integrationGroupPermissions",
  ]);

  insertCollection.apps.push(...appsToInsert);
  insertCollection.integrations.push(...integrationsToInsert);
  insertCollection.integrationSecrets.push(...secretsToInsert);
  insertCollection.groups.push(...groupsToInsert);
  insertCollection.groupPermissions.push(...groupPermsToInsert);

  let boardsCreated = 0;
  for (const bundleBoard of bundle.boards) {
    const boardId = boardRefToId.get(bundleBoard.name);
    if (!boardId) continue;

    boardsCreated++;
    const sourceBoard = bundleBoard as HomarrBundleBoard;
    const layoutRefToId = new Map(sourceBoard.layouts.map((l) => [l.ref, createId()]));
    const sectionRefToId = new Map(sourceBoard.sections.map((s) => [s.ref, createId()]));
    const itemRefToId = new Map(sourceBoard.items.map((i) => [i.ref, createId()]));

    insertCollection.boards.push({
      id: boardId,
      name: sourceBoard.name,
      creatorId,
      isPublic: sourceBoard.settings.isPublic ?? false,
      pageTitle: sourceBoard.settings.pageTitle ?? null,
      metaTitle: sourceBoard.settings.metaTitle ?? null,
      logoImageUrl: sourceBoard.settings.logoImageUrl ?? null,
      faviconImageUrl: sourceBoard.settings.faviconImageUrl ?? null,
      backgroundImageUrl: sourceBoard.settings.backgroundImageUrl ?? null,
      backgroundImageAttachment:
        sourceBoard.settings.backgroundImageAttachment ?? backgroundImageAttachments.defaultValue,
      backgroundImageRepeat: sourceBoard.settings.backgroundImageRepeat ?? backgroundImageRepeats.defaultValue,
      backgroundImageSize: sourceBoard.settings.backgroundImageSize ?? backgroundImageSizes.defaultValue,
      primaryColor: sourceBoard.settings.primaryColor,
      secondaryColor: sourceBoard.settings.secondaryColor,
      opacity: sourceBoard.settings.opacity,
      customCss: sourceBoard.settings.customCss ?? null,
      iconColor: sourceBoard.settings.iconColor ?? null,
      itemRadius: sourceBoard.settings.itemRadius,
      disableStatus: sourceBoard.settings.disableStatus ?? false,
    });

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

  for (const bundleSe of bundle.searchEngines) {
    if (existingSearchEngineShorts.has(bundleSe.short)) {
      warnings.push(`Search engine "${bundleSe.name}" (short: ${bundleSe.short}) already exists and was skipped`);
      continue;
    }

    insertCollection.searchEngines.push({
      id: createId(),
      iconUrl: bundleSe.iconUrl,
      name: bundleSe.name,
      short: bundleSe.short,
      description: bundleSe.description ?? null,
      urlTemplate: bundleSe.urlTemplate ?? null,
      type: bundleSe.type as never,
      integrationId: bundleSe.integrationRef ? (integrationRefToId.get(bundleSe.integrationRef) ?? null) : null,
    });
  }

  for (const bundleGroup of bundle.groups) {
    const groupId = groupRefToId.get(bundleGroup.ref);
    if (!groupId) continue;

    for (const bp of bundleGroup.boardPermissions) {
      const resolvedBoardId = boardRefToId.get(bp.boardRef) ?? bp.boardRef;
      boardGroupPermsToInsert.push({
        groupId,
        boardId: resolvedBoardId,
        permission: bp.permission as never,
      });
    }

    for (const ip of bundleGroup.integrationPermissions) {
      const resolvedIntegrationId = integrationRefToId.get(ip.integrationRef);
      if (resolvedIntegrationId) {
        integrationGroupPermsToInsert.push({
          groupId,
          integrationId: resolvedIntegrationId,
          permission: ip.permission as never,
        });
      }
    }
  }

  insertCollection.boardGroupPermissions.push(...boardGroupPermsToInsert);
  insertCollection.integrationGroupPermissions.push(...integrationGroupPermsToInsert);

  await handleTransactionsAsync(db, {
    async handleAsync(innerDb) {
      await insertCollection.insertAllAsync(innerDb);
    },
    handleSync(innerDb) {
      insertCollection.insertAll(innerDb);
    },
  });

  for (const [key, value] of Object.entries(bundle.serverSettings)) {
    try {
      const existing = await db.query.serverSettings.findFirst({
        where: (table, { eq }) => eq(table.settingKey, key),
      });

      if (existing) {
        await db
          .update(serverSettings)
          .set({ value: SuperJSON.stringify(value) })
          .where(eq(serverSettings.settingKey, key));
      } else {
        await db.insert(serverSettings).values({
          settingKey: key,
          value: SuperJSON.stringify(value),
        });
      }
    } catch {
      warnings.push(`Failed to import server setting "${key}"`);
    }
  }

  return {
    boards: boardsCreated,
    apps: appsToInsert.length,
    integrations: integrationsToInsert.length,
    groups: groupsToInsert.length,
    searchEngines: bundle.searchEngines.length - warnings.filter((w) => w.includes("Search engine")).length,
    warnings,
  };
};
