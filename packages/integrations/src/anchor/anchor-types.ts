export interface AnchorNotesListInput {
  search?: string;
  tagId?: string;
  limit?: number;
}

export interface AnchorNoteSummary {
  id: string;
  title: string;
  updatedAt: string;
  isPinned: boolean;
  tagIds: string[];
}

export interface AnchorNote extends AnchorNoteSummary {
  content?: string | null;
  createdAt: string;
  isArchived: boolean;
  background?: string | null;
}

export type AnchorNoteLockOwner = "anchor" | "homarr";

export interface AnchorNoteLockStatus {
  status: "acquired" | "locked";
  lockedBy: AnchorNoteLockOwner;
  expiresAt: string;
}

export interface AnchorNoteUpdateInput {
  title?: string;
  content?: string;
}
