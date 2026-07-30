const collectionKeys = [
  "items",
  "results",
  "data",
  "containers",
  "apps",
  "boards",
  "integrations",
  "widgets",
  "users",
  "requests",
  "downloads",
  "events",
] as const;
const titleKeys = ["name", "title", "label", "displayName", "hostname", "containerName", "id"] as const;
const descriptionKeys = ["description", "url", "href", "image", "version"] as const;
const badgeKeys = ["status", "state", "kind", "category", "type"] as const;
const excludedKeys = new Set([
  ...titleKeys,
  ...descriptionKeys,
  ...badgeKeys,
  ...collectionKeys,
  "icon",
  "iconUrl",
  "logoImageUrl",
  "imageUrl",
]);
const sensitiveKeyPattern = /(?:api.?key|authorization|cookie|credential|password|secret|token)/iu;
const maximumItems = 6;
const maximumFields = 6;

type ToolResultPrimitive = string | number | boolean;

export interface ToolResultField {
  label: string;
  value: ToolResultPrimitive;
}

export interface ToolResultItem {
  title: string;
  description?: string;
  badges: string[];
  fields: ToolResultField[];
}

export type ToolResultPresentation =
  | {
      type: "collection";
      items: ToolResultItem[];
      totalCount: number;
    }
  | {
      type: "properties";
      fields: ToolResultField[];
    }
  | {
      type: "text";
      text: string;
    };

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

const toDisplayValue = (value: unknown): ToolResultPrimitive | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > 160) return undefined;
    return trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  return undefined;
};

export const humanizeToolResultKey = (key: string) =>
  key
    .replaceAll(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replaceAll(/[_-]+/gu, " ")
    .replace(/^./u, (character) => character.toUpperCase());

const getFirstString = (record: Record<string, unknown>, keys: readonly string[]) => {
  for (const key of keys) {
    const value = toDisplayValue(record[key]);
    if (typeof value === "string") return value;
  }
  return undefined;
};

const getFields = (record: Record<string, unknown>, excludeIdentity = true) => {
  const fields: ToolResultField[] = [];
  const addEntries = (source: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(source)) {
      if (fields.length >= maximumFields) return;
      if ((excludeIdentity && excludedKeys.has(key)) || sensitiveKeyPattern.test(key)) continue;
      const displayValue = toDisplayValue(value);
      if (displayValue === undefined) continue;
      fields.push({ label: humanizeToolResultKey(key), value: displayValue });
    }
  };

  addEntries(record);
  for (const nestedKey of ["data", "summary", "healthInfo", "metrics"] as const) {
    const nested = asRecord(record[nestedKey]);
    if (nested) addEntries(nested);
  }
  return fields;
};

const toItem = (value: unknown, index: number): ToolResultItem | undefined => {
  const primitive = toDisplayValue(value);
  if (primitive !== undefined) {
    return { title: String(primitive), badges: [], fields: [] };
  }

  const record = asRecord(value);
  if (!record) return undefined;
  const integration = asRecord(record.integration);
  const identity = integration ?? record;
  const title = getFirstString(record, titleKeys) ?? getFirstString(identity, titleKeys) ?? `Result ${index + 1}`;
  const description = getFirstString(record, descriptionKeys) ?? getFirstString(identity, descriptionKeys);
  const badges = badgeKeys
    .flatMap((key) => {
      const badgeValue = toDisplayValue(record[key] ?? identity[key]);
      return badgeValue === undefined ? [] : [String(badgeValue)];
    })
    .filter((badgeValue, badgeIndex, allBadges) => allBadges.indexOf(badgeValue) === badgeIndex)
    .slice(0, 3);

  return { title, description, badges, fields: getFields(record) };
};

const findCollection = (record: Record<string, unknown>) => {
  for (const key of collectionKeys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return undefined;
};

export const getToolResultPresentation = (result: unknown): ToolResultPresentation | undefined => {
  if (typeof result === "string") {
    const text = result.trim();
    if (text.length === 0) return undefined;
    return { type: "text", text: text.length > 280 ? `${text.slice(0, 277)}…` : text };
  }

  const record = asRecord(result);
  const collection = Array.isArray(result) ? result : record ? findCollection(record) : undefined;
  if (collection) {
    const items = collection
      .slice(0, maximumItems)
      .map(toItem)
      .filter((item): item is ToolResultItem => item !== undefined);
    if (items.length === 0) return undefined;
    const reportedTotal = record ? toDisplayValue(record.totalCount) : undefined;
    return {
      type: "collection",
      items,
      totalCount: typeof reportedTotal === "number" ? reportedTotal : collection.length,
    };
  }

  if (!record || "error" in record) return undefined;
  const fields = getFields(record, false);
  return fields.length > 0 ? { type: "properties", fields } : undefined;
};
