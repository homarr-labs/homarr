import { z } from "zod/v4";

export const iconsFindSchema = z.object({
  searchText: z.string().optional(),
  limitPerGroup: z.number().min(1).max(500).default(12),
});

export const iconsDetectFaviconSchema = z.object({
  href: z
    .string()
    .trim()
    .url()
    .regex(/^https?:\/\//i), // Only allow http and https for security reasons (javascript: is not allowed)
});
