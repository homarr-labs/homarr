/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { cookies } from "next/headers";
import type { Adapter, AdapterUser } from "@auth/core/adapters";
import type { Account } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { describe, expect, test, vi } from "vitest";

import { groupMembers, groupPermissions, groups, users } from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";
import * as definitions from "@homarr/definitions";

import { createSessionCallback, createSignInCallback, getCurrentUserPermissionsAsync } from "../callbacks";

// This one is placed here because it's used in multiple tests and needs to be the same reference
const setCookies = vi.fn();
vi.mock("next/headers", () => ({
  cookies: () => ({
    set: setCookies,
  }),
}));

describe("getCurrentUserPermissions", () => {
  test("should return empty permissions when non existing user requested", async () => {
    // Arrange
    const db = createDb();

    await db.insert(groups).values({
      id: "2",
      name: "test",
    });
    await db.insert(groupPermissions).values({
      groupId: "2",
      permission: "admin",
    });
    await db.insert(users).values({
      id: "2",
    });

    const userId = "1";

    // Act
    const result = await getCurrentUserPermissionsAsync(db, userId);

    // Assert
    expect(result).toEqual([]);
  });

  test("should return empty permissions when user has no groups", async () => {
    // Arrange
    const db = createDb();
    const userId = "1";

    await db.insert(groups).values({
      id: "2",
      name: "test",
    });
    await db.insert(groupPermissions).values({
      groupId: "2",
      permission: "admin",
    });
    await db.insert(users).values({
      id: userId,
    });

    // Act
    const result = await getCurrentUserPermissionsAsync(db, userId);

    // Assert
    expect(result).toEqual([]);
  });

  test("should return permissions for user", async () => {
    // Arrange
    const db = createDb();
    const getPermissionsWithChildrenMock = vi
      .spyOn(definitions, "getPermissionsWithChildren")
      .mockReturnValue(["board-create"]);
    const mockId = "1";

    await db.insert(users).values({
      id: mockId,
    });
    await db.insert(groups).values({
      id: mockId,
      name: "test",
    });
    await db.insert(groupMembers).values({
      userId: mockId,
      groupId: mockId,
    });
    await db.insert(groupPermissions).values({
      groupId: mockId,
      permission: "admin",
    });

    // Act
    const result = await getCurrentUserPermissionsAsync(db, mockId);

    // Assert
    expect(result).toEqual(["board-create"]);
    expect(getPermissionsWithChildrenMock).toHaveBeenCalledWith(["admin"]);
  });
});

describe("session callback", () => {
  test("should add id and name to session user", async () => {
    // Arrange
    const user: AdapterUser = {
      id: "id",
      name: "name",
      email: "email",
      emailVerified: new Date("2023-01-13"),
    };
    const token: JWT = {};
    const db = createDb();
    const callback = createSessionCallback(db);

    // Act
    const result = await callback({
      session: {
        user: {
          id: "no-id",
          email: "no-email",
          emailVerified: new Date("2023-01-13"),
          permissions: [],
          colorScheme: "dark",
        },
        expires: "2023-01-13" as Date & string,
        sessionToken: "token",
        userId: "no-id",
      },
      user,
      token,
      trigger: "update",
      newSession: {},
    });

    // Assert
    expect(result.user).toBeDefined();
    expect(result.user!.id).toEqual(user.id);
    expect(result.user!.name).toEqual(user.name);
  });
});

type AdapterSessionInput = Parameters<Exclude<Adapter["createSession"], undefined>>[0];

const createAdapter = () => {
  const result = {
    createSession: (input: AdapterSessionInput) => input,
  };

  vi.spyOn(result, "createSession");
  return result;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type SessionExport = typeof import("../session");
const mockSessionToken = "e9ef3010-6981-4a81-b9d6-8495d09cf3b5";
const mockSessionExpiry = new Date("2023-07-01");
vi.mock("../env.mjs", () => {
  return {
    env: {
      AUTH_SESSION_EXPIRY_TIME: 60 * 60 * 24 * 7,
    },
  };
});
vi.mock("../session", async (importOriginal) => {
  const mod = await importOriginal<SessionExport>();

  const generateSessionToken = (): typeof mockSessionToken => mockSessionToken;
  const expireDateAfter = (_seconds: number) => mockSessionExpiry;

  return {
    ...mod,
    generateSessionToken,
    expireDateAfter,
  } satisfies SessionExport;
});

describe("createSignInCallback", () => {
  test("should return true if not credentials request and set colorScheme & sessionToken cookie", async () => {
    // Arrange
    const isCredentialsRequest = false;
    const db = await prepareDbForSigninAsync("1");
    const signInCallback = createSignInCallback(createAdapter(), db, isCredentialsRequest);

    // Act
    const result = await signInCallback({
      user: { id: "1", emailVerified: new Date("2023-01-13") },
      account: {} as Account,
    });

    // Assert
    expect(result).toBe(true);
  });

  test("should return false if no adapter.createSession", async () => {
    // Arrange
    const isCredentialsRequest = true;
    const db = await prepareDbForSigninAsync("1");
    const signInCallback = createSignInCallback(
      // https://github.com/nextauthjs/next-auth/issues/6106
      { createSession: undefined } as unknown as Adapter,
      db,
      isCredentialsRequest,
    );

    // Act
    const result = await signInCallback({
      user: { id: "1", emailVerified: new Date("2023-01-13") },
      account: {} as Account,
    });

    // Assert
    expect(result).toBe(false);
  });

  test("should call adapter.createSession with correct input", async () => {
    // Arrange
    const adapter = createAdapter();
    const isCredentialsRequest = true;
    const db = await prepareDbForSigninAsync("1");
    const signInCallback = createSignInCallback(adapter, db, isCredentialsRequest);
    const user = { id: "1", emailVerified: new Date("2023-01-13") };
    const account = {} as Account;
    // Act
    await signInCallback({ user, account });

    // Assert
    expect(adapter.createSession).toHaveBeenCalledWith({
      sessionToken: mockSessionToken,
      userId: user.id,
      expires: mockSessionExpiry,
    });
    expect(cookies().set).toHaveBeenCalledWith("next-auth.session-token", mockSessionToken, {
      path: "/",
      expires: mockSessionExpiry,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
  });

  test("should set colorScheme from db as cookie", async () => {
    // Arrange
    const isCredentialsRequest = true;
    const db = await prepareDbForSigninAsync("1");
    const signInCallback = createSignInCallback(createAdapter(), db, isCredentialsRequest);

    // Act
    const result = await signInCallback({
      user: { id: "1", emailVerified: new Date("2023-01-13") },
      account: {} as Account,
    });

    // Assert
    expect(result).toBe(true);
    expect(cookies().set).toHaveBeenCalledWith(
      "homarr-color-scheme",
      "dark",
      expect.objectContaining({
        path: "/",
      }),
    );
  });

  test("should return false if user not found in db", async () => {
    // Arrange
    const isCredentialsRequest = true;
    const db = await prepareDbForSigninAsync("other-id");
    const signInCallback = createSignInCallback(createAdapter(), db, isCredentialsRequest);

    // Act
    const result = await signInCallback({
      user: { id: "1", emailVerified: new Date("2023-01-13") },
      account: {} as Account,
    });

    // Assert
    expect(result).toBe(false);
  });
});

const prepareDbForSigninAsync = async (userId: string) => {
  const db = createDb();
  await db.insert(users).values({
    id: userId,
    colorScheme: "dark",
  });
  return db;
};
