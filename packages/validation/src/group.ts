import { z } from "zod";

import { everyoneGroup, groupPermissionKeys } from "@homarr/definitions";

import { byIdSchema } from "./common";
import { zodEnumFromArray } from "./enums";

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine((value) => value !== everyoneGroup, {
      message: "'everyone' is a reserved group name",
    }),
});

const updateSchema = createSchema.merge(byIdSchema);

const savePermissionsSchema = z.object({
  groupId: z.string(),
  permissions: z.array(zodEnumFromArray(groupPermissionKeys)),
});

const groupUserSchema = z.object({ groupId: z.string(), userId: z.string() });

export const groupSchemas = {
  create: createSchema,
  update: updateSchema,
  savePermissions: savePermissionsSchema,
  groupUser: groupUserSchema,
};
