import { describe, expect, it, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import * as env from "@homarr/auth/env";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import { groupMembers, groups, invites, onboarding, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { GroupPermissionKey, OnboardingStep } from "@homarr/definitions";
import { everyoneGroup } from "@homarr/definitions";

import { claimOnboardingAsync } from "../../onboarding-claim";
import { userRouter } from "../user";

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

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", async () => {
  const mod = await import("@homarr/auth/security");
  return { ...mod, auth: () => ({}) as Session };
});

// Mock the env module to return the credentials provider
vi.mock("@homarr/auth/env", () => {
  return {
    env: {
      AUTH_PROVIDERS: ["credentials"],
    },
  };
});

describe("initUser should initialize the first user", () => {
  it("should create a user if none exists", async () => {
    const db = createDb();
    const onboardingClaimToken = await createOnboardingStepAsync(db, "user");
    const caller = userRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
      onboardingClaimToken,
    });

    await caller.initUser({
      username: "test",
      password: "123ABCdef+/-",
      confirmPassword: "123ABCdef+/-",
    });

    const user = await db.query.users.findFirst({
      columns: {
        id: true,
      },
    });

    expect(user).toBeDefined();
  });

  it("should not create a user if the password and confirmPassword do not match", async () => {
    const db = createDb();
    const onboardingClaimToken = await createOnboardingStepAsync(db, "user");
    const caller = userRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
      onboardingClaimToken,
    });

    const actAsync = async () =>
      await caller.initUser({
        username: "test",
        password: "123ABCdef+/-",
        confirmPassword: "456ABCdef+/-",
      });

    await expect(actAsync()).rejects.toThrow("passwordsDoNotMatch");
  });

  it.each([["aB2%"], ["short"]])("should reject passwords shorter than 8 characters for '%s'", async (password) => {
    const db = createDb();
    const onboardingClaimToken = await createOnboardingStepAsync(db, "user");
    const caller = userRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
      onboardingClaimToken,
    });

    const actAsync = async () =>
      await caller.initUser({
        username: "test",
        password,
        confirmPassword: password,
      });

    await expect(actAsync()).rejects.toThrow();
  });

  it("should accept passwords without complexity requirements", async () => {
    const db = createDb();
    const onboardingClaimToken = await createOnboardingStepAsync(db, "user");
    const caller = userRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
      onboardingClaimToken,
    });

    await caller.initUser({
      username: "test",
      password: "abc123DEF",
      confirmPassword: "abc123DEF",
    });

    const user = await db.query.users.findFirst({
      columns: {
        id: true,
      },
    });

    expect(user).toBeDefined();
  });

  it("should accept passwords with special characters like LoveHomarr<3", async () => {
    const db = createDb();
    const onboardingClaimToken = await createOnboardingStepAsync(db, "user");
    const caller = userRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
      onboardingClaimToken,
    });

    await caller.initUser({
      username: "test",
      password: "LoveHomarr<3",
      confirmPassword: "LoveHomarr<3",
    });

    const user = await db.query.users.findFirst({
      columns: {
        id: true,
      },
    });

    expect(user).toBeDefined();
  });
});

describe("register should create a user with valid invitation", () => {
  test("register should create a user with valid invitation", async () => {
    // Arrange
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
    });

    const userId = createId();
    const inviteId = createId();
    const inviteToken = "123";
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 3));

    await db.insert(users).values({
      id: userId,
    });
    await db.insert(invites).values({
      id: inviteId,
      token: inviteToken,
      creatorId: userId,
      expirationDate: new Date(2024, 0, 5),
    });

    // Act
    await caller.register({
      inviteId,
      token: inviteToken,
      username: "test",
      password: "123ABCdef+/-",
      confirmPassword: "123ABCdef+/-",
    });

    // Assert
    const user = await db.query.users.findMany({
      columns: {
        name: true,
      },
    });
    const invite = await db.query.invites.findMany({
      columns: {
        id: true,
      },
    });

    expect(user).toHaveLength(2);
    expect(invite).toHaveLength(0);
  });

  test.each([
    [{ token: "fakeToken" }, new Date(2024, 0, 3)],
    [{ inviteId: "fakeInviteId" }, new Date(2024, 0, 3)],
    [{}, new Date(2024, 0, 5, 0, 0, 1)],
  ])(
    "register should throw an error with input %s and date %s if the invitation is invalid",
    async (partialInput, systemTime) => {
      // Arrange
      const db = createDb();
      const caller = userRouter.createCaller({
        db,
        deviceType: undefined,
        session: null,
      });

      const userId = createId();
      const inviteId = createId();
      const inviteToken = "123";
      vi.useFakeTimers();
      vi.setSystemTime(systemTime);

      await db.insert(users).values({
        id: userId,
      });
      await db.insert(invites).values({
        id: inviteId,
        token: inviteToken,
        creatorId: userId,
        expirationDate: new Date(2024, 0, 5),
      });

      // Act
      const actAsync = async () =>
        await caller.register({
          inviteId,
          token: inviteToken,
          username: "test",
          password: "123ABCdef+/-",
          confirmPassword: "123ABCdef+/-",
          ...partialInput,
        });

      // Assert
      await expect(actAsync()).rejects.toThrow("Invalid invite");
    },
  );
});

