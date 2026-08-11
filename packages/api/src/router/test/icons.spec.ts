import { describe, expect, test } from "vitest";

import { iconRepositories, icons } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { iconsRouter } from "../icons";

describe("findIcons", () => {
  test.each(["homeassistant", "home_assistant", "home assistant.png"])(
    "matches normalized search %s before applying the group limit",
    async (searchText) => {
      const db = createDb();
      const caller = iconsRouter.createCaller({ db, deviceType: undefined, session: null });

      await db.insert(iconRepositories).values({ id: "repository", slug: "dashboard-icons" });
      await db.insert(icons).values([
        {
          id: "irrelevant",
          name: "000-unrelated.svg",
          url: "https://example.com/000-unrelated.svg",
          checksum: "irrelevant",
          iconRepositoryId: "repository",
        },
        {
          id: "home-assistant",
          name: "home-assistant.svg",
          url: "https://example.com/home-assistant.svg",
          checksum: "home-assistant",
          iconRepositoryId: "repository",
        },
      ]);

      const result = await caller.findIcons({ searchText, limitPerGroup: 1 });

      expect(result.icons[0]?.icons).toEqual([
        {
          id: "home-assistant",
          name: "home-assistant.svg",
          url: "https://example.com/home-assistant.svg",
        },
      ]);
    },
  );
});
