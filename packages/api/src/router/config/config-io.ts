import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { z } from "zod/v4";

import { encryptSecret } from "@homarr/common/server";
import type { Database, SQL } from "@homarr/db";
import { and, eq, inArray } from "@homarr/db";
import { getServerSettingsAsync } from "@homarr/db/queries";
import {
  apps,
  boardGroupPermissions,
  groupPermissions,
  groups,
  integrations,
  integrationSecrets,
  searchEngines,
  serverSettings,
} from "@homarr/db/schema";
import { defaultServerSettingsKeys } from "@homarr/server-settings";
import type { configExportSchema, configImportSchema } from "@homarr/validation/config";

import { collectBoardDocumentOperations, createBoardExportDocument } from "../board/board-io";
import type { DbOperation } from "../db-operations";
import { runDbOperationsAsync } from "../db-operations";

export type ConfigExportDocument = z.infer<typeof configExportSchema>;
export type ConfigImportDocument = z.infer<typeof configImportSchema>;

/**
 * Everything that describes how an instance is configured, without any user data.
 *
 * Users, group memberships and integration secret values are deliberately left out:
 * the first two belong to the authentication provider and the last one must not leave
 * the instance in plain text. Use the SQLite backup endpoints for a full copy instead.
 */
export const createConfigExportDocumentAsync = async (db: Database): Promise<ConfigExportDocument> => {
  const [settings, dbApps, dbIntegrations, dbSearchEngines, dbGroups, dbBoards] = await Promise.all([
    getServerSettingsAsync(db),
    db.query.apps.findMany(),
    db.query.integrations.findMany({ with: { secrets: { columns: { kind: true } } } }),
    db.query.searchEngines.findMany(),
    db.query.groups.findMany({ with: { permissions: { columns: { permission: true } } } }),
    db.query.boards.findMany({
      with: {
        sections: { with: { layouts: true } },
        layouts: true,
        items: { with: { layouts: true, integrations: { columns: { integrationId: true } } } },
        groupPermissions: true,
      },
    }),
  ]);

  return {
    version: 1,
    settings,
    apps: dbApps.map(({ id, name, description, iconUrl, href, pingUrl }) => ({
      id,
      name,
      description,
      iconUrl,
      href,
      pingUrl,
    })),
    integrations: dbIntegrations.map((integration) => ({
      id: integration.id,
      name: integration.name,
      url: integration.url,
      kind: integration.kind,
      appId: integration.appId,
      secretKinds: integration.secrets.map(({ kind }) => kind),
    })),
    searchEngines: dbSearchEngines.map(
      ({ id, name, short, iconUrl, description, type, urlTemplate, integrationId }) => ({
        id,
        name,
        short,
        iconUrl,
        description,
        type,
        urlTemplate,
        integrationId,
      }),
    ),
    groups: dbGroups.map((group) => ({
      id: group.id,
      name: group.name,
      position: group.position,
      homeBoardId: group.homeBoardId,
      mobileHomeBoardId: group.mobileHomeBoardId,
      permissions: group.permissions.map(({ permission }) => permission),
    })),
    boards: dbBoards.map((board) => ({
      ...createBoardExportDocument(board),
      id: board.id,
      groupPermissions: board.groupPermissions.map(({ groupId, permission }) => ({ groupId, permission })),
    })),
  };
};

interface EntityMatch {
  /** Id the document uses */
  documentId: string;
  /** Id the entity actually has in this instance, differs when it was matched by name */
  effectiveId: string;
  exists: boolean;
}

/**
 * Resolves which entity of the instance a document entity refers to.
 *
 * Ids are matched first. When an id is unknown but the natural key is taken, the existing entity
 * is adopted instead: every instance seeds its own 'everyone' group and default board with random
 * ids, so matching by id alone would make a document from another instance impossible to apply.
 */
