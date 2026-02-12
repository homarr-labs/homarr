export interface AnchorNotesListInput extends Record<string, unknown> {
  search?: string;
  tagId?: string;
  limit?: number;
}

export type AnchorNotePermission = "owner" | "viewer" | "editor";

export interface AnchorNoteSummary {
  id: string;
  title: string;
  updatedAt: string;
  isPinned: boolean;
  tagIds: string[];
  permission: AnchorNotePermission;
}

export interface AnchorNote extends AnchorNoteSummary {
  content?: string | null;
  createdAt: string;
  isArchived: boolean;
  background?: string | null;
  userId: string;
}

export interface AnchorNoteUpdateInput {
  title?: string;
  content?: string;
}
