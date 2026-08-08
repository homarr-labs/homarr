import { z } from "zod/v4";

export const iconsFindSchema = z.object({
  searchText: z.string().optional(),
  limitPerGroup: z.number().min(1).max(500).default(12),
});

export const iconForUrlSchema = z.object({
  // Only http(s) targets are fetched server-side; other schemes are rejected.
  href: z
    .string()
    .trim()
    .url()
    .regex(/^https?:\/\//i),
});
