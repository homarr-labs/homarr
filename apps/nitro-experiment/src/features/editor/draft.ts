import type { BoardContent, BoardProjection } from "../../contracts/schemas";
import { boardContentSchema } from "../../contracts/schemas";

export interface EditorDraft {
  base: BoardProjection;
  content: BoardContent;
}

export interface DraftErrors {
  label?: string;
  columns?: string;
  displayLabel?: string;
}

export function createDraft(board: BoardProjection): EditorDraft {
  return {
    base: board,
    content: { ...board.content, widget: { ...board.content.widget } },
  };
}

export function hasDraftChanges(draft: EditorDraft): boolean {
  return (
    draft.content.label !== draft.base.content.label ||
    draft.content.columns !== draft.base.content.columns ||
    draft.content.widget.displayLabel !== draft.base.content.widget.displayLabel
  );
}

export function validateDraft(content: BoardContent): DraftErrors {
  const result = boardContentSchema.safeParse(content);
  if (result.success) return {};
  const errors: DraftErrors = {};
  for (const issue of result.error.issues) {
    if (issue.path[0] === "label") errors.label = "Enter a board label with 1 to 80 characters.";
    if (issue.path[0] === "columns") errors.columns = "Choose 1 to 4 columns.";
    if (issue.path[0] === "widget") errors.displayLabel = "Enter a widget label with 1 to 80 characters.";
  }
  return errors;
}
