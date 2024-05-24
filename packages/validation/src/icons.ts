import { z } from "zod";

const findIconsSchema = z.object({
  searchText: z.string().optional(),
});

export const iconsSchemas = {
  findIcons: findIconsSchema,
};
