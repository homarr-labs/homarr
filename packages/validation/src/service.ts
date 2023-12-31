import { z } from "zod";

const serviceCreateSchema = z.object({
  name: z.string().nonempty().max(127),
  url: z.string().url(),
});

const serviceDeleteSchema = z.object({
  id: z.string(),
});

export const serviceSchemas = {
  create: serviceCreateSchema,
  delete: serviceDeleteSchema,
};
