import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookies } from "next/headers";
import type { Adapter, AdapterUser } from "@auth/core/adapters";
import type { Account, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { describe, expect, it, test, vi } from "vitest";

import {
  groupMembers,
  groupPermissions,
  groups,
  users,
} from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";
import * as definitions from "@homarr/definitions";

import {
  createSessionCallback,
  createSignInCallback,
  getCurrentUserPermissionsAsync,
} from "../callbacks";

describe("getCurrentUserPermissions", () => {
  test("should return empty permissions when non existing user requested", async () => {
    const db = createDb();

    await db.insert(users).values({
      id: "2",
    });

    const userId = "1";
    const result = await getCurrentUserPermissionsAsync(db, userId);
    expect(result).toEqual([]);
  });
  test("should return permissions for user", async () => {
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

    const result = await getCurrentUserPermissionsAsync(db, mockId);
    expect(result).toEqual(["board-create"]);
    expect(getPermissionsWithChildrenMock).toHaveBeenCalledWith(["admin"]);
  });
});

describe("session callback", () => {
  it("should add id and name to session user", async () => {
    const user: AdapterUser = {
      id: "id",
      name: "name",
      email: "email",
      emailVerified: new Date("2023-01-13"),
    };
    const token: JWT = {};
    const db = createDb();
    const callback = createSessionCallback(db);
    const result = await callback({
      session: {
        user: {
          id: "no-id",
          email: "no-email",
          emailVerified: new Date("2023-01-13"),
          permissions: [],
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
    expect(result.user).toBeDefined();
    expect(result.user!.id).toEqual(user.id);
    expect(result.user!.name).toEqual(user.name);
  });
});

type AdapterSessionInput = Parameters<
  Exclude<Adapter["createSession"], undefined>
>[0];

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
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type HeadersExport = typeof import("next/headers");
vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<HeadersExport>();

  const result = {
    set: (name: string, value: string, options: Partial<ResponseCookie>) =>
      options as ResponseCookie,
  } as unknown as ReadonlyRequestCookies;

  vi.spyOn(result, "set");

  const cookies = () => result;

  return { ...mod, cookies } satisfies HeadersExport;
});

describe("createSignInCallback", () => {
  it("should return true if not credentials request", async () => {
    const isCredentialsRequest = false;
    const signInCallback = createSignInCallback(
      createAdapter(),
      isCredentialsRequest,
    );
    const result = await signInCallback({
      user: { id: "1", emailVerified: new Date("2023-01-13") },
      account: {} as Account,
    });
    expect(result).toBe(true);
  });

  it("should return true if no user", async () => {
    const isCredentialsRequest = true;
    const signInCallback = createSignInCallback(
      createAdapter(),
      isCredentialsRequest,
    );
    const result = await signInCallback({
      user: undefined as unknown as User,
      account: {} as Account,
    });
    expect(result).toBe(true);
  });

  it("should return false if no adapter.createSession", async () => {
    const isCredentialsRequest = true;
    const signInCallback = createSignInCallback(
      // https://github.com/nextauthjs/next-auth/issues/6106
      undefined as unknown as Adapter,
      isCredentialsRequest,
    );
    const result = await signInCallback({
      user: { id: "1", emailVerified: new Date("2023-01-13") },
      account: {} as Account,
    });
    expect(result).toBe(false);
  });

  it("should call adapter.createSession with correct input", async () => {
    const adapter = createAdapter();
    const isCredentialsRequest = true;
    const signInCallback = createSignInCallback(adapter, isCredentialsRequest);
    const user = { id: "1", emailVerified: new Date("2023-01-13") };
    const account = {} as Account;
    await signInCallback({ user, account });
    expect(adapter.createSession).toHaveBeenCalledWith({
      sessionToken: mockSessionToken,
      userId: user.id,
      expires: mockSessionExpiry,
    });
    expect(cookies().set).toHaveBeenCalledWith(
      "next-auth.session-token",
      mockSessionToken,
      {
        path: "/",
        expires: mockSessionExpiry,
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      },
    );
  });
});
