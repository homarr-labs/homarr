import type { CustomJsxRequestCapability } from "./types";

export const CUSTOM_JSX_METHOD_COLORS: Readonly<Record<string, string>> = {
  GET: "blue",
  POST: "orange",
  PUT: "yellow",
  DELETE: "red",
  PATCH: "grape",
};

const methods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const kinds = new Set(["query", "action"]);
const permissions = new Set(["view", "modify", "full"]);

const parseConfirmation = (value: unknown): CustomJsxRequestCapability["confirmation"] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.title !== "string" || typeof record.message !== "string") return undefined;
  if (record.confirmLabel !== undefined && typeof record.confirmLabel !== "string") return undefined;
  if (record.destructive !== undefined && typeof record.destructive !== "boolean") return undefined;

  const confirmation: NonNullable<CustomJsxRequestCapability["confirmation"]> = {
    title: record.title,
    message: record.message,
  };
  if (typeof record.confirmLabel === "string") confirmation.confirmLabel = record.confirmLabel;
  if (typeof record.destructive === "boolean") confirmation.destructive = record.destructive;
  return confirmation;
};

export function parseRequestCapabilities(value: unknown): CustomJsxRequestCapability[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const record = candidate as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      typeof record.kind !== "string" ||
      !kinds.has(record.kind) ||
      typeof record.method !== "string" ||
      !methods.has(record.method) ||
      typeof record.minimumBoardPermission !== "string" ||
      !permissions.has(record.minimumBoardPermission)
    )
      return [];
    return [
      {
        id: record.id,
        kind: record.kind,
        method: record.method,
        trigger: record.trigger === "load" ? "load" : "manual",
        minimumBoardPermission: record.minimumBoardPermission,
        confirmation: parseConfirmation(record.confirmation),
        invalidates: Array.isArray(record.invalidates)
          ? record.invalidates.filter((entry): entry is string => typeof entry === "string")
          : [],
      } as CustomJsxRequestCapability,
    ];
  });
}
