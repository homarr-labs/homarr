import { isRecord } from "@homarr/common";

const targetKeys = ["name", "title", "query", "searchText", "appName", "widgetName"] as const;

export const getAssistantToolTraceTarget = (args: unknown): string | null => {
  if (!isRecord(args)) return null;
  const record = args;

  for (const key of targetKeys) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const normalized = value.trim().replaceAll(/\s+/gu, " ");
    if (normalized.length === 0) continue;
    return normalized.length > 80 ? `${normalized.slice(0, 77)}…` : normalized;
  }

  return null;
};
