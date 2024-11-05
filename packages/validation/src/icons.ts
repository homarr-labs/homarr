import { z } from "zod";

const findIconsSchema = z.object({
  searchText: z.string().optional(),
  limitPerGroup: z.number().min(1).max(500).default(12),
});

export const iconsSchemas = {
  findIcons: findIconsSchema,
};
