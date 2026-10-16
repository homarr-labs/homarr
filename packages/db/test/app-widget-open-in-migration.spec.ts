import { parse, stringify } from "superjson";
import { describe, expect, test } from "vitest";

import type { Database } from "..";
import { migrateAppWidgetOpenInAsync } from "../migrations/custom/0005_app_widget_open_in";
import { boards, items, users } from "../schema";
import { createDb } from "./db-mock";

describe("App widget opening mode migration", () => {
  test("migrates legacy modes, preserves other settings and explicit modes, and is idempotent", async () => {
    const database = createDb();
    try {
      await database.insert(users).values({ id: "migration-user" });
      await database.insert(boards).values({ id: "migration-board", name: "Migration", creatorId: "migration-user" });

      const cases = [
        {
          id: "current",
          before: { openInNewTab: false, appId: "existing-app", showTitle: false },
          after: { openIn: "currentTab", appId: "existing-app", showTitle: false },
        },
        { id: "tab", before: { openInNewTab: true }, after: { openIn: "newTab" } },
        {
          id: "window",
          before: { openInNewTab: false, openInNewWindow: true },
          after: { openIn: "newWindow" },
        },
        { id: "window-disabled", before: { openInNewWindow: false }, after: { openIn: "newTab" } },
        {
          id: "explicit",
          before: { openIn: "currentTab", openInNewTab: true, openInNewWindow: true },
          after: { openIn: "currentTab", openInNewTab: true, openInNewWindow: true },
        },
        { id: "default", before: { showTitle: false }, after: { showTitle: false } },
      ];
      await database.insert(items).values(
        cases.map(({ id, before }) => ({
          id,
          kind: "app" as const,
          boardId: "migration-board",
          options: stringify(before),
        })),
      );
      await database.insert(items).values({
        id: "clock",
        kind: "clock",
        boardId: "migration-board",
        options: stringify({ openInNewTab: false }),
      });

      await migrateAppWidgetOpenInAsync(database as unknown as Database);
      const migrated = await database.query.items.findMany({ orderBy: (table, { asc }) => asc(table.id) });
      const migratedOptions = Object.fromEntries(migrated.map((item) => [item.id, parse(item.options)]));
      for (const entry of cases) {
        expect(migratedOptions[entry.id]).toEqual(entry.after);
      }
      expect(migratedOptions.clock).toEqual({ openInNewTab: false });

      await migrateAppWidgetOpenInAsync(database as unknown as Database);
      expect(await database.query.items.findMany({ orderBy: (table, { asc }) => asc(table.id) })).toEqual(migrated);
    } finally {
      database.$client.close();
    }
  });
});
