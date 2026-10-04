import { isRecord } from "@homarr/common";

const asRecord = (value: unknown): Record<string, unknown> | null => (isRecord(value) ? value : null);

export const getAssistantIconSearchQuery = (toolName: string, args: unknown) => {
  if (toolName !== "icon_findIcons") return null;
  const searchText = asRecord(args)?.searchText;
  return typeof searchText === "string" && searchText.trim().length > 0 ? searchText.trim() : "";
};
