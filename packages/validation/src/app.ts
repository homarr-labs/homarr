import { z } from "zod";

const manageAppSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(512).nullable(),
  iconUrl: z.string().min(1),
  href: z.string().nullable(),
});

const editAppSchema = manageAppSchema.and(z.object({ id: z.string() }));

export const appSchemas = {
  manage: manageAppSchema,
  createMany: z
    .array(manageAppSchema.omit({ iconUrl: true }).and(z.object({ iconUrl: z.string().min(1).nullable() })))
    .min(1),
  edit: editAppSchema,
};
