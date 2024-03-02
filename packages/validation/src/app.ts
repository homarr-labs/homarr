import { z } from "zod";

const createAppSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(512).nullable(),
  iconUrl: z.string().min(1),
  href: z.string().nullable(),
});

export const appSchemas = {
  create: createAppSchema,
};
