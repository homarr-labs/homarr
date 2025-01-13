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

const mediaRequestOptionsSchema = z.object({
  mediaId: z.number(),
  mediaType: z.enum(["tv", "movie"]),
});

const requestMediaSchema = z.object({
  mediaType: z.enum(["tv", "movie"]),
  mediaId: z.number(),
  seasons: z.array(z.number().min(0)).optional(),
});

export const commonSchemas = {
  paginated: paginatedSchema,
  byId: byIdSchema,
  search: searchSchema,
  mediaRequestOptions: mediaRequestOptionsSchema,
  requestMedia: requestMediaSchema,
};
