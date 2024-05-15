import type { Adapter } from "@auth/core/adapters";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { describe, expect, test, vi } from "vitest";

import { createId, eq } from "@homarr/db";
import { users } from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";

import { createSalt, hashPassword } from "../../security";
import { authorizeWithLdapCredentials } from "../credentials/authorization/ldap-authorization";
import * as ldapClient from "../credentials/ldap-client";

vi.mock("../../env.mjs", () => ({
  env: {
    AUTH_LDAP_BIND_DN: "bind_dn",
    AUTH_LDAP_BIND_PASSWORD: "bind_password",
    AUTH_LDAP_USER_MAIL_ATTRIBUTE: "mail",
  },
}));

describe("authorizeWithLdapCredentials", () => {
  test("should fail when wrong ldap base credentials", async () => {
    const spy = vi.spyOn(ldapClient, "LdapClient");
    spy.mockImplementation(
      () =>
        ({
          bindAsync: vi.fn(() => Promise.reject(new Error("bindAsync"))),
        }) as unknown as ldapClient.LdapClient,
    );

    const act = () =>
      authorizeWithLdapCredentials(null as unknown as Adapter, {
        name: "test",
        password: "test",
        credentialType: "ldap",
      });

    await expect(act()).rejects.toThrow("bindAsync");
  });

  test("should fail when user not found", async () => {
    const spy = vi.spyOn(ldapClient, "LdapClient");
    spy.mockImplementation(
      () =>
        ({
          bindAsync: vi.fn(),
          searchAsync: vi.fn(() => Promise.resolve([])),
        }) as unknown as ldapClient.LdapClient,
    );

    const act = () =>
      authorizeWithLdapCredentials(null as unknown as Adapter, {
        name: "test",
        password: "test",
        credentialType: "ldap",
      });

    await expect(act()).rejects.toThrow("User test not found in LDAP");
  });

  test("should fail when user has invalid email", async () => {
    const spy = vi.spyOn(ldapClient, "LdapClient");
    spy.mockImplementation(
      () =>
        ({
          bindAsync: vi.fn(),
          searchAsync: vi.fn(() =>
            Promise.resolve([
              {
                dn: "test",
                mail: "test",
              },
            ]),
          ),
        }) as unknown as ldapClient.LdapClient,
    );

    const act = () =>
      authorizeWithLdapCredentials(null as unknown as Adapter, {
        name: "test",
        password: "test",
        credentialType: "ldap",
      });

    await expect(act()).rejects.toThrow(
      'User found but with invalid or non-existing Email. Not Supported: "test"',
    );
  });

  test("should fail when user password is incorrect", async () => {
    const searchSpy = vi.fn(() =>
      Promise.resolve([
        {
          dn: "test",
          mail: "test@gmail.com",
        },
      ]),
    );
    const spy = vi.spyOn(ldapClient, "LdapClient");
    spy.mockImplementation(
      () =>
        ({
          bindAsync: vi.fn((props: ldapClient.BindOptions) =>
            props.distinguishedName === "test"
              ? Promise.reject(new Error("bindAsync"))
              : Promise.resolve(),
          ),
          searchAsync: searchSpy,
        }) as unknown as ldapClient.LdapClient,
    );

    const act = () =>
      authorizeWithLdapCredentials(null as unknown as Adapter, {
        name: "test",
        password: "test",
        credentialType: "ldap",
      });

    await expect(act()).rejects.toThrow("bindAsync");
    expect(searchSpy).toHaveBeenCalledTimes(1);
  });

  test("should authorize user with correct credentials and create user", async () => {
    const db = createDb();
    const adapter = DrizzleAdapter(db);
    const spy = vi.spyOn(ldapClient, "LdapClient");
    spy.mockImplementation(
      () =>
        ({
          bindAsync: vi.fn(() => Promise.resolve()),
          searchAsync: vi.fn(() =>
            Promise.resolve([
              {
                dn: "test",
                mail: "test@gmail.com",
              },
            ]),
          ),
          disconnect: vi.fn(),
        }) as unknown as ldapClient.LdapClient,
    );

    const result = await authorizeWithLdapCredentials(adapter, {
      name: "test",
      password: "test",
      credentialType: "ldap",
    });

    expect(result.name).toBe("test");
    const dbUser = await db.query.users.findFirst({
      where: eq(users.name, "test"),
    });
    expect(dbUser).toBeDefined();
    expect(dbUser?.id).toBe(result.id);
    expect(dbUser?.email).toBe("test@gmail.com");
    expect(dbUser?.emailVerified).not.toBeNull();
  });

  test("should authorize user with correct credentials", async () => {
    const userId = createId();
    const db = createDb();
    const adapter = DrizzleAdapter(db);
    const salt = await createSalt();
    await db.insert(users).values({
      id: userId,
      name: "test-old",
      salt,
      password: await hashPassword("test", salt),
      email: "test@gmail.com",
    });

    const result = await authorizeWithLdapCredentials(adapter, {
      name: "test",
      password: "test",
      credentialType: "ldap",
    });

    expect(result).toEqual({ id: userId, name: "test" });

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    expect(dbUser).toBeDefined();
    expect(dbUser?.id).toBe(userId);
    expect(dbUser?.name).toBe("test");
    expect(dbUser?.email).toBe("test@gmail.com");
  });
});