const matchEntities = <TDocument extends { id: string }, TExisting extends { id: string }>(
  documentEntities: TDocument[],
  existingEntities: TExisting[],
  isSameNaturalKey?: (documentEntity: TDocument, existingEntity: TExisting) => boolean,
): Map<string, EntityMatch> => {
  const existingIds = new Set(existingEntities.map(({ id }) => id));

  return new Map(
    documentEntities.map((documentEntity) => {
      if (existingIds.has(documentEntity.id)) {
        return [documentEntity.id, { documentId: documentEntity.id, effectiveId: documentEntity.id, exists: true }];
      }

      const byNaturalKey = isSameNaturalKey
        ? existingEntities.find((existingEntity) => isSameNaturalKey(documentEntity, existingEntity))
        : undefined;

      return [
        documentEntity.id,
        {
          documentId: documentEntity.id,
          effectiveId: byNaturalKey?.id ?? documentEntity.id,
          exists: byNaturalKey !== undefined,
        },
      ];
    }),
  );
};

const throwOnConflicts = (conflicts: string[]) => {
  if (conflicts.length === 0) return;

  throw new TRPCError({
    code: "CONFLICT",
    message: `Already present, use onConflict 'skip' or 'replace': ${conflicts.join(", ")}`,
  });
};

const throwOnMissingReferences = (missing: string[]) => {
  if (missing.length === 0) return;

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `Document references entities that neither exist nor are part of it: ${missing.join(", ")}`,
  });
};

/**
 * Applies a configuration document in a single transaction.
 *
 * `fail` aborts as soon as anything of the document already exists, `skip` leaves existing
 * entities untouched and only creates the missing ones, `replace` additionally updates them and
 * exchanges the content of the boards. Server settings carry no identity of their own and are
 * always merged into the current ones.
 */
