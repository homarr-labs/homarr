import { describe, expect, it, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { schema } from "@homarr/db";

import { userRouter } from "../user";
import { createDb } from "./_db";

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", async () => {
  const mod = await import("@homarr/auth/security");
  // eslint-disable-next-line @typescript-eslint/require-await
  return { ...mod, auth: async () => ({}) as Session };
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
});
