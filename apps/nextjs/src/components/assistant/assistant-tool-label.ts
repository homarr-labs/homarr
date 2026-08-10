const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

export const getAssistantIconSearchQuery = (toolName: string, args: unknown) => {
  if (toolName !== "icon_findIcons") return null;
  const searchText = asRecord(args)?.searchText;
  return typeof searchText === "string" && searchText.trim().length > 0 ? searchText.trim() : "";
};
