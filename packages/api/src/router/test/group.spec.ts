import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/db";
import { groupMembers, groups, users } from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";

import { groupRouter } from "../groups";

const defaultCreatorId = createId();
const defaultSession = {
  user: {
    id: defaultCreatorId,
  },
  expires: new Date().toISOString(),
} satisfies Session;

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", async () => {
  const mod = await import("@homarr/auth/security");
  return { ...mod, auth: () => ({}) as Session };
});

describe("paginated should return a list of groups with pagination", () => {
  test.each([
    [1, 3],
    [2, 2],
  ])(
    "with 5 groups in database and pageSize set to 3 on page %s it should return %s groups",
    async (page, expectedCount) => {
      // Arrange
      const db = createDb();
      const caller = groupRouter.createCaller({ db, session: defaultSession });

      await db.insert(groups).values(
        [1, 2, 3, 4, 5].map((number) => ({
          id: number.toString(),
          name: `Group ${number}`,
        })),
      );

      // Act
      const result = await caller.paginated({
        page,
        pageSize: 3,
      });

      // Assert
      expect(result.items.length).toBe(expectedCount);
    },
  );

  test("with 5 groups in database and pagesize set to 3 it should return total count 5", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    await db.insert(groups).values(
      [1, 2, 3, 4, 5].map((number) => ({
        id: number.toString(),
        name: `Group ${number}`,
      })),
    );

    // Act
    const result = await caller.paginated({
      pageSize: 3,
    });

    // Assert
    expect(result.totalCount).toBe(5);
  });

  test("groups should contain id, name, email and image of members", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    const user = {
      id: createId(),
      name: "username",
      email: "user@gmail.com",
      image: "example",
      password: "secret",
      salt: "secret",
    };
    await db.insert(users).values(user);
    const groupId = createId();
    await db.insert(groups).values({
      id: groupId,
      name: "Group",
    });
    await db.insert(groupMembers).values({
      groupId,
      userId: user.id,
    });

    // Act
    const result = await caller.paginated({});

    // Assert
    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.members.length).toBe(1);
    const userKeys = Object.keys(item?.members[0] ?? {});
    expect(userKeys.length).toBe(4);
    expect(
      ["id", "name", "email", "image"].some((key) => userKeys.includes(key)),
    );
  });

  test.each([
    [undefined, 5, "first"],
    ["d", 2, "second"],
    ["th", 3, "third"],
    ["fi", 2, "first"],
  ])(
    "groups should be searchable by name with contains pattern, query %s should result in %s results",
    async (query, expectedCount, firstKey) => {
      // Arrange
      const db = createDb();
      const caller = groupRouter.createCaller({ db, session: defaultSession });

      await db.insert(groups).values(
        ["first", "second", "third", "forth", "fifth"].map((key, index) => ({
          id: index.toString(),
          name: key,
        })),
      );

      // Act
      const result = await caller.paginated({
        search: query,
      });

      // Assert
      expect(result.totalCount).toBe(expectedCount);
      expect(result.items.at(0)?.name).toBe(firstKey);
    },
  );
});

describe("byId should return group by id including members and permissions", () => {});