describe("create should create a user with groups", () => {
  test("create should return the user id and add the user to each group once", async () => {
    // Arrange
    const db = createDb();
    const caller = userRouter.createCaller({ db, deviceType: undefined, session: createSession(["admin"]) });
    const groupId = createId();
    await db.insert(groups).values({ id: groupId, name: "Group", position: 1 });

    // Act
    const result = await caller.create({
      username: "test",
      password: "123ABCdef+/-",
      confirmPassword: "123ABCdef+/-",
      groupIds: [groupId, groupId],
    });

    // Assert
    const members = await db.query.groupMembers.findMany();
    expect(members).toEqual([{ groupId, userId: result.id }]);
  });

  test("create with a non existing group should throw not found error and not create the user", async () => {
    // Arrange
    const db = createDb();
    const caller = userRouter.createCaller({ db, deviceType: undefined, session: createSession(["admin"]) });

    // Act
    const actAsync = async () =>
      await caller.create({
        username: "test",
        password: "123ABCdef+/-",
        confirmPassword: "123ABCdef+/-",
        groupIds: [createId()],
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("Group not found");
    const usersInDb = await db.query.users.findMany();
    expect(usersInDb).toHaveLength(0);
  });
});

describe("setGroups should replace the groups of a user", () => {
  test("setGroups should replace the groups, keep the everyone membership and return the resulting groups", async () => {
    // Arrange
    const db = createDb();
    const caller = userRouter.createCaller({ db, deviceType: undefined, session: createSession(["admin"]) });
    const userId = createId();
    const everyoneGroupId = createId();
    const removedGroupId = createId();
    const keptGroupId = createId();
    const addedGroupId = createId();
    await db.insert(users).values({ id: userId, name: "user" });
    await db.insert(groups).values([
      { id: everyoneGroupId, name: everyoneGroup, position: -1 },
      { id: removedGroupId, name: "Removed", position: 1 },
      { id: keptGroupId, name: "Kept", position: 2 },
      { id: addedGroupId, name: "Added", position: 3 },
    ]);
    await db.insert(groupMembers).values([
      { groupId: everyoneGroupId, userId },
      { groupId: removedGroupId, userId },
      { groupId: keptGroupId, userId },
    ]);

    // Act
    const result = await caller.setGroups({ userId, groupIds: [keptGroupId, addedGroupId] });

    // Assert
    const expectedGroupIds = [everyoneGroupId, keptGroupId, addedGroupId].toSorted();
    expect(result.groupIds.toSorted()).toEqual(expectedGroupIds);
    const user = await caller.getById({ userId });
    expect(user.groupIds.toSorted()).toEqual(expectedGroupIds);
  });

  test("setGroups without admin permissions should throw permission denied error", async () => {
    // Arrange
    const db = createDb();
    const caller = userRouter.createCaller({ db, deviceType: undefined, session: defaultSession });
    await db.insert(users).values({ id: defaultOwnerId, name: "user" });

    // Act
    const actAsync = async () => await caller.setGroups({ userId: defaultOwnerId, groupIds: [] });

    // Assert
    await expect(actAsync()).rejects.toThrow("Permission denied");
  });

  test("setGroups with a user from an externally managed provider should throw forbidden error", async () => {
    // Arrange
    const db = createDb();
    const caller = userRouter.createCaller({ db, deviceType: undefined, session: createSession(["admin"]) });
    const userId = createId();
    await db.insert(users).values({ id: userId, name: "user", provider: "ldap" });

    // Act
    const actAsync = async () => await caller.setGroups({ userId, groupIds: [] });

    // Assert
    await expect(actAsync()).rejects.toThrow("User's provider is not managed locally");
  });

  test("setGroups should not add the user to the everyone group when its id is supplied", async () => {
    // Arrange
    const db = createDb();
    const caller = userRouter.createCaller({ db, deviceType: undefined, session: createSession(["admin"]) });
    const userId = createId();
    const everyoneGroupId = createId();
    const groupId = createId();
    await db.insert(users).values({ id: userId, name: "user" });
    await db.insert(groups).values([
      { id: everyoneGroupId, name: everyoneGroup, position: -1 },
      { id: groupId, name: "Group", position: 1 },
    ]);

    // Act
    const result = await caller.setGroups({ userId, groupIds: [everyoneGroupId, groupId] });

    // Assert
    expect(result.groupIds).toEqual([groupId]);
  });

  test("setGroups with a non existing group should throw not found error and keep the groups", async () => {
    // Arrange
    const db = createDb();
    const caller = userRouter.createCaller({ db, deviceType: undefined, session: createSession(["admin"]) });
    const userId = createId();
    const existingGroupId = createId();
    await db.insert(users).values({ id: userId, name: "user" });
    await db.insert(groups).values({ id: existingGroupId, name: "Existing", position: 1 });
    await db.insert(groupMembers).values({ groupId: existingGroupId, userId });

    // Act
    const actAsync = async () => await caller.setGroups({ userId, groupIds: [createId()] });

    // Assert
    await expect(actAsync()).rejects.toThrow("Group not found");
    const members = await db.query.groupMembers.findMany();
    expect(members).toEqual([{ groupId: existingGroupId, userId }]);
  });

  test("setGroups without a locally managed provider enabled should throw forbidden error", async () => {
    // Arrange
    const db = createDb();
    const spy = vi.spyOn(env, "env", "get");
    spy.mockReturnValue({ AUTH_PROVIDERS: ["ldap"] } as never);
    const caller = userRouter.createCaller({ db, deviceType: undefined, session: createSession(["admin"]) });
    const userId = createId();
    await db.insert(users).values({ id: userId, name: "user" });

    // Act
    const actAsync = async () => await caller.setGroups({ userId, groupIds: [] });

    // Assert
    await expect(actAsync()).rejects.toThrow("Group members cannot be managed locally");
    spy.mockRestore();
  });
});

describe("editProfile shoud update user", () => {
  test("editProfile should update users and not update emailVerified when email not dirty", async () => {
    // arrange
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      deviceType: undefined,
      session: defaultSession,
    });

    const emailVerified = new Date(2024, 0, 5);

    await db.insert(users).values({
      id: defaultOwnerId,
      name: "TEST 1",
      email: "abc@gmail.com",
      emailVerified,
    });

    // act
    await caller.editProfile({
      id: defaultOwnerId,
      name: "ABC",
    });

    // assert
    const user = await db.select().from(users).where(eq(users.id, defaultOwnerId));

    expect(user).toHaveLength(1);
    expect(user[0]).containSubset({
      id: defaultOwnerId,
      name: "abc",
      email: "abc@gmail.com",
      emailVerified,
    });
  });

  test("editProfile should update users and update emailVerified when email dirty", async () => {
    // arrange
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      deviceType: undefined,
      session: defaultSession,
    });

    await db.insert(users).values({
      id: defaultOwnerId,
      name: "TEST 1",
      email: "abc@gmail.com",
      emailVerified: new Date(2024, 0, 5),
    });

    // act
    await caller.editProfile({
      id: defaultOwnerId,
      name: "ABC",
      email: "myNewEmail@gmail.com",
    });

    // assert
    const user = await db.select().from(users).where(eq(users.id, defaultOwnerId));

    expect(user).toHaveLength(1);
    expect(user[0]).containSubset({
      id: defaultOwnerId,
      name: "abc",
      email: "myNewEmail@gmail.com",
      emailVerified: null,
    });
  });

  test.each([[null], [""]])("editProfile should remove email and emailVerified when email is %j", async (email) => {
    // arrange
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      deviceType: undefined,
      session: defaultSession,
    });

    await db.insert(users).values({
      id: defaultOwnerId,
      name: "TEST 1",
      email: "abc@gmail.com",
      emailVerified: new Date(2024, 0, 5),
    });

    // act
    await caller.editProfile({
      id: defaultOwnerId,
      name: "ABC",
      email,
    });

    // assert
    const user = await db.select().from(users).where(eq(users.id, defaultOwnerId));

    expect(user).toHaveLength(1);
    expect(user[0]).containSubset({
      id: defaultOwnerId,
      name: "abc",
      email: null,
      emailVerified: null,
    });
  });
});

