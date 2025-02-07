import { z } from "zod";

const manageAppSchema = z.object({
  name: z.string().trim().min(1).max(64),
  description: z
    .string()
    .trim()
    .max(512)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),
  iconUrl: z.string().trim().min(1),
  href: z
    .string()
    .trim()
    .url()
    .regex(/^https?:\/\//) // Only allow http and https for security reasons (javascript: is not allowed)
    .or(z.literal(""))
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),
});

const editAppSchema = manageAppSchema.and(z.object({ id: z.string() }));

export const appSchemas = {
  manage: manageAppSchema,
  createMany: z
    .array(manageAppSchema.omit({ iconUrl: true }).and(z.object({ iconUrl: z.string().min(1).nullable() })))
    .min(1),
  edit: editAppSchema,
};
