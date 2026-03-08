import { z } from "zod/v4";

export type AnchorNotesListInput = {
  search?: string;
  tagId?: string;
  limit?: number;
};

export const anchorNotePermissionSchema = z.enum(["owner", "viewer", "editor"]);
export type AnchorNotePermission = z.infer<typeof anchorNotePermissionSchema>;

export const anchorNoteSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.string(),
  isPinned: z.boolean(),
  tagIds: z.array(z.string()),
  permission: anchorNotePermissionSchema,
});
export type AnchorNoteSummary = z.infer<typeof anchorNoteSummarySchema>;

export const anchorNoteSchema = anchorNoteSummarySchema.extend({
  content: z.string().nullable().optional(),
  createdAt: z.string(),
  isArchived: z.boolean(),
  background: z.string().nullable().optional(),
  userId: z.string(),
});
export type AnchorNote = z.infer<typeof anchorNoteSchema>;

export const anchorNoteSummaryListSchema = z.array(anchorNoteSummarySchema);

export const anchorNoteUpdateInputSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
});
export type AnchorNoteUpdateInput = z.infer<typeof anchorNoteUpdateInputSchema>;
