import { z } from "zod/v4";

import {
  boardPermissions,
  groupPermissionKeys,
  integrationKinds,
  integrationSecretKinds,
  searchEngineTypes,
} from "@homarr/definitions";

import { boardExportSchema, boardImportSchema, importConflictStrategySchema } from "./board";
import { zodEnumFromArray } from "./enums";
import { serverSettingsSchema, serverSettingsUpdateSchema } from "./settings";

/**
 * Documents of the full configuration export.
 *
 * Unlike a single board import, ids are kept as they are. Widget options can reference other
 * entities by id (for example the app widget stores an appId) and those references live inside
 * an opaque options record, so remapping ids would silently break them.
 */

const configAppSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  iconUrl: z.string(),
  href: z.string().nullable(),
  pingUrl: z.string().nullable(),
});

const configIntegrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  kind: zodEnumFromArray(integrationKinds),
  appId: z.string().nullable(),
  /** Which secrets the integration needs, the values are never exported */
  secretKinds: z.array(zodEnumFromArray(integrationSecretKinds)),
});

const configSearchEngineSchema = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  iconUrl: z.string(),
  description: z.string().nullable(),
  type: zodEnumFromArray(searchEngineTypes),
  urlTemplate: z.string().nullable(),
  integrationId: z.string().nullable(),
});

const configGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.number(),
  homeBoardId: z.string().nullable(),
  mobileHomeBoardId: z.string().nullable(),
  permissions: z.array(zodEnumFromArray(groupPermissionKeys)),
});

const configBoardGroupPermissionSchema = z.object({
  groupId: z.string(),
  permission: z.enum(boardPermissions),
});

export const configExportSchema = z.object({
  version: z.literal(1),
  settings: serverSettingsSchema,
  apps: z.array(configAppSchema),
  integrations: z.array(configIntegrationSchema),
  searchEngines: z.array(configSearchEngineSchema),
  groups: z.array(configGroupSchema),
  boards: z.array(
    boardExportSchema.extend({
      id: z.string(),
      groupPermissions: z.array(configBoardGroupPermissionSchema),
    }),
  ),
});

export const configImportSchema = z.object({
  version: z.literal(1),
  settings: serverSettingsUpdateSchema.optional(),
  apps: z.array(configAppSchema).default([]),
  integrations: z
    .array(
      configIntegrationSchema.omit({ secretKinds: true }).extend({
        secretKinds: z.array(zodEnumFromArray(integrationSecretKinds)).optional(),
        /** Secret values are not part of an export, they can be supplied here to restore a working integration */
        secrets: z
          .array(z.object({ kind: zodEnumFromArray(integrationSecretKinds), value: z.string().nonempty() }))
          .optional(),
      }),
    )
    .default([]),
  searchEngines: z.array(configSearchEngineSchema).default([]),
  groups: z.array(configGroupSchema.partial({ position: true })).default([]),
  boards: z
    .array(
      boardImportSchema.omit({ onConflict: true }).extend({
        id: z.string(),
        // Deliberately looser than boardNameSchema so a document exported from an instance with
        // boards created by older versions or the oldmarr importer can be applied again
        name: z.string().min(1).max(255),
        groupPermissions: z.array(configBoardGroupPermissionSchema).default([]),
      }),
    )
    .default([]),
  onConflict: importConflictStrategySchema,
});
