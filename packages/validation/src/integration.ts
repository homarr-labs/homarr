import { z } from "zod";

const integrationCreateSchema = z.object({
  name: z.string().nonempty().max(127),
  url: z.string().url(),
  kind: z.string(), // TODO: should be of the type in items.ts of db, that will be moved soon,
  secrets: z.array(
    z.object({
      kind: z.string(), // TODO: should be of the type in items.ts of db, that will be moved soon,
      value: z.string(),
    }),
  ),
});

const integrationUpdateSchema = z.object({
  id: z.string().cuid2(),
  name: z.string().nonempty().max(127),
  url: z.string().url(),
  secrets: z.array(
    z.object({
      kind: z.string(), // TODO: should be of the type in items.ts of db, that will be moved soon,
      value: z.string().nullable(),
    }),
  ),
});

const idSchema = z.object({
  id: z.string(),
});

export const integrationSchemas = {
  create: integrationCreateSchema,
  update: integrationUpdateSchema,
  delete: idSchema,
  byId: idSchema,
};
