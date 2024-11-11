import { z } from "zod";

const paginatedSchema = z.object({
  search: z.string().optional(),
  pageSize: z.number().int().positive().default(10),
  page: z.number().int().positive().default(1),
});

export const byIdSchema = z.object({
  id: z.string(),
});

const searchSchema = z.object({
  query: z.string(),
  limit: z.number().int().positive().default(10),
});

export const encryptedValueSchema = z.custom<`${string}.${string}`>(
  (value) =>
    z
      .string()
      .min(3)
      .regex(/[^\\.]+\.[^\\.]+/)
      .safeParse(value).success,
);

export const commonSchemas = {
  paginated: paginatedSchema,
  byId: byIdSchema,
  search: searchSchema,
  encryptedValue: encryptedValueSchema,
};
