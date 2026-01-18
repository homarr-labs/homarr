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