export const importConfigDocumentAsync = async (
  db: Database,
  document: ConfigImportDocument,
  creatorId: string,
): Promise<{ created: Record<string, number>; updated: Record<string, number> }> => {
  const [existingApps, existingIntegrations, existingSearchEngines, existingGroups, existingBoards] = await Promise.all(
    [
      db.query.apps.findMany({ columns: { id: true } }),
      db.query.integrations.findMany({ columns: { id: true } }),
      db.query.searchEngines.findMany({ columns: { id: true, short: true } }),
      db.query.groups.findMany({ columns: { id: true, name: true } }),
      db.query.boards.findMany({ columns: { id: true, name: true, isPublic: true } }),
    ],
  );

  const appMatches = matchEntities(document.apps, existingApps);
  const integrationMatches = matchEntities(document.integrations, existingIntegrations);
  const searchEngineMatches = matchEntities(
    document.searchEngines,
    existingSearchEngines,
    (documentEntity, existingEntity) => documentEntity.short === existingEntity.short,
  );
  const groupMatches = matchEntities(
    document.groups,
    existingGroups,
    (documentEntity, existingEntity) => documentEntity.name === existingEntity.name,
  );
  const boardMatches = matchEntities(
    document.boards,
    existingBoards,
    (documentEntity, existingEntity) => documentEntity.name.toLowerCase() === existingEntity.name.toLowerCase(),
  );

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const matchOf = (matches: Map<string, EntityMatch>, id: string) => matches.get(id)!;
  const effectiveId = (matches: Map<string, EntityMatch>, id: string) => matchOf(matches, id).effectiveId;
  const replaces = document.onConflict === "replace";

  if (document.onConflict === "fail") {
    throwOnConflicts([
      ...document.apps.filter((app) => matchOf(appMatches, app.id).exists).map((app) => `app '${app.name}'`),
      ...document.integrations
        .filter((integration) => matchOf(integrationMatches, integration.id).exists)
        .map((integration) => `integration '${integration.name}'`),
      ...document.searchEngines
        .filter((searchEngine) => matchOf(searchEngineMatches, searchEngine.id).exists)
        .map((searchEngine) => `search engine '${searchEngine.name}'`),
      ...document.groups
        .filter((group) => matchOf(groupMatches, group.id).exists)
        .map((group) => `group '${group.name}'`),
      ...document.boards
        .filter((board) => matchOf(boardMatches, board.id).exists)
        .map((board) => `board '${board.name}'`),
    ]);
  }

  // Every id the document may point at, existing ones plus the ones it brings itself
  const knownAppIds = new Set([...existingApps.map(({ id }) => id), ...document.apps.map(({ id }) => id)]);
  const knownIntegrationIds = new Set([
    ...existingIntegrations.map(({ id }) => id),
    ...document.integrations.map(({ id }) => id),
  ]);
  const knownBoardIds = new Set([
    ...existingBoards.map(({ id }) => id),
    ...document.boards.map((board) => effectiveId(boardMatches, board.id)),
  ]);

  /** Follows an id through the matching, so a reference to an adopted entity keeps working */
  const followMatch = (matches: Map<string, EntityMatch>, id: string | null | undefined) => {
    if (!id) return null;
    return matches.get(id)?.effectiveId ?? id;
  };

  const referencedBoardId = (boardId: string | null | undefined) => followMatch(boardMatches, boardId);
  const referencedSearchEngineId = (searchEngineId: string | null | undefined) =>
    followMatch(searchEngineMatches, searchEngineId);

  const publicBoardIds = new Set(existingBoards.filter((board) => board.isPublic).map((board) => board.id));
  for (const board of document.boards) {
    const match = matchOf(boardMatches, board.id);
    if (match.exists && !replaces) continue;

    if (board.isPublic) publicBoardIds.add(match.effectiveId);
    else publicBoardIds.delete(match.effectiveId);
  }

  const configuredHomeBoardIds = [
    referencedBoardId(document.settings?.board?.homeBoardId),
    referencedBoardId(document.settings?.board?.mobileHomeBoardId),
  ].filter((id) => id !== null);
  const invalidHomeBoardIds = configuredHomeBoardIds.filter((id) => !publicBoardIds.has(id));
  if (invalidHomeBoardIds.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Board settings home board IDs must reference public boards: ${invalidHomeBoardIds.join(", ")}`,
    });
  }

  throwOnMissingReferences([
    ...document.integrations
      .filter((integration) => integration.appId !== null && !knownAppIds.has(integration.appId))
      .map((integration) => `app '${integration.appId}' of integration '${integration.name}'`),
    ...document.searchEngines
      .filter(
        (searchEngine) => searchEngine.integrationId !== null && !knownIntegrationIds.has(searchEngine.integrationId),
      )
      .map((searchEngine) => `integration '${searchEngine.integrationId}' of search engine '${searchEngine.name}'`),
    ...document.groups
      .flatMap((group) => [
        { group, boardId: referencedBoardId(group.homeBoardId) },
        { group, boardId: referencedBoardId(group.mobileHomeBoardId) },
      ])
      .filter(({ boardId }) => boardId !== null && !knownBoardIds.has(boardId))
      .map(({ group, boardId }) => `board '${boardId}' of group '${group.name}'`),
    ...document.boards
      .flatMap((board) => board.items.flatMap((item) => item.integrationIds.map((id) => ({ board, id }))))
      .filter(({ id }) => !knownIntegrationIds.has(id))
      .map(({ board, id }) => `integration '${id}' used on board '${board.name}'`),
    ...document.boards
      .flatMap((board) => board.groupPermissions.map((permission) => ({ board, groupId: permission.groupId })))
      .filter(({ groupId }) => !groupMatches.has(groupId) && !existingGroups.some(({ id }) => id === groupId))
      .map(({ board, groupId }) => `group '${groupId}' with access to board '${board.name}'`),
  ]);

  const operations: DbOperation[] = [];
  const created: Record<string, number> = {};
  const updated: Record<string, number> = {};
  const count = (target: Record<string, number>, key: string, amount: number) => {
    if (amount > 0) target[key] = (target[key] ?? 0) + amount;
  };

  // Apps
  const newApps = document.apps.filter((app) => !matchOf(appMatches, app.id).exists);
  if (newApps.length > 0) {
    operations.push({ type: "insert", table: "apps", values: newApps });
  }
  count(created, "apps", newApps.length);

  if (replaces) {
    const changedApps = document.apps.filter((app) => matchOf(appMatches, app.id).exists);
    for (const app of changedApps) {
      const { id, ...values } = app;
      operations.push({ type: "update", table: "apps", set: values, where: eq(apps.id, effectiveId(appMatches, id)) });
    }
    count(updated, "apps", changedApps.length);
  }

  // Integrations
  const newIntegrations = document.integrations.filter(
    (integration) => !matchOf(integrationMatches, integration.id).exists,
  );
  if (newIntegrations.length > 0) {
    operations.push({
      type: "insert",
      table: "integrations",
      values: newIntegrations.map(({ id, name, url, kind, appId }) => ({ id, name, url, kind, appId })),
    });
  }
  count(created, "integrations", newIntegrations.length);

  if (replaces) {
    const changedIntegrations = document.integrations.filter(
      (integration) => matchOf(integrationMatches, integration.id).exists,
    );
    for (const integration of changedIntegrations) {
      operations.push({
        type: "update",
        table: "integrations",
        // The kind decides which secrets are valid, so it has to move with the rest
        set: { name: integration.name, url: integration.url, kind: integration.kind, appId: integration.appId },
        where: eq(integrations.id, effectiveId(integrationMatches, integration.id)),
      });
    }
    count(updated, "integrations", changedIntegrations.length);
  }

  for (const integration of document.integrations) {
    if (!integration.secrets || integration.secrets.length === 0) continue;

    const match = matchOf(integrationMatches, integration.id);
    if (match.exists && !replaces) continue;

    if (match.exists) {
      operations.push({
        type: "delete",
        table: "integrationSecrets",
        where: and(
          eq(integrationSecrets.integrationId, match.effectiveId),
          inArray(
            integrationSecrets.kind,
            integration.secrets.map(({ kind }) => kind),
          ),
        ) as SQL,
      });
    }

    operations.push({
      type: "insert",
      table: "integrationSecrets",
      values: integration.secrets.map((secret) => ({
        integrationId: match.effectiveId,
        kind: secret.kind,
        value: encryptSecret(secret.value),
      })),
    });
  }

  // Search engines
  const newSearchEngines = document.searchEngines.filter(
    (searchEngine) => !matchOf(searchEngineMatches, searchEngine.id).exists,
  );
  if (newSearchEngines.length > 0) {
    operations.push({ type: "insert", table: "searchEngines", values: newSearchEngines });
  }
  count(created, "searchEngines", newSearchEngines.length);

  if (replaces) {
    const changedSearchEngines = document.searchEngines.filter(
      (searchEngine) => matchOf(searchEngineMatches, searchEngine.id).exists,
    );
    for (const searchEngine of changedSearchEngines) {
      const { id, short: _short, ...values } = searchEngine;
      operations.push({
        type: "update",
        table: "searchEngines",
        set: values,
        where: eq(searchEngines.id, effectiveId(searchEngineMatches, id)),
      });
    }
    count(updated, "searchEngines", changedSearchEngines.length);
  }

  // Boards. Existing ones keep their row so that home board settings, per user permissions and
  // everything else pointing at the board survive, only their content is exchanged.
  const importedBoards = document.boards.filter((board) => !matchOf(boardMatches, board.id).exists || replaces);

  for (const board of importedBoards) {
    const match = matchOf(boardMatches, board.id);

    operations.push(
      ...collectBoardDocumentOperations(board, {
        boardId: match.effectiveId,
        creatorId,
        preserveIds: true,
        replaceExisting: match.exists,
      }),
    );

    count(match.exists ? updated : created, "boards", 1);
  }

  // Groups reference boards through their home board, so they come after them
  const newGroups = document.groups.filter((group) => !matchOf(groupMatches, group.id).exists);
  const maxPosition = existingGroups.length;
  if (newGroups.length > 0) {
    operations.push({
      type: "insert",
      table: "groups",
      values: newGroups.map((group, index) => ({
        id: group.id,
        name: group.name,
        position: group.position ?? maxPosition + index + 1,
        homeBoardId: referencedBoardId(group.homeBoardId),
        mobileHomeBoardId: referencedBoardId(group.mobileHomeBoardId),
      })),
    });
  }
  count(created, "groups", newGroups.length);

  if (replaces) {
    const changedGroups = document.groups.filter((group) => matchOf(groupMatches, group.id).exists);
    for (const group of changedGroups) {
      operations.push({
        type: "update",
        table: "groups",
        set: {
          name: group.name,
          homeBoardId: referencedBoardId(group.homeBoardId),
          mobileHomeBoardId: referencedBoardId(group.mobileHomeBoardId),
          ...(group.position === undefined ? {} : { position: group.position }),
        },
        where: eq(groups.id, effectiveId(groupMatches, group.id)),
      });
    }
    count(updated, "groups", changedGroups.length);
  }

  const groupsWithPermissions = document.groups.filter((group) => !matchOf(groupMatches, group.id).exists || replaces);
  const replacedGroupIds = groupsWithPermissions
    .filter((group) => matchOf(groupMatches, group.id).exists)
    .map((group) => effectiveId(groupMatches, group.id));
  if (replacedGroupIds.length > 0) {
    operations.push({
      type: "delete",
      table: "groupPermissions",
      where: inArray(groupPermissions.groupId, replacedGroupIds),
    });
  }

  const permissionRows = groupsWithPermissions.flatMap((group) =>
    group.permissions.map((permission) => ({ groupId: effectiveId(groupMatches, group.id), permission })),
  );
  if (permissionRows.length > 0) {
    operations.push({ type: "insert", table: "groupPermissions", values: permissionRows });
  }

  // A replaced board keeps its row, so its access list has to be cleared explicitly. Without this
  // a re-import of the same document would insert a row that is already there and hit the
  // composite primary key, which would roll back the whole import.
  const replacedBoardIds = importedBoards
    .filter((board) => matchOf(boardMatches, board.id).exists)
    .map((board) => effectiveId(boardMatches, board.id));
  if (replacedBoardIds.length > 0) {
    operations.push({
      type: "delete",
      table: "boardGroupPermissions",
      where: inArray(boardGroupPermissions.boardId, replacedBoardIds),
    });
  }

  const boardPermissionRows = importedBoards.flatMap((board) =>
    board.groupPermissions.map((permission) => ({
      boardId: effectiveId(boardMatches, board.id),
      groupId: groupMatches.get(permission.groupId)?.effectiveId ?? permission.groupId,
      permission: permission.permission,
    })),
  );
  if (boardPermissionRows.length > 0) {
    operations.push({ type: "insert", table: "boardGroupPermissions", values: boardPermissionRows });
  }

  // Server settings have no identity of their own, so they are always merged
  if (document.settings) {
    const currentSettings = await getServerSettingsAsync(db);
    const existingKeys = new Set(
      (await db.query.serverSettings.findMany({ columns: { settingKey: true } })).map(({ settingKey }) => settingKey),
    );

    for (const settingKey of defaultServerSettingsKeys) {
      const value = document.settings[settingKey];
      if (!value) continue;

      // Settings point at other entities by id, so an adopted entity has to be followed here too
      const remapped: Record<string, unknown> = { ...value };

      if (settingKey === "board") {
        if ("homeBoardId" in remapped) {
          remapped.homeBoardId = referencedBoardId(remapped.homeBoardId as string | null);
        }
        if ("mobileHomeBoardId" in remapped) {
          remapped.mobileHomeBoardId = referencedBoardId(remapped.mobileHomeBoardId as string | null);
        }
      }

      if (settingKey === "search" && "defaultSearchEngineId" in remapped) {
        remapped.defaultSearchEngineId = referencedSearchEngineId(remapped.defaultSearchEngineId as string | null);
      }

      const merged = superjson.stringify({ ...currentSettings[settingKey], ...remapped });

      if (existingKeys.has(settingKey)) {
        operations.push({
          type: "update",
          table: "serverSettings",
          set: { value: merged },
          where: eq(serverSettings.settingKey, settingKey),
        });
        continue;
      }

      operations.push({ type: "insert", table: "serverSettings", values: [{ settingKey, value: merged }] });
    }
    count(updated, "settings", Object.keys(document.settings).length);
  }

  await runDbOperationsAsync(db, operations);

  return { created, updated };
};
