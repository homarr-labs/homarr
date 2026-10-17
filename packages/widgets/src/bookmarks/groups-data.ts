import { z } from "zod/v4";

const bookmarkGroupsSchema = z.array(
  z.object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(64),
    itemIds: z.array(z.string()),
  }),
);
export type BookmarkGroup = z.infer<typeof bookmarkGroupsSchema>[number];

export const getBookmarkGroups = (value: unknown): BookmarkGroup[] => {
  const result = bookmarkGroupsSchema.safeParse(value);
  if (!result.success) return [];
  return result.data;
};
