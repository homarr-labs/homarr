import { z } from "zod";

import { groupPermissionKeys } from "@homarr/definitions";

import { zodEnumFromArray } from "./enums";

const paginatedSchema = z.object({
  search: z.string().optional(),
  pageSize: z.number().int().positive().default(10),
  page: z.number().int().positive().default(1),
});

const byIdSchema = z.object({
  id: z.string(),
});

const createSchema = z.object({
  name: z.string().max(64),
});

const updateSchema = createSchema.merge(byIdSchema);

const savePermissionsSchema = z.object({
  groupId: z.string(),
  permissions: z.array(zodEnumFromArray(groupPermissionKeys)),
});

const groupUserSchema = z.object({ groupId: z.string(), userId: z.string() });

export const groupSchemas = {
  paginated: paginatedSchema,
  byId: byIdSchema,
  create: createSchema,
  update: updateSchema,
  savePermissions: savePermissionsSchema,
  groupUser: groupUserSchema,
};
