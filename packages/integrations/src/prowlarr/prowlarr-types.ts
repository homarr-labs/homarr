import { z } from "zod";

export const indexerResponseSchema = z.object({
  id: z.number(),
  indexerUrls: z.array(z.string()),
  name: z.string(),
  enable: z.boolean(),
});

export const statusResponseSchema = z.array(
  z.object({
    indexerId: z.number(),
  }),
);
