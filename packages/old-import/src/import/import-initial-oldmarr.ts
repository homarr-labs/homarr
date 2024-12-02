import type { z } from "zod";

import { decryptSecretWithKey, encryptSecret } from "@homarr/common/server";
import type { Database, InferInsertModel } from "@homarr/db";
import { createId } from "@homarr/db";
import {
  apps,
  boards,
  groupMembers,
  groupPermissions,
  groups,
  integrations,
  integrationSecrets,
  users,
} from "@homarr/db/schema/sqlite";
import { credentialsAdminGroup } from "@homarr/definitions";
import { boardSizes, OldmarrConfig } from "@homarr/old-schema";

import { analyseOldmarrImportAsync } from "../analyse/analyse-oldmarr-import";
import { BoardSizeRecord } from "../components/initial/board-selection-card";
import { fixSectionIssues } from "../fix-section-issues";
import { insertBoardAsync } from "../import-board";
import { mapBoard } from "../mappers/map-board";
import { mapColor } from "../mappers/map-colors";
import { mapColumnCount } from "../mappers/map-column-count";
import { mapIntegrationType } from "../mappers/map-integration";
import { moveWidgetsAndAppsIfMerge } from "../move-widgets-and-apps-merge";
import type { PreparedApp, PreparedIntegration } from "../prepare/prepare-multiple";
import { prepareMultipleImports } from "../prepare/prepare-multiple";
import { prepareSections } from "../prepare/prepate-sections";
import { InitialOldmarrImportSettings } from "../settings";
import type { OldmarrImportUser } from "../user-schema";
import type { importInitialOldmarrInputSchema } from "./input";
import { prepareItems } from "../prepare/prepare-items";

export const importInitialOldmarrAsync = async (
  db: Database,
  input: z.infer<typeof importInitialOldmarrInputSchema>,
) => {
  const { checksum, configs, users: importUsers } = await analyseOldmarrImportAsync(input.file);

  const { preparedApps, preparedBoards, preparedIntegrations } = prepareMultipleImports(
    configs,
    input.settings,
    input.boardSelections,
  );

  const {} = makeItWork({ preparedApps, preparedBoards, preparedIntegrations });

  const appsWithId = addIdToApps(preparedApps);
  const preparedUsers = prepareUsers(importUsers, input.token);
  const preparedIntegrationsDecrypted = prepareIntegrationsDecrypted(preparedIntegrations, input.token);

  // Due to a limitation with better-sqlite it's only possible to use it synchronously
  db.transaction((transaction) => {
    if (appsWithId.length >= 1) {
      transaction
        .insert(apps)
        .values(appsWithId.map(({ ids: _, ...app }) => app))
        .run();
    }

    if (preparedUsers.length >= 1 && input.token) {
      transaction.insert(users).values(preparedUsers).run();

      if (preparedUsers.some((user) => user.isAdmin)) {
        const adminGroupId = createId();
        transaction
          .insert(groups)
          .values({
            id: adminGroupId,
            name: credentialsAdminGroup,
          })
          .run();
        transaction
          .insert(groupPermissions)
          .values({
            groupId: adminGroupId,
            permission: "admin",
          })
          .run();

        transaction
          .insert(groupMembers)
          .values(
            preparedUsers
              .filter((user) => user.isAdmin)
              .map((user) => ({
                groupId: adminGroupId,
                userId: user.id,
              })),
          )
          .run();
      }
    }

    if (preparedIntegrations.length >= 1 && input.token) {
      transaction.insert(integrations).values(
        preparedIntegrationsDecrypted.map((integration) => ({
          id: integration.id,
          kind: integration.kind,
          name: integration.name,
          url: integration.url,
        })),
      );

      transaction.insert(integrationSecrets).values(
        preparedIntegrationsDecrypted.flatMap((integration) =>
          integration.secrets.map(
            (secret) =>
              ({
                integrationId: integration.id,
                kind: secret.field,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                value: encryptSecret(secret.value!),
              }) satisfies InferInsertModel<typeof integrationSecrets>,
          ),
        ),
      );
    }

    transaction.rollback();
  });
};

type PreparedBoard = ReturnType<typeof prepareMultipleImports>["preparedBoards"][number];

const makeItWork = (
  { preparedApps, preparedBoards, preparedIntegrations }: ReturnType<typeof prepareMultipleImports>,
  settings: InitialOldmarrImportSettings,
) => {
  preparedBoards.forEach((board) => {
    const { wrappers, categories, wrapperIdsToMerge } = fixSectionIssues(board.config);
    const { apps, widgets } = moveWidgetsAndAppsIfMerge(board.config, wrapperIdsToMerge, {
      ...settings,
      screenSize: board.size,
      name: board.name,
    });

    const boardId = createId();
    const mappedBoard = mapBoard(board);
    const preparedSections = prepareSections(mappedBoard.id, { wrappers, categories });
    const preparedItems = prepareItems({apps, widgets}, board.size, , preparedSections)
  });
};

// Add note about screen size feature no longer exists

const mapSection = (
  categories: OldmarrConfig["categories"],
  wrappers: OldmarrConfig["wrappers"],
  boardId: string,
) => ({});

const addIdToApps = (preparedApps: PreparedApp[]) => {
  return preparedApps.map((app) => ({
    id: createId(),
    ...app,
  }));
};

const prepareUsers = (importUsers: OldmarrImportUser[], encryptionToken: string | null) => {
  if (encryptionToken === "temp" || encryptionToken === null) {
    return [];
  }

  const key = Buffer.from(encryptionToken, "hex");

  return importUsers.map(
    ({
      id,
      password,
      salt,
      settings,
      ...user
    }): InferInsertModel<typeof users> & { oldId: string; isAdmin: boolean } => ({
      ...user,
      oldId: id,
      id: createId(),
      colorScheme: settings?.colorScheme === "environment" ? undefined : settings?.colorScheme,
      firstDayOfWeek: settings?.firstDayOfWeek === "sunday" ? 0 : settings?.firstDayOfWeek === "monday" ? 1 : 6,
      provider: "credentials",
      pingIconsEnabled: settings?.replacePingWithIcons,
      isAdmin: user.isAdmin || user.isOwner,
      password: decryptSecretWithKey(password, key),
      salt: decryptSecretWithKey(salt, key),
    }),
  );
};

const prepareIntegrationsDecrypted = (preparedIntegrations: PreparedIntegration[], encryptionToken: string | null) => {
  if (encryptionToken === "temp" || encryptionToken === null) {
    return [];
  }

  const key = Buffer.from(encryptionToken, "hex");

  return preparedIntegrations.map(({ type, name, url, properties }) => ({
    id: createId(),
    name,
    url,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    kind: mapIntegrationType(type!),
    secrets: properties.map((property) => ({
      ...property,
      value: property.value ? decryptSecretWithKey(property.value as `${string}.${string}`, key) : null,
    })),
  }));
};
