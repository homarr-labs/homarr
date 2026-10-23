import { parse, stringify } from "superjson";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { createId } from "@homarr/common";

import type { Database } from "..";
import { eq } from "..";
import { migrateReleasesWidgetOptionsAsync } from "../migrations/custom/0005_releases_widget_options";
import { boards, items, users } from "../schema";
import { createDb } from "./db-mock";

type TestDatabase = ReturnType<typeof createDb>;

const createBoardAsync = async (db: TestDatabase) => {
  const userId = createId();
  const boardId = createId();
  await db.insert(users).values({ id: userId });
  await db.insert(boards).values({ id: boardId, name: `releases-${boardId}`, creatorId: userId });
  return boardId;
};

const insertItemAsync = async (
  db: TestDatabase,
  boardId: string,
  options: object,
  kind: "releases" | "clock" = "releases",
) => {
  const itemId = createId();
  await db.insert(items).values({ id: itemId, boardId, kind, options: stringify(options) });
  return itemId;
};

const readOptionsAsync = async (db: TestDatabase, itemId: string) => {
  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  return parse<Record<string, unknown>>(item?.options ?? "{}");
};

const migrateAsync = (db: TestDatabase) => migrateReleasesWidgetOptionsAsync(db as unknown as Database);

const migrateOptionsAsync = async (options: object) => {
  const db = createDb();
  const boardId = await createBoardAsync(db);
  const itemId = await insertItemAsync(db, boardId, options);
  await migrateAsync(db);
  return readOptionsAsync(db, itemId);
};

const legacyDefaults = {
  newReleaseWithin: "1w",
  staleReleaseWithin: "6M",
  showOnlyHighlighted: true,
  showDetails: true,
  showOnlyIcon: false,
  topReleases: 0,
};