describe("delete should delete user", () => {
  test("delete should delete user", async () => {
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      deviceType: undefined,
      session: defaultSession,
    });

    const initialUsers = [
      {
        id: createId(),
        name: "User 1",
      },
      {
        id: defaultOwnerId,
        name: "User 2",
      },
      {
        id: createId(),
        name: "User 3",
      },
    ];

    await db.insert(users).values(initialUsers);

    await caller.delete({ userId: defaultOwnerId });

    const usersInDb = await db.select().from(users);
    expect(usersInDb).toHaveLength(2);
    expect(usersInDb[0]).containSubset(initialUsers[0]);
    expect(usersInDb[1]).containSubset(initialUsers[2]);
  });
});

describe("changeEnableRightClickOnWidgets should toggle the right-click preference", () => {
  test("non-admin can toggle their own preference", async () => {
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      deviceType: undefined,
      session: defaultSession,
    });

    await db.insert(users).values({
      id: defaultOwnerId,
      name: "owner",
    });

    await caller.changeEnableRightClickOnWidgets({ id: defaultOwnerId, enableRightClickOnWidgets: false });

    const updated = await db.query.users.findFirst({
      where: eq(users.id, defaultOwnerId),
      columns: { enableRightClickOnWidgets: true },
    });
    expect(updated?.enableRightClickOnWidgets).toBe(false);

    await caller.changeEnableRightClickOnWidgets({ id: defaultOwnerId, enableRightClickOnWidgets: true });

    const restored = await db.query.users.findFirst({
      where: eq(users.id, defaultOwnerId),
      columns: { enableRightClickOnWidgets: true },
    });
    expect(restored?.enableRightClickOnWidgets).toBe(true);
  });

  test("non-admin cannot toggle another user's preference", async () => {
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      deviceType: undefined,
      session: defaultSession,
    });

    const otherUserId = createId();
    await db.insert(users).values({ id: defaultOwnerId });
    await db.insert(users).values({ id: otherUserId, name: "other" });

    await expect(
      caller.changeEnableRightClickOnWidgets({ id: otherUserId, enableRightClickOnWidgets: false }),
    ).rejects.toThrow("User not found");

    const other = await db.query.users.findFirst({
      where: eq(users.id, otherUserId),
      columns: { enableRightClickOnWidgets: true },
    });
    expect(other?.enableRightClickOnWidgets).toBe(true);
  });

  test("admin can toggle another user's preference", async () => {
    const db = createDb();
    const adminSession = createSession(["admin"]);
    const caller = userRouter.createCaller({
      db,
      deviceType: undefined,
      session: adminSession,
    });

    const targetUserId = createId();
    await db.insert(users).values({ id: defaultOwnerId });
    await db.insert(users).values({ id: targetUserId, name: "target" });

    await caller.changeEnableRightClickOnWidgets({ id: targetUserId, enableRightClickOnWidgets: false });

    const target = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      columns: { enableRightClickOnWidgets: true },
    });
    expect(target?.enableRightClickOnWidgets).toBe(false);
  });
});

const createOnboardingStepAsync = async (db: Database, step: OnboardingStep) => {
  await db.insert(onboarding).values({
    id: createId(),
    step,
  });
  const claim = await claimOnboardingAsync(db);
  if (claim.status !== "issued") throw new Error("Expected an onboarding claim");
  return claim.token;
};
