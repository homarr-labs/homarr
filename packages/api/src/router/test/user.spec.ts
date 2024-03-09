import { describe, expect, it, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId, eq, schema } from "@homarr/db";
import { createDb } from "@homarr/db/test";

import { userRouter } from "../user";

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", async () => {
  const mod = await import("@homarr/auth/security");
  return { ...mod, auth: () => ({}) as Session };
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

    const act = async () =>
      await caller.initUser({
        username: "test",
        password: "12345678",
        confirmPassword: "12345678",
      });

    await expect(act()).rejects.toThrow("User already exists");
  });

  it("should create a user if none exists", async () => {
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      session: null,
    });

    await caller.initUser({
      username: "test",
      password: "12345678",
      confirmPassword: "12345678",
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

    const act = async () =>
      await caller.initUser({
        username: "test",
        password: "12345678",
        confirmPassword: "12345679",
      });

    await expect(act()).rejects.toThrow("Passwords do not match");
  });

  it("should not create a user if the password is too short", async () => {
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      session: null,
    });

    const act = async () =>
      await caller.initUser({
        username: "test",
        password: "1234567",
        confirmPassword: "1234567",
      });

    await expect(act()).rejects.toThrow("too_small");
  });

  test("editProfile should update users and not update emailVerified when email not dirty", async () => {
    // arrange
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      session: null,
    });

    const id = createId();
    const emailVerified = new Date(2024, 0, 5);

    await db.insert(schema.users).values({
      id,
      name: "TEST 1",
      email: "abc@gmail.com",
      emailVerified,
    });

    // act
    await caller.editProfile({
      userId: id,
      form: {
        name: "ABC",
        email: "",
      },
    });

    // assert
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));

    expect(user).toHaveLength(1);
    expect(user[0]).toStrictEqual({
      id,
      name: "ABC",
      email: "abc@gmail.com",
      emailVerified,
      salt: null,
      password: null,
      image: null,
    });
  });

  test("editProfile should update users and update emailVerified when email dirty", async () => {
    // arrange
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      session: null,
    });

    const id = createId();

    await db.insert(schema.users).values({
      id,
      name: "TEST 1",
      email: "abc@gmail.com",
      emailVerified: new Date(2024, 0, 5),
    });

    // act
    await caller.editProfile({
      userId: id,
      form: {
        name: "ABC",
        email: "myNewEmail@gmail.com",
      },
    });

    // assert
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));

    expect(user).toHaveLength(1);
    expect(user[0]).toStrictEqual({
      id,
      name: "ABC",
      email: "myNewEmail@gmail.com",
      emailVerified: null,
      salt: null,
      password: null,
      image: null,
    });
  });

  test("delete should delete user", async () => {
    const db = createDb();
    const caller = userRouter.createCaller({
      db,
      session: null,
    });

    const userToDelete = createId();

    const initialUsers = [
      {
        id: createId(),
        name: "User 1",
        email: null,
        emailVerified: null,
        image: null,
        password: null,
        salt: null,
      },
      {
        id: userToDelete,
        name: "User 2",
        email: null,
        emailVerified: null,
        image: null,
        password: null,
        salt: null,
      },
      {
        id: createId(),
        name: "User 3",
        email: null,
        emailVerified: null,
        image: null,
        password: null,
        salt: null,
      },
    ];

    await db.insert(schema.users).values(initialUsers);

    await caller.delete(userToDelete);

    const usersInDb = await db.select().from(schema.users);
    expect(usersInDb).toStrictEqual([initialUsers[0], initialUsers[2]]);
  });
});
