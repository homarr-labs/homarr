import SuperJSON from "superjson";

import { normalizeAppWidgetOptions } from "@homarr/validation/app";

import { eq } from "../..";
import type { Database } from "../..";
import { items } from "../../schema";

export async function migrateAppWidgetOpenInAsync(db: Database) {
  const existingAppItems = await db.query.items.findMany({
    where: (table, { eq: equals }) => equals(table.kind, "app"),
  });

  const itemsToUpdate = existingAppItems
    .map((item) => ({
      id: item.id,
      options: SuperJSON.parse<Record<string, unknown>>(item.options),
    }))
    .filter(
      (item) =>
        item.options.openIn === undefined &&
        (item.options.openInNewTab !== undefined || item.options.openInNewWindow !== undefined),
    );

  await Promise.all(
    itemsToUpdate.map(async (item) => {
      await db
        .update(items)
        .set({ options: SuperJSON.stringify(normalizeAppWidgetOptions(item.options)) })
        .where(eq(items.id, item.id));
    }),
  );
}
