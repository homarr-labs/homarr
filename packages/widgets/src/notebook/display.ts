interface NotebookDisplayInput {
  height: number;
  isAdvanced: boolean;
  isEditing: boolean;
  isSaving: boolean;
  showToolbar: boolean;
}

export const getNotebookDisplay = ({ height, isAdvanced, isEditing, isSaving, showToolbar }: NotebookDisplayInput) => ({
  showToolbar: isEditing && !isSaving && (isAdvanced || showToolbar),
  toolbarMaxHeight: isAdvanced ? undefined : height < 180 ? "4.5rem" : "10rem",
  showDocumentStats: isAdvanced || height >= 180,
});
