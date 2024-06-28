import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId, eq } from "@homarr/db";
import { groupMembers, groupPermissions, groups, users } from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";

import { groupRouter } from "../group";

const defaultOwnerId = createId();
const defaultSession = {
  user: {
    id: defaultOwnerId,
    permissions: [],
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
      const result = await caller.getPaginated({
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
    const result = await caller.getPaginated({
      pageSize: 3,
    });

    // Assert
    expect(result.totalCount).toBe(5);
  });

  test("groups should contain id, name, email and image of members", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    const user = createDummyUser();
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
    const result = await caller.getPaginated({});

    // Assert
    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.members.length).toBe(1);
    const userKeys = Object.keys(item?.members[0] ?? {});
    expect(userKeys.length).toBe(4);
    expect(["id", "name", "email", "image"].some((key) => userKeys.includes(key)));
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
      const result = await caller.getPaginated({
        search: query,
      });

      // Assert
      expect(result.totalCount).toBe(expectedCount);
      expect(result.items.at(0)?.name).toBe(firstKey);
    },
  );
});

describe("byId should return group by id including members and permissions", () => {
  test('should return group with id "1" with members and permissions', async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    const user = createDummyUser();
    const groupId = "1";
    await db.insert(users).values(user);
    await db.insert(groups).values([
      {
        id: groupId,
        name: "Group",
      },
      {
        id: createId(),
        name: "Another group",
      },
    ]);
    await db.insert(groupMembers).values({
      userId: user.id,
      groupId,
    });
    await db.insert(groupPermissions).values({
      groupId,
      permission: "admin",
    });

    // Act
    const result = await caller.getById({
      id: groupId,
    });

    // Assert
    expect(result.id).toBe(groupId);
    expect(result.members.length).toBe(1);

    const userKeys = Object.keys(result.members[0] ?? {});
    expect(userKeys.length).toBe(4);
    expect(["id", "name", "email", "image"].some((key) => userKeys.includes(key)));
    expect(result.permissions.length).toBe(1);
    expect(result.permissions[0]).toBe("admin");
  });

  test("with group id 1 and group 2 in database it should throw NOT_FOUND error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    await db.insert(groups).values({
      id: "2",
      name: "Group",
    });

    // Act
    const actAsync = async () => await caller.getById({ id: "1" });

    // Assert
    await expect(actAsync()).rejects.toThrow("Group not found");
  });
});

describe("create should create group in database", () => {
  test("with valid input (64 character name) and non existing name it should be successful", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    const name = "a".repeat(64);
    await db.insert(users).values(defaultSession.user);

    // Act
    const result = await caller.createGroup({
      name,
    });

    // Assert
    const item = await db.query.groups.findFirst({
      where: eq(groups.id, result),
    });

    expect(item).toBeDefined();
    expect(item?.id).toBe(result);
    expect(item?.ownerId).toBe(defaultOwnerId);
    expect(item?.name).toBe(name);
  });

  test("with more than 64 characters name it should fail while validation", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });
    const longName = "a".repeat(65);

    // Act
    const actAsync = async () =>
      await caller.createGroup({
        name: longName,
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("too_big");
  });

  test.each([
    ["test", "Test"],
    ["test", "Test "],
    ["test", "test"],
    ["test", " TeSt"],
  ])("with similar name %s it should fail to create %s", async (similarName, nameToCreate) => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    await db.insert(groups).values({
      id: createId(),
      name: similarName,
    });

    // Act
    const actAsync = async () => await caller.createGroup({ name: nameToCreate });

    // Assert
    await expect(actAsync()).rejects.toThrow("similar name");
  });
});

describe("update should update name with value that is no duplicate", () => {
  test.each([
    ["first", "second ", "second"],
    ["first", " first", "first"],
  ])("update should update name from %s to %s normalized", async (initialValue, updateValue, expectedValue) => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    const groupId = createId();
    await db.insert(groups).values([
      {
        id: groupId,
        name: initialValue,
      },
      {
        id: createId(),
        name: "Third",
      },
    ]);

    // Act
    await caller.updateGroup({
      id: groupId,
      name: updateValue,
    });

    // Assert
    const value = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    expect(value?.name).toBe(expectedValue);
  });

  test.each([
    ["Second ", "second"],
    [" seCond", "second"],
  ])("with similar name %s it should fail to update %s", async (updateValue, initialDuplicate) => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    const groupId = createId();
    await db.insert(groups).values([
      {
        id: groupId,
        name: "Something",
      },
      {
        id: createId(),
        name: initialDuplicate,
      },
    ]);

    // Act
    const actAsync = async () =>
      await caller.updateGroup({
        id: groupId,
        name: updateValue,
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("similar name");
  });

  test("with non existing id it should throw not found error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    await db.insert(groups).values({
      id: createId(),
      name: "something",
    });

    // Act
    const act = () =>
      caller.updateGroup({
        id: createId(),
        name: "something else",
      });

    // Assert
    await expect(act()).rejects.toThrow("Group not found");
  });
});

