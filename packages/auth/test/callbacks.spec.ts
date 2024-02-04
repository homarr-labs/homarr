import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookies } from "next/headers";
import type { Adapter, AdapterUser } from "@auth/core/adapters";
import type { Account, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { describe, expect, it, vi } from "vitest";

import { createSignInCallback, sessionCallback } from "../callbacks";

describe("session callback", () => {
  it("should add id and name to session user", async () => {
    const session: Session = {
      user: {
        id: "whatever",
      },
      expires: "2023-05-01",
    };
    const user: AdapterUser = {
      id: "id",
      name: "name",
      email: "email",
      emailVerified: new Date("2023-01-13"),
    };
    const token: JWT = {};
    const result = await sessionCallback({
      session,
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
const mockSessionToken = "e9ef3010-6981-4a81-b9d6-8495d09cf3b5" as const;
const mockSessionExpiry = new Date("2023-07-01");
vi.mock("../session", async (importOriginal) => {
  const mod = await importOriginal<SessionExport>();

  const generateSessionToken = () => mockSessionToken;
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
