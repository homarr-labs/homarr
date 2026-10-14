import type { IconReadScope, LocalIconMedia } from "./resources";
import type { StoredIcon, StoredIconRepository } from "./sync";

const string = (value: unknown) => {
  if (typeof value !== "string") throw new Error("Invalid icon SQL string");
  return value;
};

export const readLocalIconMediasAsync = async (scope: IconReadScope): Promise<LocalIconMedia[]> => {
  const rows = await scope.queryAsync({ sql: 'SELECT "id", "name", "content", "size" FROM "media"', parameters: [] });
  return rows.map((row) => {
    if (
      !(row.content instanceof Uint8Array) ||
      typeof row.size !== "number" ||
      !Number.isSafeInteger(row.size) ||
      row.size < 0
    )
      throw new Error("Invalid icon media binary projection");
    return { id: string(row.id), name: string(row.name), content: row.content, size: row.size };
  });
};

export const readStoredIconRepositoriesAsync = async (scope: IconReadScope): Promise<StoredIconRepository[]> => {
  const results = await Promise.allSettled([
    scope.queryAsync({ sql: 'SELECT "id", "slug" FROM "iconRepository"', parameters: [] }),
    scope.queryAsync({
      sql: 'SELECT "id", "name", "url", "checksum", "icon_repository_id" FROM "icon"',
      parameters: [],
    }),
  ]);
  const [repositories, icons] = results;
  if (repositories.status === "rejected") throw repositories.reason;
  if (icons.status === "rejected") throw icons.reason;
  const stored: StoredIcon[] = icons.value.map((row) => ({
    id: string(row.id),
    name: string(row.name),
    url: string(row.url),
    checksum: string(row.checksum),
    iconRepositoryId: string(row.icon_repository_id),
  }));
  return repositories.value.map((row) => {
    const id = string(row.id);
    return { id, slug: string(row.slug), icons: stored.filter((icon) => icon.iconRepositoryId === id) };
  });
};

export interface IconReferenceCodec {
  decode(value: string): unknown;
  maximumSerializedBytes: number;
  maximumValueNodes: number;
}

export const collectSelectedIconUrls = (values: readonly unknown[], maximumNodes: number): string[] => {
  const urls = new Set<string>();
  const seen = new Set<object>();
  const pending = [...values];
  const enqueue = (value: unknown) => {
    if (pending.length + nodes >= maximumNodes) throw new Error("Icon selection reference traversal exceeds its bound");
    pending.push(value);
  };
  let nodes = 0;
  while (pending.length > 0) {
    if (++nodes > maximumNodes) throw new Error("Icon selection reference traversal exceeds its bound");
    const value = pending.pop();
    if (typeof value === "string") {
      if (value.startsWith("/") || /^https?:\/\//.test(value)) urls.add(value);
    } else if (value && typeof value === "object" && !seen.has(value)) {
      seen.add(value);
      if (Array.isArray(value)) for (const entry of value) enqueue(entry);
      else if (value instanceof Map)
        for (const [key, entry] of value) {
          enqueue(key);
          enqueue(entry);
        }
      else if (value instanceof Set) for (const entry of value) enqueue(entry);
      else if (!(value instanceof Uint8Array) && !(value instanceof Date))
        for (const entry of Object.values(value)) enqueue(entry);
    }
  }
  return [...urls];
};

export const readSelectedIconUrlsAsync = async (scope: IconReadScope, codec: IconReferenceCodec): Promise<string[]> => {
  const results = await Promise.allSettled([
    scope.queryAsync({
      sql: 'SELECT "icon_url" AS "url" FROM "app" UNION ALL SELECT "icon_url" FROM "search_engine" UNION ALL SELECT "logo_image_url" FROM "board" UNION ALL SELECT "favicon_image_url" FROM "board" UNION ALL SELECT "background_image_url" FROM "board" UNION ALL SELECT "icon_url" FROM "custom_widget_definition" UNION ALL SELECT "icon_url" FROM "custom_widget_v2_definition"',
      parameters: [],
    }),
    scope.queryAsync({
      sql: 'SELECT "value" FROM "serverSetting" WHERE "setting_key" = \'branding\' UNION ALL SELECT "options" FROM "item" UNION ALL SELECT "advanced_options" FROM "item" UNION ALL SELECT "options" FROM "section" WHERE "options" IS NOT NULL UNION ALL SELECT "display_config" FROM "custom_widget_definition" UNION ALL SELECT "options" FROM "custom_widget_v2_definition"',
      parameters: [],
    }),
  ]);
  const [direct, serialized] = results;
  if (direct.status === "rejected") throw direct.reason;
  if (serialized.status === "rejected") throw serialized.reason;
  const values: unknown[] = direct.value.map((row) => {
    if (row.url !== null && typeof row.url !== "string") throw new Error("Invalid selected icon URL projection");
    return row.url;
  });
  let bytes = 0;
  const encoder = new TextEncoder();
  for (const row of serialized.value) {
    const value = string(row.value);
    bytes += encoder.encode(value).byteLength;
    if (bytes > codec.maximumSerializedBytes) throw new Error("Icon selection serialized values exceed their bound");
    values.push(codec.decode(value));
  }
  return collectSelectedIconUrls(values, codec.maximumValueNodes);
};
