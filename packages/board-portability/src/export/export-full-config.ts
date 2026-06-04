import SuperJSON from "superjson";

import { env } from "@homarr/common/env";
import type { Database } from "@homarr/db";
import {
  apps,
  boardGroupPermissions,
  boards,
  groupPermissions,
  groups,
  integrationGroupPermissions,
  integrations,
  integrationSecrets,
  searchEngines,
  serverSettings,
} from "@homarr/db/schema";
import type { IntegrationSecretKind } from "@homarr/definitions";
import { itemAdvancedOptionsSchema } from "@homarr/validation/shared";

import { CONFIG_BUNDLE_FORMAT_VERSION } from "../config-bundle-compat";
import type { HomarrBundleApp, HomarrConfigBundle } from "../schema";
import { parseStoredValue, replaceAppIdsInValue } from "../utils";
import { loadBoardGraphAsync } from "./load-board-graph";

const buildBoardSettings = (board: NonNullable<Awaited<ReturnType<typeof loadBoardGraphAsync>>>) => ({
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
  isPublic: board.isPublic,
});

export const exportFullConfigAsync = async (
  db: Database,
  homarrVersion: string,
): Promise<{ content: string; filename: string }> => {
  const allBoards = await db.query.boards.findMany();
  const allApps = await db.query.apps.findMany();
  const allIntegrations = await db.select().from(integrations);
  const allSecrets = await db.select().from(integrationSecrets);
  const allServerSettings = await db.select().from(serverSettings);
  const allSearchEngines = await db.select().from(searchEngines);
  const allGroups = await db.select().from(groups);
  const allGroupPermissions = await db.select().from(groupPermissions);
  const allBoardGroupPermissions = await db.select().from(boardGroupPermissions);
  const allIntegrationGroupPermissions = await db.select().from(integrationGroupPermissions);

  const secretsByIntegration = new Map<string, { kind: IntegrationSecretKind; value: string }[]>();
  for (const secret of allSecrets) {
    const list = secretsByIntegration.get(secret.integrationId) ?? [];
    list.push({ kind: secret.kind, value: secret.value });
    secretsByIntegration.set(secret.integrationId, list);
  }

  const bundleIntegrations = allIntegrations.map((integration) => ({
    ref: integration.id,
    kind: integration.kind,
    name: integration.name,
    url: integration.url,
    secrets: secretsByIntegration.get(integration.id) ?? [],
  }));

  const bundleApps: HomarrBundleApp[] = allApps.map((app) => ({
    ref: app.id,
    name: app.name,
    href: app.href,
    iconUrl: app.iconUrl,
    description: app.description,
    pingUrl: app.pingUrl,
  }));

  const appIdSet = new Set(allApps.map((a) => a.id));
  const appIdToRef = new Map(allApps.map((app) => [app.id, app.id] as const));

  const bundleBoards = [];
  for (const boardRow of allBoards) {
    const boardGraph = await loadBoardGraphAsync(db, boardRow.id);
    if (!boardGraph) continue;

    const bundleItems = boardGraph.items.map((item) => {
      const options = parseStoredValue<Record<string, unknown>>(item.options, {});
      const advancedOptions = itemAdvancedOptionsSchema.parse(
        parseStoredValue(item.advancedOptions, itemAdvancedOptionsSchema.parse({})),
      );
      const portableOptions = replaceAppIdsInValue(options, appIdToRef) as Record<string, unknown>;
      const appRef = typeof options.appId === "string" && appIdSet.has(options.appId) ? options.appId : undefined;

      return {
        ref: item.id,
        kind: item.kind,
        options: portableOptions,
        advancedOptions,
        integrationRefs: item.integrations.map(({ integrationId }) => integrationId),
        appRef,
        layouts: item.layouts.map((layout) => ({
          layoutRef: layout.layoutId,
          sectionRef: layout.sectionId,
          x: layout.xOffset,
          y: layout.yOffset,
          w: layout.width,
          h: layout.height,
        })),
      };
    });

    bundleBoards.push({
      name: boardGraph.name,
      settings: buildBoardSettings(boardGraph),
      layouts: boardGraph.layouts.map((layout) => ({
        ref: layout.id,
        name: layout.name,
        columnCount: layout.columnCount,
        breakpoint: layout.breakpoint,
      })),
      sections: boardGraph.sections.map((section) => ({
        ref: section.id,
        kind: section.kind,
        name: section.name,
        yOffset: section.yOffset,
        xOffset: section.xOffset,
        options: section.options ? (parseStoredValue(section.options, {}) as Record<string, unknown>) : undefined,
        layouts:
          section.layouts.length > 0
            ? section.layouts.map((layout) => ({
                layoutRef: layout.layoutId,
                parentSectionRef: layout.parentSectionId ?? section.id,
                xOffset: layout.xOffset,
                yOffset: layout.yOffset,
                width: layout.width,
                height: layout.height,
              }))
            : undefined,
      })),
      items: bundleItems,
    });
  }

  const settingsRecord: Record<string, unknown> = {};
  for (const setting of allServerSettings) {
    settingsRecord[setting.settingKey] = SuperJSON.parse(setting.value);
  }

  const bundleSearchEngines = allSearchEngines.map((se) => ({
    ref: se.id,
    iconUrl: se.iconUrl,
    name: se.name,
    short: se.short,
    description: se.description,
    urlTemplate: se.urlTemplate,
    type: se.type,
    integrationRef: se.integrationId,
  }));

  const permissionsByGroup = new Map<string, string[]>();
  for (const gp of allGroupPermissions) {
    const list = permissionsByGroup.get(gp.groupId) ?? [];
    list.push(gp.permission);
    permissionsByGroup.set(gp.groupId, list);
  }

  const boardPermsByGroup = new Map<string, { boardRef: string; permission: string }[]>();
  for (const bp of allBoardGroupPermissions) {
    const list = boardPermsByGroup.get(bp.groupId) ?? [];
    list.push({ boardRef: bp.boardId, permission: bp.permission });
    boardPermsByGroup.set(bp.groupId, list);
  }

  const integrationPermsByGroup = new Map<string, { integrationRef: string; permission: string }[]>();
  for (const ip of allIntegrationGroupPermissions) {
    const list = integrationPermsByGroup.get(ip.groupId) ?? [];
    list.push({ integrationRef: ip.integrationId, permission: ip.permission });
    integrationPermsByGroup.set(ip.groupId, list);
  }

  const bundleGroups = allGroups.map((group) => ({
    ref: group.id,
    name: group.name,
    position: group.position,
    permissions: permissionsByGroup.get(group.id) ?? [],
    boardPermissions: boardPermsByGroup.get(group.id) ?? [],
    integrationPermissions: integrationPermsByGroup.get(group.id) ?? [],
  }));

  const bundle: HomarrConfigBundle = {
    version: CONFIG_BUNDLE_FORMAT_VERSION,
    type: "full-config",
    exportedAt: new Date().toISOString(),
    homarrVersion,
    encryptionKey: env.SECRET_ENCRYPTION_KEY ?? "0".repeat(64),
    boards: bundleBoards,
    apps: bundleApps,
    integrations: bundleIntegrations,
    serverSettings: settingsRecord,
    searchEngines: bundleSearchEngines,
    groups: bundleGroups,
  };

  const now = new Date().toISOString().slice(0, 10);
  return {
    content: JSON.stringify(bundle, null, 2),
    filename: `homarr-config-${now}.json`,
  };
};
