import SuperJSON from "superjson";

import { env } from "@homarr/common/env";
import type { Database } from "@homarr/db";
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
import type { IntegrationSecretKind } from "@homarr/definitions";
import { itemAdvancedOptionsSchema } from "@homarr/validation/shared";

import { CONFIG_BUNDLE_FORMAT_VERSION } from "../config-bundle-compat";
import { USER_DIRECT_FIELDS, USER_REF_FIELDS } from "../entity-fields";
import { groupByKey } from "../resolve-entities";
import type { ConfigBundleUser, HomarrBundleApp, HomarrConfigBundle } from "../schema";
import { parseStoredValue, replaceAppIdsInValue } from "../utils";
import { loadBoardGraphAsync } from "./load-board-graph";
import { buildBoardSettings } from "./serialize-board";

/**
 * Exports a user row using USER_DIRECT_FIELDS and USER_REF_FIELDS.
 * Adding a new preference to USER_DIRECT_FIELDS automatically includes it here.
 */
const exportUserRow = (user: Record<string, unknown>): ConfigBundleUser => {
  const bundle: Record<string, unknown> = { ref: user.id };

  for (const field of USER_DIRECT_FIELDS) {
    bundle[field] = user[field] ?? null;
  }

  for (const refField of Object.keys(USER_REF_FIELDS)) {
    const dbCol = refField.replace(/Ref$/, "Id");
    bundle[refField] = user[dbCol] ?? null;
  }

  return bundle as unknown as ConfigBundleUser;
};

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
  const allUsers = await db.select().from(users);
  const allGroupMembers = await db.select().from(groupMembers);

  const secretsByIntegration = groupByKey(allSecrets, (s) => s.integrationId);

  const bundleIntegrations = allIntegrations.map((integration) => ({
    ref: integration.id,
    kind: integration.kind,
    name: integration.name,
    url: integration.url,
    secrets: (secretsByIntegration.get(integration.id) ?? []).map((s) => ({
      kind: s.kind as IntegrationSecretKind,
      value: s.value,
    })),
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
      ref: boardRow.id,
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

  const permissionsByGroup = groupByKey(allGroupPermissions, (gp) => gp.groupId);
  const boardPermsByGroup = groupByKey(allBoardGroupPermissions, (bp) => bp.groupId);
  const integrationPermsByGroup = groupByKey(allIntegrationGroupPermissions, (ip) => ip.groupId);
  const membersByGroup = groupByKey(allGroupMembers, (gm) => gm.groupId);

  const bundleGroups = allGroups.map((group) => ({
    ref: group.id,
    name: group.name,
    position: group.position,
    ownerRef: group.ownerId ?? null,
    homeBoardRef: group.homeBoardId ?? null,
    mobileHomeBoardRef: group.mobileHomeBoardId ?? null,
    permissions: (permissionsByGroup.get(group.id) ?? []).map((gp) => gp.permission),
    boardPermissions: (boardPermsByGroup.get(group.id) ?? []).map((bp) => ({
      boardRef: bp.boardId,
      permission: bp.permission,
    })),
    integrationPermissions: (integrationPermsByGroup.get(group.id) ?? []).map((ip) => ({
      integrationRef: ip.integrationId,
      permission: ip.permission,
    })),
    memberRefs: (membersByGroup.get(group.id) ?? []).map((gm) => gm.userId),
  }));

  const bundleUsers = allUsers.map((user) => exportUserRow(user as unknown as Record<string, unknown>));

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
    users: bundleUsers,
  };

  const now = new Date().toISOString().slice(0, 10);
  return {
    content: JSON.stringify(bundle, null, 2),
    filename: `homarr-config-${now}.json`,
  };
};
