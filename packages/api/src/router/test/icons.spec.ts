// @vitest-environment node

import { describe, expect, test } from "vitest";

import { iconRepositories, icons } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { iconsRouter } from "../icons";

describe("findIcons", () => {
  test("returns only repositories containing matches for a search", async () => {
    const db = createDb();
    await db.insert(iconRepositories).values([
      { id: "dashboard-icons", slug: "homarr-labs/dashboard-icons" },
      { id: "other-icons", slug: "example/other-icons" },
    ]);
    await db.insert(icons).values([
      {
        id: "discord-svg",
        name: "discord.svg",
        url: "https://cdn.example.com/discord.svg",
        checksum: "discord",
        iconRepositoryId: "dashboard-icons",
      },
      {
        id: "homarr-svg",
        name: "homarr.svg",
        url: "https://cdn.example.com/homarr.svg",
        checksum: "homarr",
        iconRepositoryId: "other-icons",
      },
    ]);
    const caller = iconsRouter.createCaller({ db, deviceType: undefined, session: null });

    const result = await caller.findIcons({ searchText: "discord", limitPerGroup: 6 });

    expect(result.countIcons).toBe(2);
    expect(result.icons).toHaveLength(1);
    expect(result.icons[0]).toMatchObject({
      slug: "homarr-labs/dashboard-icons",
      icons: [{ name: "discord.svg", url: "https://cdn.example.com/discord.svg" }],
    });
  });

  test("keeps repositories when browsing without a search", async () => {
    const db = createDb();
    await db.insert(iconRepositories).values({ id: "empty", slug: "example/empty" });
    const caller = iconsRouter.createCaller({ db, deviceType: undefined, session: null });

    const result = await caller.findIcons({ limitPerGroup: 6 });

    expect(result.icons).toMatchObject([{ slug: "example/empty", icons: [] }]);
  });

  test("finds the Homarr icon and returns its exact local repository URL", async () => {
    const db = createDb();
    await db.insert(iconRepositories).values({ id: "dashboard-icons", slug: "homarr-labs/dashboard-icons" });
    await db.insert(icons).values({
      id: "homarr-svg",
      name: "homarr.svg",
      url: "https://cdn.example.com/homarr.svg",
      checksum: "homarr",
      iconRepositoryId: "dashboard-icons",
    });
    const caller = iconsRouter.createCaller({ db, deviceType: undefined, session: null });

    await expect(caller.findIcons({ searchText: "homarr" })).resolves.toMatchObject({
      countIcons: 1,
      icons: [
        {
          slug: "homarr-labs/dashboard-icons",
          icons: [{ name: "homarr.svg", url: "https://cdn.example.com/homarr.svg" }],
        },
      ],
    });
  });

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
