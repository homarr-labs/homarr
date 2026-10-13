import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import * as env from "@homarr/auth/env";
import { createId } from "@homarr/common";
import { eq } from "@homarr/db";
import { boards, groupMembers, groupPermissions, groups, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { GroupPermissionKey } from "@homarr/definitions";
import { everyoneGroup } from "@homarr/definitions";

import { groupRouter } from "../group";

const defaultOwnerId = createId();
const createSession = (permissions: GroupPermissionKey[]) =>
  ({
    user: {
      id: defaultOwnerId,
      permissions,
      colorScheme: "light",
    },
    expires: new Date().toISOString(),
  }) satisfies Session;
const defaultSession = createSession([]);
const adminSession = createSession(["admin"]);

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", async () => {
  const mod = await import("@homarr/auth/security");
  return { ...mod, auth: () => ({}) as Session };
});

describe("getAll should return all groups", () => {
  test("getAll should return groups with members and permissions", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const user = createDummyUser();
    const groupId = createId();
    await db.insert(users).values(user);
    await db.insert(groups).values({ id: groupId, name: "Group", position: 1 });
    await db.insert(groupMembers).values({ groupId, userId: user.id });
    await db.insert(groupPermissions).values({ groupId, permission: "board-create" });

    // Act
    const result = await caller.getAll();

    // Assert
    expect(result).toEqual([
      {
        id: groupId,
        name: "Group",
        ownerId: null,
        homeBoardId: null,
        mobileHomeBoardId: null,
        position: 1,
        members: [{ id: user.id, name: user.name, email: user.email, image: user.image }],
        permissions: ["board-create"],
      },
    ]);
  });
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
      const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

      await db.insert(groups).values(
        [1, 2, 3, 4, 5].map((number) => ({
          id: number.toString(),
          name: `Group ${number}`,
          position: number,
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
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    await db.insert(groups).values(
      [1, 2, 3, 4, 5].map((number) => ({
        id: number.toString(),
        name: `Group ${number}`,
        position: number,
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
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const user = createDummyUser();
    await db.insert(users).values(user);
    const groupId = createId();
    await db.insert(groups).values({
      id: groupId,
      name: "Group",
      position: 1,
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
      const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

      await db.insert(groups).values(
        ["first", "second", "third", "forth", "fifth"].map((key, index) => ({
          id: index.toString(),
          name: key,
          position: index + 1,
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

  test("without admin permissions it should throw unauthorized error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    // Act
    const actAsync = async () => await caller.getPaginated({});

    // Assert
    await expect(actAsync()).rejects.toThrow("Permission denied");
  });
});

describe("byId should return group by id including members and permissions", () => {
  test('should return group with id "1" with members and permissions', async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const user = createDummyUser();
    const groupId = "1";
    await db.insert(users).values(user);
    await db.insert(groups).values([
      {
        id: groupId,
        name: "Group",
        position: 1,
      },
      {
        id: createId(),
        name: "Another group",
        position: 2,
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
    expect(userKeys.length).toBe(6);
    expect(
      ["id", "name", "email", "image", "provider", "isMembershipManagedLocally"].some((key) => userKeys.includes(key)),
    );
    expect(result.permissions.length).toBe(1);
    expect(result.permissions[0]).toBe("admin");
  });

  test("with group id 1 and group 2 in database it should throw NOT_FOUND error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    await db.insert(groups).values({
      id: "2",
      name: "Group",
      position: 1,
    });

    // Act
    const actAsync = async () => await caller.getById({ id: "1" });

    // Assert
    await expect(actAsync()).rejects.toThrow("Group not found");
  });

  test("should report whether the membership of each member is managed locally", async () => {
    // Arrange
    const db = createDb();
    const spy = vi.spyOn(env, "env", "get");
    spy.mockReturnValue({
      AUTH_PROVIDERS: ["credentials", "oidc", "ldap"],
      AUTH_OIDC_GROUPS_LOCAL_MANAGEMENT: false,
    } as never);
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(users).values([
      { id: "credentials", name: "Credentials" },
      { id: "oidc", name: "Oidc", provider: "oidc" },
      { id: "ldap", name: "Ldap", provider: "ldap" },
    ]);
    await db.insert(groups).values({ id: groupId, name: "Group", position: 1 });
    await db.insert(groupMembers).values([
      { groupId, userId: "credentials" },
      { groupId, userId: "oidc" },
      { groupId, userId: "ldap" },
    ]);

    // Act
    const result = await caller.getById({ id: groupId });

    // Assert
    const managedLocallyByUserId = Object.fromEntries(
      result.members.map((member) => [member.id, member.isMembershipManagedLocally]),
    );
    expect(managedLocallyByUserId).toEqual({ credentials: true, oidc: false, ldap: false });
  });

  test("without admin permissions it should throw unauthorized error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    // Act
    const actAsync = async () => await caller.getById({ id: "1" });

    // Assert
    await expect(actAsync()).rejects.toThrow("Permission denied");
  });
});

describe("create should create group in database", () => {
  test("with valid input (64 character name) and non existing name it should be successful", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const name = "a".repeat(64);
    await db.insert(users).values(defaultSession.user);

    // Act
    const result = await caller.createGroup({
      name,
    });

    // Assert
    const item = await db.query.groups.findFirst({
      where: eq(groups.id, result.id),
    });

    expect(item).toBeDefined();
    expect(item?.id).toBe(result.id);
    expect(item?.ownerId).toBe(defaultOwnerId);
    expect(item?.name).toBe(name);
  });

  test("with more than 64 characters name it should fail while validation", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });
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
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    await db.insert(groups).values({
      id: createId(),
      name: similarName,
      position: 1,
    });

    // Act
    const actAsync = async () => await caller.createGroup({ name: nameToCreate });

    // Assert
    await expect(actAsync()).rejects.toThrow("similar name");
  });

  test("without admin permissions it should throw unauthorized error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    // Act
    const actAsync = async () => await caller.createGroup({ name: "test" });

    // Assert
    await expect(actAsync()).rejects.toThrow("Permission denied");
  });
});

describe("update should update name with value that is no duplicate", () => {
  test.each([
    ["first", "second ", "second"],
    ["first", " first", "first"],
  ])("update should update name from %s to %s normalized", async (initialValue, updateValue, expectedValue) => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(groups).values([
      {
        id: groupId,
        name: initialValue,
        position: 1,
      },
      {
        id: createId(),
        name: "Third",
        position: 2,
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
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(groups).values([
      {
        id: groupId,
        name: "Something",
        position: 1,
      },
      {
        id: createId(),
        name: initialDuplicate,
        position: 2,
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
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    await db.insert(groups).values({
      id: createId(),
      name: "something",
      position: 1,
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

  test("without admin permissions it should throw unauthorized error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    // Act
    const actAsync = async () =>
      await caller.updateGroup({
        id: createId(),
        name: "test",
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Permission denied");
  });
});

describe("savePermissions should save permissions for group", () => {
  test("with existing group and permissions it should save permissions", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(groups).values({
      id: groupId,
      name: "Group",
      position: 1,
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

  test("with a standalone create permission it should not escalate to its parent permission", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(groups).values({
      id: groupId,
      name: "Group",
      position: 1,
    });

    // Act
    await caller.savePermissions({
      groupId,
      permissions: ["board-create"],
    });

    // Assert
    const permissions = await db.query.groupPermissions.findMany({
      where: eq(groupPermissions.groupId, groupId),
    });

    expect(permissions.map(({ permission }) => permission)).toEqual(["board-create"]);
  });

  test.each([["app-create"], ["integration-create"], ["search-engine-create"], ["media-upload"]] as const)(
    "with %s alone it should persist exactly that permission",
    async (permission) => {
      // Arrange
      const db = createDb();
      const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

      const groupId = createId();
      await db.insert(groups).values({
        id: groupId,
        name: "Group",
        position: 1,
      });

      // Act
      await caller.savePermissions({ groupId, permissions: [permission] });

      // Assert
      const permissions = await db.query.groupPermissions.findMany({
        where: eq(groupPermissions.groupId, groupId),
      });

      expect(permissions.map(({ permission: key }) => key)).toEqual([permission]);
    },
  );

  test("with a create permission and its parent it should persist exactly two rows", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(groups).values({
      id: groupId,
      name: "Group",
      position: 1,
    });

    // Act
    await caller.savePermissions({
      groupId,
      permissions: ["app-create", "app-modify-all"],
    });

    // Assert
    const permissions = await db.query.groupPermissions.findMany({
      where: eq(groupPermissions.groupId, groupId),
    });

    expect(permissions.length).toBe(2);
    expect(permissions.map(({ permission }) => permission).toSorted()).toEqual(["app-create", "app-modify-all"]);
  });

  test("with duplicate permissions it should persist each permission only once", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(groups).values({
      id: groupId,
      name: "Group",
      position: 1,
    });

    // Act
    await caller.savePermissions({
      groupId,
      permissions: ["board-view-all", "board-view-all", "board-modify-all"],
    });

    // Assert
    const permissions = await db.query.groupPermissions.findMany({
      where: eq(groupPermissions.groupId, groupId),
    });

    expect(permissions.map(({ permission }) => permission).toSorted()).toEqual(["board-modify-all", "board-view-all"]);
  });

  test("saving the same permissions twice should be idempotent", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(groups).values({
      id: groupId,
      name: "Group",
      position: 1,
    });

    // Act
    await caller.savePermissions({ groupId, permissions: ["board-create", "media-upload"] });
    await caller.savePermissions({ groupId, permissions: ["board-create", "media-upload"] });

    // Assert
    const permissions = await db.query.groupPermissions.findMany({
      where: eq(groupPermissions.groupId, groupId),
    });

    expect(permissions.map(({ permission }) => permission).toSorted()).toEqual(["board-create", "media-upload"]);
  });

  test("with an empty permission list it should clear all existing permissions", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(groups).values({
      id: groupId,
      name: "Group",
      position: 1,
    });
    await db.insert(groupPermissions).values([
      { groupId, permission: "admin" },
      { groupId, permission: "board-full-all" },
    ]);

    // Act
    await caller.savePermissions({
      groupId,
      permissions: [],
    });

    // Assert
    const permissions = await db.query.groupPermissions.findMany({
      where: eq(groupPermissions.groupId, groupId),
    });

    expect(permissions.length).toBe(0);
  });

  test("with non existing group it should throw not found error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    await db.insert(groups).values({
      id: createId(),
      name: "Group",
      position: 1,
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

  test("without admin permissions it should throw unauthorized error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    // Act
    const actAsync = async () =>
      await caller.savePermissions({
        groupId: createId(),
        permissions: ["integration-create", "board-full-all"],
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Permission denied");
  });
});

describe("savePartialSettings should save home boards of group", () => {
  test("with existing boards it should save only the supplied home boards", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    const homeBoardId = createId();
    const mobileHomeBoardId = createId();
    await db.insert(boards).values([
      { id: homeBoardId, name: "home" },
      { id: mobileHomeBoardId, name: "mobile" },
    ]);
    await db.insert(groups).values({ id: groupId, name: "Group", position: 1, mobileHomeBoardId });

    // Act
    await caller.savePartialSettings({ id: groupId, homeBoardId });

    // Assert
    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    expect(group?.homeBoardId).toBe(homeBoardId);
    expect(group?.mobileHomeBoardId).toBe(mobileHomeBoardId);
  });

  test("without any setting it should keep the home boards", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    const homeBoardId = createId();
    await db.insert(boards).values({ id: homeBoardId, name: "home" });
    await db.insert(groups).values({ id: groupId, name: "Group", position: 1, homeBoardId });

    // Act
    await caller.savePartialSettings({ id: groupId });

    // Assert
    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    expect(group?.homeBoardId).toBe(homeBoardId);
  });

  test("with non existing board it should throw not found error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(groups).values({ id: groupId, name: "Group", position: 1 });

    // Act
    const actAsync = async () => await caller.savePartialSettings({ id: groupId, mobileHomeBoardId: createId() });

    // Assert
    await expect(actAsync()).rejects.toThrow("Board not found");
  });
});

describe("savePositions should save positions of groups", () => {
  test("with every group except everyone it should save positions in the given order", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    await db.insert(groups).values([
      { id: "everyone", name: everyoneGroup, position: -1 },
      { id: "first", name: "First", position: 1 },
      { id: "second", name: "Second", position: 2 },
    ]);

    // Act
    await caller.savePositions({ positions: ["second", "first"] });

    // Assert
    const dbGroups = await db.query.groups.findMany({ columns: { id: true, position: true } });
    expect(dbGroups.toSorted((groupA, groupB) => groupA.position - groupB.position)).toEqual([
      { id: "everyone", position: -1 },
      { id: "second", position: 1 },
      { id: "first", position: 2 },
    ]);
  });

  test.each([
    [["second"], "Positions must include every group"],
    [["first", "second", "first"], "Group IDs must be unique"],
    [["first", "second", "unknown"], "Group not found"],
    [["everyone", "first", "second"], "Action is forbidden for reserved group names"],
  ])("with positions %s it should throw %s and keep positions", async (positions, expectedError) => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    await db.insert(groups).values([
      { id: "everyone", name: everyoneGroup, position: -1 },
      { id: "first", name: "First", position: 1 },
      { id: "second", name: "Second", position: 2 },
    ]);

    // Act
    const actAsync = async () => await caller.savePositions({ positions });

    // Assert
    await expect(actAsync()).rejects.toThrow(expectedError);
    const dbGroups = await db.query.groups.findMany({ columns: { id: true, position: true } });
    expect(dbGroups.toSorted((groupA, groupB) => groupA.position - groupB.position)).toEqual([
      { id: "everyone", position: -1 },
      { id: "first", position: 1 },
      { id: "second", position: 2 },
    ]);
  });
});

describe("transferOwnership should transfer ownership of group", () => {
  test("with existing group and user it should transfer ownership", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

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
      position: 1,
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
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    await db.insert(groups).values({
      id: createId(),
      name: "Group",
      position: 1,
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

  test("without admin permissions it should throw unauthorized error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    // Act
    const actAsync = async () =>
      await caller.transferOwnership({
        groupId: createId(),
        userId: createId(),
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Permission denied");
  });
});

describe("deleteGroup should delete group", () => {
  test("with existing group it should delete group", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(groups).values([
      {
        id: groupId,
        name: "Group",
        position: 1,
      },
      {
        id: createId(),
        name: "Another group",
        position: 2,
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
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    await db.insert(groups).values({
      id: createId(),
      name: "Group",
      position: 1,
    });

    // Act
    const actAsync = async () =>
      await caller.deleteGroup({
        id: createId(),
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Group not found");
  });

  test("without admin permissions it should throw unauthorized error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    // Act
    const actAsync = async () =>
      await caller.deleteGroup({
        id: createId(),
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Permission denied");
  });
});

describe("addMember should add member to group", () => {
  test("with existing group and user it should add member", async () => {
    // Arrange
    const db = createDb();
    const spy = vi.spyOn(env, "env", "get");
    spy.mockReturnValue({ AUTH_PROVIDERS: ["credentials"] } as never);
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

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
      position: 1,
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
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

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

  test("without admin permissions it should throw unauthorized error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    // Act
    const actAsync = async () =>
      await caller.addMember({
        groupId: createId(),
        userId: createId(),
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Permission denied");
  });

  test("without credentials provider it should throw FORBIDDEN error", async () => {
    // Arrange
    const db = createDb();
    const spy = vi.spyOn(env, "env", "get");
    spy.mockReturnValue({ AUTH_PROVIDERS: ["ldap"] } as never);
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

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
      position: 1,
    });

    // Act
    const actAsync = async () =>
      await caller.addMember({
        groupId,
        userId,
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Group members cannot be managed locally");
  });

  test("with a user from an externally managed provider it should throw FORBIDDEN error", async () => {
    // Arrange
    const db = createDb();
    const spy = vi.spyOn(env, "env", "get");
    spy.mockReturnValue({ AUTH_PROVIDERS: ["credentials", "ldap"] } as never);
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    const userId = createId();
    await db.insert(users).values([
      {
        id: userId,
        name: "User",
        provider: "ldap",
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
      position: 1,
    });

    // Act
    const actAsync = async () =>
      await caller.addMember({
        groupId,
        userId,
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("User's provider is not managed locally");
  });

  test("with user already being a member it should keep the single membership", async () => {
    // Arrange
    const db = createDb();
    const spy = vi.spyOn(env, "env", "get");
    spy.mockReturnValue({ AUTH_PROVIDERS: ["credentials"] } as never);
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    const userId = createId();
    await db.insert(users).values({ id: userId, name: "User" });
    await db.insert(groups).values({ id: groupId, name: "Group", position: 1 });
    await db.insert(groupMembers).values({ groupId, userId });

    // Act
    await caller.addMember({ groupId, userId });

    // Assert
    const members = await db.query.groupMembers.findMany({ where: eq(groupMembers.groupId, groupId) });
    expect(members).toEqual([{ groupId, userId }]);
  });
});

describe("removeMember should remove member from group", () => {
  test("with existing group and user it should remove member", async () => {
    // Arrange
    const db = createDb();
    const spy = vi.spyOn(env, "env", "get");
    spy.mockReturnValue({ AUTH_PROVIDERS: ["credentials"] } as never);
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

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
      position: 1,
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
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

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

  test("without admin permissions it should throw unauthorized error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    // Act
    const actAsync = async () =>
      await caller.removeMember({
        groupId: createId(),
        userId: createId(),
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Permission denied");
  });

  test("without credentials provider it should throw FORBIDDEN error", async () => {
    // Arrange
    const db = createDb();
    const spy = vi.spyOn(env, "env", "get");
    spy.mockReturnValue({ AUTH_PROVIDERS: ["ldap"] } as never);
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

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
      position: 1,
    });
    await db.insert(groupMembers).values({
      groupId,
      userId,
    });

    // Act
    const actAsync = async () =>
      await caller.removeMember({
        groupId,
        userId,
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Group members cannot be managed locally");
  });

  test("with a user from an externally managed provider it should throw FORBIDDEN error", async () => {
    // Arrange
    const db = createDb();
    const spy = vi.spyOn(env, "env", "get");
    spy.mockReturnValue({ AUTH_PROVIDERS: ["credentials", "ldap"] } as never);
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    const userId = createId();
    await db.insert(users).values({ id: userId, name: "User", provider: "ldap" });
    await db.insert(groups).values({ id: groupId, name: "Group", position: 1 });
    await db.insert(groupMembers).values({ groupId, userId });

    // Act
    const actAsync = async () => await caller.removeMember({ groupId, userId });

    // Assert
    await expect(actAsync()).rejects.toThrow("User's provider is not managed locally");
    const members = await db.query.groupMembers.findMany({ where: eq(groupMembers.groupId, groupId) });
    expect(members).toEqual([{ groupId, userId }]);
  });
});

describe("saveMembers should replace members of group", () => {
  test("with existing users it should replace the members and keep externally managed members", async () => {
    // Arrange
    const db = createDb();
    const spy = vi.spyOn(env, "env", "get");
    spy.mockReturnValue({ AUTH_PROVIDERS: ["credentials", "ldap"] } as never);
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(users).values([
      { id: "removed", name: "Removed" },
      { id: "kept", name: "Kept" },
      { id: "added", name: "Added" },
      { id: "external", name: "External", provider: "ldap" },
    ]);
    await db.insert(groups).values({ id: groupId, name: "Group", position: 1 });
    await db.insert(groupMembers).values([
      { groupId, userId: "removed" },
      { groupId, userId: "kept" },
      { groupId, userId: "external" },
    ]);

    // Act
    const result = await caller.saveMembers({ groupId, userIds: ["kept", "added", "external", "added"] });

    // Assert
    expect(result.userIds.toSorted()).toEqual(["added", "external", "kept"]);
    const members = await db.query.groupMembers.findMany({ where: eq(groupMembers.groupId, groupId) });
    expect(members.map((member) => member.userId).toSorted()).toEqual(["added", "external", "kept"]);
  });

  test.each([
    [[], "User's provider is not managed locally"],
    [["external", "unknown"], "User not found"],
  ])("with user ids %s it should throw %s and keep the members", async (userIds, expectedError) => {
    // Arrange
    const db = createDb();
    const spy = vi.spyOn(env, "env", "get");
    spy.mockReturnValue({ AUTH_PROVIDERS: ["credentials", "ldap"] } as never);
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(users).values({ id: "external", name: "External", provider: "ldap" });
    await db.insert(groups).values({ id: groupId, name: "Group", position: 1 });
    await db.insert(groupMembers).values({ groupId, userId: "external" });

    // Act
    const actAsync = async () => await caller.saveMembers({ groupId, userIds });

    // Assert
    await expect(actAsync()).rejects.toThrow(expectedError);
    const members = await db.query.groupMembers.findMany({ where: eq(groupMembers.groupId, groupId) });
    expect(members).toEqual([{ groupId, userId: "external" }]);
  });

  test("with a user from an externally managed provider who is no member it should throw FORBIDDEN error", async () => {
    // Arrange
    const db = createDb();
    const spy = vi.spyOn(env, "env", "get");
    spy.mockReturnValue({ AUTH_PROVIDERS: ["credentials", "ldap"] } as never);
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(users).values({ id: "external", name: "External", provider: "ldap" });
    await db.insert(groups).values({ id: groupId, name: "Group", position: 1 });

    // Act
    const actAsync = async () => await caller.saveMembers({ groupId, userIds: ["external"] });

    // Assert
    await expect(actAsync()).rejects.toThrow("User's provider is not managed locally");
  });

  test("with everyone group it should throw FORBIDDEN error", async () => {
    // Arrange
    const db = createDb();
    const spy = vi.spyOn(env, "env", "get");
    spy.mockReturnValue({ AUTH_PROVIDERS: ["credentials"] } as never);
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const groupId = createId();
    await db.insert(groups).values({ id: groupId, name: everyoneGroup, position: -1 });

    // Act
    const actAsync = async () => await caller.saveMembers({ groupId, userIds: [] });

    // Assert
    await expect(actAsync()).rejects.toThrow("Action is forbidden for reserved group names");
  });

  test("without admin permissions it should throw unauthorized error", async () => {
    // Arrange
    const db = createDb();
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    // Act
    const actAsync = async () => await caller.saveMembers({ groupId: createId(), userIds: [] });

    // Assert
    await expect(actAsync()).rejects.toThrow("Permission denied");
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
