import SuperJSON from "superjson";

import { eq } from "../..";
import type { Database } from "../..";
import { items } from "../../schema";

export async function migrateAppWidgetOpenInAsync(db: Database) {
  const existingAppItems = await db.query.items.findMany({
    where: (table) => eq(table.kind, "app"),
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
      const { openInNewTab, openInNewWindow, ...options } = item.options;
      const openIn = openInNewWindow === true ? "newWindow" : openInNewTab === false ? "currentTab" : "newTab";
      await db
        .update(items)
        .set({ options: SuperJSON.stringify({ ...options, openIn }) })
        .where(eq(items.id, item.id));
    }),
  );
}
