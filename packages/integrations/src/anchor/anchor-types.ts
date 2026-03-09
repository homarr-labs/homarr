import { z } from "zod/v4";

export const anchorNotesListInputSchema = z.object({
  search: z.string().optional(),
  tagId: z.string().optional(),
  limit: z.number().min(1).max(200).optional(),
});
export type AnchorNotesListInput = z.infer<typeof anchorNotesListInputSchema>;

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
  noteId: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
}).refine((value) => value.title !== undefined || value.content !== undefined, {
  message: "At least one field to update must be provided",
});
export type AnchorNoteUpdateInput = z.infer<typeof anchorNoteUpdateInputSchema>;
