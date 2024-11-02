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
  edit: editAppSchema,
};
