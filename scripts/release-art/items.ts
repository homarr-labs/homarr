export interface Item {
  kind: "integration" | "widget";
  slug: string;
  name: string;
  description: string;
  iconUrl: string | null;
}

export interface RenderItem extends Item {
  oneLiner?: string;
  screenshotUrl?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const requiredText = (record: Record<string, unknown>, field: string, index: number) => {
  const value = record[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`items[${index}].${field} must be a non-empty string`);
  }
  return value;
};

const optionalText = (record: Record<string, unknown>, field: string, index: number) => {
  const value = record[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error(`items[${index}].${field} must be a string`);
  return value.trim() || undefined;
};

const parseItem = (raw: unknown, index: number): RenderItem => {
  if (!isRecord(raw)) throw new Error(`items[${index}] must be an object`);
  const kind = raw.kind;
  if (kind !== "integration" && kind !== "widget") {
    throw new Error(`items[${index}].kind must be "integration" or "widget"`);
  }
  return {
    kind,
    slug: requiredText(raw, "slug", index),
    name: requiredText(raw, "name", index),
    description: optionalText(raw, "description", index) ?? "",
    iconUrl: optionalText(raw, "iconUrl", index) ?? null,
    oneLiner: optionalText(raw, "oneLiner", index),
    screenshotUrl: optionalText(raw, "screenshotUrl", index),
  };
};

export const parseItems = (raw: unknown): RenderItem[] => {
  if (!Array.isArray(raw)) throw new Error("items file must contain a JSON array");
  return raw.map(parseItem);
};

export const tileText = (item: RenderItem) => {
  const flat = item.description.replace(/\s+/g, " ").trim();
  return item.oneLiner || /^.+?[.!?](?=\s|$)/.exec(flat)?.[0] || flat;
};
