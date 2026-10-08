/** @vitest-environment node */

import { describe, expect, test } from "vitest";

import type { Database } from "@homarr/db";
import { createDb } from "@homarr/db/test";

import { iconRepositories, icons } from "../schema";
import { migrateIconSearchNameAsync } from "../migrations/custom/0005_backfill_icon_search_name";

describe("icon search name migration", () => {
  test("backfills legacy names and remains safe to rerun", async () => {
    const db = createDb();
    await db.insert(iconRepositories).values({ id: "repository", slug: "dashboard-icons" });
    await db.insert(icons).values([
      {
        id: "named-icon",
        name: "Home-Assistant.svg",
        url: "https://example.com/ignored.svg",
        checksum: "named-icon",
        iconRepositoryId: "repository",
      },
      {
        id: "url-icon",
        name: "",
        url: "https://example.com/Café-Icons.svg?size=small",
        checksum: "url-icon",
        iconRepositoryId: "repository",
      },
      {
        id: "already-filled",
        name: "Original.svg",
        searchName: "keepme",
        url: "https://example.com/original.svg",
        checksum: "already-filled",
        iconRepositoryId: "repository",
      },
    ]);

    await migrateIconSearchNameAsync(db as unknown as Database);
    await migrateIconSearchNameAsync(db as unknown as Database);

    const migratedIcons = await db.query.icons.findMany({ orderBy: (table, { asc }) => asc(table.id) });
    expect(migratedIcons.map(({ id, searchName }) => [id, searchName])).toEqual([
      ["already-filled", "keepme"],
      ["named-icon", "homeassistant"],
      ["url-icon", "cafeicons"],
    ]);
  });
});
