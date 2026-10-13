import { z } from "zod/v4";

import {
  groupPermissionKeys,
  integrationCategories,
  integrationKinds,
  integrationPermissions,
  integrationSecretKinds,
} from "@homarr/definitions";

import { appManageSchema } from "./app";
import { zodEnumFromArray } from "./enums";
import { createSavePermissionsSchema } from "./permissions";

const integrationUrlSchema = z
  .string()
  .url()
  .regex(/^https?:\/\//); // Only allow http and https for security reasons (javascript: is not allowed)

// An integration stores one secret per kind
const hasUniqueSecretKinds = (secrets: { kind: string }[]) =>
  new Set(secrets.map((secret) => secret.kind)).size === secrets.length;

export const integrationCreateSchema = z.object({
  name: z.string().nonempty().max(127),
  url: integrationUrlSchema,
  kind: zodEnumFromArray(integrationKinds),
  secrets: z
    .array(
      z.object({
        kind: zodEnumFromArray(integrationSecretKinds),
        value: z.string().nonempty(),
      }),
    )
    .refine(hasUniqueSecretKinds, { message: "Secret kinds must be unique" }),
  app: z
    .object({
      id: z.string(),
    })
    .or(appManageSchema)
    .optional(),
  skipConnectionTest: z.boolean().default(false),
});

export const integrationUpdateSchema = z.object({
  // Updates address an existing row, including externally seeded IDs.
  id: z.string().nonempty(),
  name: z.string().nonempty().max(127),
  url: integrationUrlSchema,
  secrets: z
    .array(
      z.object({
        kind: zodEnumFromArray(integrationSecretKinds),
        value: z.string().nonempty().nullable(),
      }),
    )
    .refine(hasUniqueSecretKinds, { message: "Secret kinds must be unique" }),
  appId: z.string().nullable(),
  skipConnectionTest: z.boolean().default(false),
});

export const integrationSavePermissionsSchema = createSavePermissionsSchema(zodEnumFromArray(integrationPermissions));

export const integrationKindDefinitionSchema = z.object({
  kind: zodEnumFromArray(integrationKinds),
  name: z.string(),
  category: z.array(zodEnumFromArray(integrationCategories)),
  requiredSecrets: z.array(z.array(zodEnumFromArray(integrationSecretKinds))),
});

export const integrationSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: zodEnumFromArray(integrationKinds),
  url: z.string(),
  permissions: z.object({
    hasFullAccess: z.boolean(),
    hasInteractAccess: z.boolean(),
    hasUseAccess: z.boolean(),
  }),
});

export const integrationDetailsSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: zodEnumFromArray(integrationKinds),
  url: z.string(),
  secrets: z.array(
    z.object({
      kind: zodEnumFromArray(integrationSecretKinds),
      value: z.string().nullable(),
      updatedAt: z.date(),
    }),
  ),
  app: z
    .object({
      id: z.string(),
      name: z.string(),
      iconUrl: z.string(),
      href: z.string().nullable(),
    })
    .nullable(),
});

export const integrationCreateResultSchema = z.object({
  integration: z.object({
    id: z.string(),
    name: z.string(),
    kind: zodEnumFromArray(integrationKinds),
    url: z.string(),
  }),
  appId: z.string().nullable(),
});

const integrationPermissionGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const integrationPermissionsSchema = z.object({
  inherited: z.array(
    z.object({
      permission: zodEnumFromArray(groupPermissionKeys),
      group: integrationPermissionGroupSchema,
    }),
  ),
  users: z.array(
    z.object({
      user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        image: z.string().nullable(),
        email: z.string().nullable(),
      }),
      permission: z.enum(integrationPermissions),
    }),
  ),
  groups: z.array(
    z.object({
      group: integrationPermissionGroupSchema,
      permission: z.enum(integrationPermissions),
    }),
  ),
});
