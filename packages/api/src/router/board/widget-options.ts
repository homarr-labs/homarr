import { isDeepStrictEqual } from "node:util";

import { TRPCError } from "@trpc/server";

import type { Database } from "@homarr/db";
import { getServerSettingByKeyAsync } from "@homarr/db/queries";
import type { WidgetKind } from "@homarr/definitions";
import type { WidgetOptionsSchemaSettings } from "@homarr/validation/widgets/options";
import { widgetOptionsSchemas } from "@homarr/validation/widgets/options";

interface WidgetOptionsItem {
  id: string;
  kind: WidgetKind;
  options: Record<string, unknown>;
}

const parseWidgetOptions = (item: WidgetOptionsItem, settings: WidgetOptionsSchemaSettings) => {
  const createOptionsSchema = widgetOptionsSchemas[item.kind];
  if (!createOptionsSchema) return item.options;

  // Like the board UI, treat null as a missing option that falls back to its default.
  const presentOptions = Object.fromEntries(
    Object.entries(item.options).filter(([, value]) => value !== null && value !== undefined),
  );
  const result = createOptionsSchema(settings).safeParse(presentOptions);
  if (!result.success) {
    const itemName = item.id ? `${item.kind} item ${item.id}` : `${item.kind} item`;
    const issues = result.error.issues
      .map((issue) => `${issue.path.map(String).join(".")}: ${issue.message}`)
      .join("; ");
    throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid options for ${itemName}: ${issues}` });
  }

  return result.data;
};

const getWidgetOptionsSchemaSettingsAsync = async (db: Database): Promise<WidgetOptionsSchemaSettings> => {
  const { enableStatusByDefault } = await getServerSettingByKeyAsync(db, "board");
  return { enableStatusByDefault };
};

/**
 * Validates the options of a widget kind with a server-side option schema, fills in missing options with their
 * defaults and drops unknown options, like the board UI does when it saves a widget.
 */
export const normalizeWidgetOptionsAsync = async (db: Database, item: WidgetOptionsItem) => {
  if (!widgetOptionsSchemas[item.kind]) return item.options;
  return parseWidgetOptions(item, await getWidgetOptionsSchemaSettingsAsync(db));
};

/**
 * Normalizes the options of new or changed items. Unchanged items keep their stored options, so boards with legacy
 * options can still be saved.
 */
export const normalizeChangedWidgetOptionsAsync = async <TItem extends WidgetOptionsItem>(
  db: Database,
  submittedItems: TItem[],
  storedItems: readonly WidgetOptionsItem[],
): Promise<TItem[]> => {
  const storedItemsById = new Map(storedItems.map((item) => [item.id, item]));
  const changedItems = new Set(
    submittedItems.filter((item) => {
      if (!widgetOptionsSchemas[item.kind]) return false;
      const storedItem = storedItemsById.get(item.id);
      return storedItem?.kind !== item.kind || !isDeepStrictEqual(item.options, storedItem.options);
    }),
  );
  if (changedItems.size === 0) return submittedItems;

  const settings = await getWidgetOptionsSchemaSettingsAsync(db);
  return submittedItems.map((item) =>
    changedItems.has(item) ? { ...item, options: parseWidgetOptions(item, settings) } : item,
  );
};