describe("savePermissions should save permissions for group", () => {
  test("with existing group and permissions it should save permissions", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    const groupId = createId();
    await db.insert(groups).values({
      id: groupId,
      name: "Group",
    });
    await db.insert(groupPermissions).values({
      groupId,
      permission: "admin",
    });

    // Act
    await caller.savePermissions({
      groupId,
      permissions: ["integration-use-all", "board-full-all"],
    });

    // Assert
    const permissions = await db.query.groupPermissions.findMany({
      where: eq(groupPermissions.groupId, groupId),
    });

    expect(permissions.length).toBe(2);
    expect(permissions.map(({ permission }) => permission)).toEqual(["integration-use-all", "board-full-all"]);
  });

  test("with non existing group it should throw not found error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    await db.insert(groups).values({
      id: createId(),
      name: "Group",
    });

    // Act
    const actAsync = async () =>
      await caller.savePermissions({
        groupId: createId(),
        permissions: ["integration-create", "board-full-all"],
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Group not found");
  });
});

describe("transferOwnership should transfer ownership of group", () => {
  test("with existing group and user it should transfer ownership", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    const groupId = createId();
    const newUserId = createId();
    await db.insert(users).values([
      {
        id: newUserId,
        name: "New user",
      },
      {
        id: defaultOwnerId,
        name: "Old user",
      },
    ]);
    await db.insert(groups).values({
      id: groupId,
      name: "Group",
      ownerId: defaultOwnerId,
    });

    // Act
    await caller.transferOwnership({
      groupId,
      userId: newUserId,
    });

    // Assert
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });

    expect(group?.ownerId).toBe(newUserId);
  });

  test("with non existing group it should throw not found error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    await db.insert(groups).values({
      id: createId(),
      name: "Group",
    });

    // Act
    const actAsync = async () =>
      await caller.transferOwnership({
        groupId: createId(),
        userId: createId(),
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Group not found");
  });
});

describe("deleteGroup should delete group", () => {
  test("with existing group it should delete group", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    const groupId = createId();
    await db.insert(groups).values([
      {
        id: groupId,
        name: "Group",
      },
      {
        id: createId(),
        name: "Another group",
      },
    ]);

    // Act
    await caller.deleteGroup({
      id: groupId,
    });

    // Assert
    const dbGroups = await db.query.groups.findMany();

    expect(dbGroups.length).toBe(1);
    expect(dbGroups[0]?.id).not.toBe(groupId);
  });

  test("with non existing group it should throw not found error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    await db.insert(groups).values({
      id: createId(),
      name: "Group",
    });

    // Act
    const actAsync = async () =>
      await caller.deleteGroup({
        id: createId(),
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Group not found");
  });
});

describe("addMember should add member to group", () => {
  test("with existing group and user it should add member", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    const groupId = createId();
    const userId = createId();
    await db.insert(users).values([
      {
        id: userId,
        name: "User",
      },
      {
        id: defaultOwnerId,
        name: "Creator",
      },
    ]);
    await db.insert(groups).values({
      id: groupId,
      name: "Group",
      ownerId: defaultOwnerId,
    });

    // Act
    await caller.addMember({
      groupId,
      userId,
    });

    // Assert
    const members = await db.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, groupId),
    });

    expect(members.length).toBe(1);
    expect(members[0]?.userId).toBe(userId);
  });

  test("with non existing group it should throw not found error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    await db.insert(users).values({
      id: createId(),
      name: "User",
    });

    // Act
    const actAsync = async () =>
      await caller.addMember({
        groupId: createId(),
        userId: createId(),
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Group not found");
  });
});

describe("removeMember should remove member from group", () => {
  test("with existing group and user it should remove member", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    const groupId = createId();
    const userId = createId();
    await db.insert(users).values([
      {
        id: userId,
        name: "User",
      },
      {
        id: defaultOwnerId,
        name: "Creator",
      },
    ]);
    await db.insert(groups).values({
      id: groupId,
      name: "Group",
      ownerId: defaultOwnerId,
    });
    await db.insert(groupMembers).values({
      groupId,
      userId,
    });

    // Act
    await caller.removeMember({
      groupId,
      userId,
    });

    // Assert
    const members = await db.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, groupId),
    });

    expect(members.length).toBe(0);
  });

  test("with non existing group it should throw not found error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, session: defaultSession });

    await db.insert(users).values({
      id: createId(),
      name: "User",
    });

    // Act
    const actAsync = async () =>
      await caller.removeMember({
        groupId: createId(),
        userId: createId(),
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Group not found");
  });
});

const createDummyUser = () => ({
  id: createId(),
  name: "username",
  email: "user@gmail.com",
  image: "example",
  password: "secret",
  salt: "secret",
});