describe("releases widget options migration", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  test.each([
    ["12h", "1d"],
    ["2d", "3d"],
    ["5d", "1w"],
    ["9d", "1w"],
    ["10d", "2w"],
    ["11d", "2w"],
    ["3w", "1M"],
    ["6w", "1M"],
    ["8w", "3M"],
    ["1y", "3M"],
    ["4D", "3d"],
  ])("maps a free-text new release window of %s to the closest preset %s", async (legacy, expected) => {
    const options = await migrateOptionsAsync({ ...legacyDefaults, newReleaseWithin: legacy });

    expect(options.newReleaseWithin).toBe(expected);
  });

  test.each([
    ["2w", "1M"],
    ["2M", "3M"],
    ["4M", "3M"],
    ["7M", "6M"],
    ["9M", "1y"],
    ["15M", "1y"],
    ["18M", "2y"],
    ["5y", "2y"],
    ["1w", "1M"],
  ])("maps a free-text quiet window of %s to the closest preset %s", async (legacy, expected) => {
    const options = await migrateOptionsAsync({ ...legacyDefaults, staleReleaseWithin: legacy });

    expect(options.staleReleaseWithin).toBe(expected);
  });

  test.each(["", "never"])("maps the disabled window %j to never", async (legacy) => {
    const options = await migrateOptionsAsync({
      ...legacyDefaults,
      newReleaseWithin: legacy,
      staleReleaseWithin: legacy,
    });

    expect(options.newReleaseWithin).toBe("never");
    expect(options.staleReleaseWithin).toBe("never");
  });

  test.each([["soon"], ["0d"], ["-3d"], ["3x"], [42], [null]])(
    "falls back to the default windows for the invalid value %j",
    async (legacy) => {
      const options = await migrateOptionsAsync({
        ...legacyDefaults,
        newReleaseWithin: legacy,
        staleReleaseWithin: legacy,
      });

      expect(options.newReleaseWithin).toBe("1w");
      expect(options.staleReleaseWithin).toBe("6M");
    },
  );

  test("falls back to the default windows when they are missing", async () => {
    const options = await migrateOptionsAsync({ showOnlyHighlighted: true });

    expect(options.newReleaseWithin).toBe("1w");
    expect(options.staleReleaseWithin).toBe("6M");
  });

  test("keeps windows that already match a preset", async () => {
    const options = await migrateOptionsAsync({ ...legacyDefaults, newReleaseWithin: "3M", staleReleaseWithin: "2y" });

    expect(options.newReleaseWithin).toBe("3M");
    expect(options.staleReleaseWithin).toBe("2y");
  });

  test.each([
    [true, ["new", "attention", "quiet"]],
    [false, ["new", "attention", "upToDate", "quiet"]],
  ])("maps show only highlighted %j to the sections %j", async (showOnlyHighlighted, expected) => {
    const options = await migrateOptionsAsync({ ...legacyDefaults, showOnlyHighlighted });

    expect(options.sections).toEqual(expected);
  });

  test("hides the up to date section when show only highlighted is missing", async () => {
    const { showOnlyHighlighted: _showOnlyHighlighted, ...legacy } = legacyDefaults;

    const options = await migrateOptionsAsync(legacy);

    expect(options.sections).toEqual(["new", "attention", "quiet"]);
  });

  test.each([
    [false, false],
    [true, true],
    ["no", true],
  ])("maps show details %j to show changelog preview %j", async (showDetails, expected) => {
    const options = await migrateOptionsAsync({ ...legacyDefaults, showDetails });

    expect(options.showChangelogPreview).toBe(expected);
  });

  test("leaves show changelog preview to its default when show details is missing", async () => {
    const { showDetails: _showDetails, ...legacy } = legacyDefaults;

    const options = await migrateOptionsAsync(legacy);

    expect(options).not.toHaveProperty("showChangelogPreview");
  });

  test("removes the legacy options and keeps the others", async () => {
    const repositories = [{ id: createId(), provider: "github", identifier: "homarr-labs/homarr" }];

    const options = await migrateOptionsAsync({
      ...legacyDefaults,
      repositories,
      hiddenDockerSuggestions: ["nginx"],
    });

    expect(options).toEqual({
      newReleaseWithin: "1w",
      staleReleaseWithin: "6M",
      sections: ["new", "attention", "quiet"],
      showChangelogPreview: true,
      repositories,
      hiddenDockerSuggestions: ["nginx"],
    });
  });

  test("migrates an item that only has one legacy option", async () => {
    const options = await migrateOptionsAsync({ newReleaseWithin: "10d", topReleases: 3 });

    expect(options).toEqual({
      newReleaseWithin: "2w",
      staleReleaseWithin: "6M",
      sections: ["new", "attention", "quiet"],
    });
  });

  test("leaves items without legacy options untouched", async () => {
    const db = createDb();
    const boardId = await createBoardAsync(db);
    const current = {
      summary: "detailed",
      sections: ["new"],
      collapsedSections: [],
      newReleaseWithin: "10d",
      staleReleaseWithin: "",
      showChangelogPreview: false,
    };
    const itemId = await insertItemAsync(db, boardId, current);

    await migrateAsync(db);

    expect(await readOptionsAsync(db, itemId)).toEqual(current);
  });

  test("is a no-op when run a second time", async () => {
    const db = createDb();
    const boardId = await createBoardAsync(db);
    const itemId = await insertItemAsync(db, boardId, {
      ...legacyDefaults,
      newReleaseWithin: "5d",
      showOnlyHighlighted: false,
      showDetails: false,
    });

    await migrateAsync(db);
    const first = await readOptionsAsync(db, itemId);
    await migrateAsync(db);

    expect(await readOptionsAsync(db, itemId)).toEqual(first);
    expect(first).toEqual({
      newReleaseWithin: "1w",
      staleReleaseWithin: "6M",
      sections: ["new", "attention", "upToDate", "quiet"],
      showChangelogPreview: false,
    });
  });

  test("leaves other widget kinds untouched", async () => {
    const db = createDb();
    const boardId = await createBoardAsync(db);
    const clockOptions = { showOnlyHighlighted: true, showDetails: false, newReleaseWithin: "5d" };
    const clockId = await insertItemAsync(db, boardId, clockOptions, "clock");

    await migrateAsync(db);

    expect(await readOptionsAsync(db, clockId)).toEqual(clockOptions);
  });
});
