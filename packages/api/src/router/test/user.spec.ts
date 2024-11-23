import { describe, expect, it, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId, eq, schema } from "@homarr/db";
import { users } from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";
import type { GroupPermissionKey } from "@homarr/definitions";

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
vi.mock("@homarr/auth/env.mjs", () => {
  return {
    env: {
      AUTH_PROVIDERS: ["credentials"],
    },
  };
});

describe("initUser should initialize the first user", () => {
  it("should throw an error if a user already exists", async () => {
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      session: null,
    });

    await db.insert(schema.users).values({
      id: "test",
      name: "test",
      password: "test",
    });

    const actAsync = async () =>
      await caller.initUser({
        username: "test",
        password: "123ABCdef+/-",
        confirmPassword: "123ABCdef+/-",
      });

    await expect(actAsync()).rejects.toThrow("User already exists");
  });

  it("should create a user if none exists", async () => {
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      session: null,
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
    const caller = userRouter.createCaller({
      db,
      session: null,
    });

    const actAsync = async () =>
      await caller.initUser({
        username: "test",
        password: "123ABCdef+/-",
        confirmPassword: "456ABCdef+/-",
      });

    await expect(actAsync()).rejects.toThrow("passwordsDoNotMatch");
  });

  it.each([
    ["aB2%"], // too short
    ["abc123DEF"], // does not contain special characters
    ["abcDEFghi+"], // does not contain numbers
    ["ABC123+/-"], // does not contain lowercase
    ["abc123+/-"], // does not contain uppercase
  ])("should throw error that password requirements do not match for '%s' as password", async (password) => {
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      session: null,
    });

    const actAsync = async () =>
      await caller.initUser({
        username: "test",
        password,
        confirmPassword: password,
      });

    await expect(actAsync()).rejects.toThrow("passwordRequirements");
  });
});

describe("register should create a user with valid invitation", () => {
  test("register should create a user with valid invitation", async () => {
    // Arrange
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
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
    await db.insert(schema.invites).values({
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
      await db.insert(schema.invites).values({
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

describe("editProfile shoud update user", () => {
  test("editProfile should update users and not update emailVerified when email not dirty", async () => {
    // arrange
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      session: defaultSession,
    });

    const emailVerified = new Date(2024, 0, 5);

    await db.insert(schema.users).values({
      id: defaultOwnerId,
      name: "TEST 1",
      email: "abc@gmail.com",
      emailVerified,
    });

    // act
    await caller.editProfile({
      id: defaultOwnerId,
      name: "ABC",
      email: "",
    });

    // assert
    const user = await db.select().from(schema.users).where(eq(schema.users.id, defaultOwnerId));

    expect(user).toHaveLength(1);
    expect(user[0]).containSubset({
      id: defaultOwnerId,
      name: "ABC",
      email: "abc@gmail.com",
      emailVerified,
    });
  });

  test("editProfile should update users and update emailVerified when email dirty", async () => {
    // arrange
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      session: defaultSession,
    });

    await db.insert(schema.users).values({
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
    const user = await db.select().from(schema.users).where(eq(schema.users.id, defaultOwnerId));

    expect(user).toHaveLength(1);
    expect(user[0]).containSubset({
      id: defaultOwnerId,
      name: "ABC",
      email: "myNewEmail@gmail.com",
      emailVerified: null,
    });
  });
});

describe("delete should delete user", () => {
  test("delete should delete user", async () => {
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
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

    await db.insert(schema.users).values(initialUsers);

    await caller.delete({ userId: defaultOwnerId });

    const usersInDb = await db.select().from(schema.users);
    expect(usersInDb).toHaveLength(2);
    expect(usersInDb[0]).containSubset(initialUsers[0]);
    expect(usersInDb[1]).containSubset(initialUsers[2]);
  });
});
