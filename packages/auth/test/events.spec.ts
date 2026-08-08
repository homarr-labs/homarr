import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookies } from "next/headers";
import { describe, expect, test, vi } from "vitest";

import { eq } from "@homarr/db";
import type { Database } from "@homarr/db";
import { groupMembers, groups, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import { colorSchemeCookieKey, everyoneGroup } from "@homarr/definitions";

import { createSignInEventHandler } from "../events";

vi.mock("next-auth", () => ({}));
const mockEnv = vi.hoisted(() => ({
  AUTH_OIDC_GROUPS_ATTRIBUTE: "someRandomGroupsKey",
  AUTH_OIDC_GROUPS_LOCAL_MANAGEMENT: false,
}));
vi.mock("../env", () => {
  return {
    env: mockEnv,
  };
});
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type HeadersExport = typeof import("next/headers");
vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<HeadersExport>();

  const result = {
    set: (name: string, value: string, options: Partial<ResponseCookie>) => options as ResponseCookie,
  } as unknown as ReadonlyRequestCookies;

  vi.spyOn(result, "set");

  const cookies = () => Promise.resolve(result);

  return { ...mod, cookies } satisfies HeadersExport;
});

describe("createSignInEventHandler should create signInEventHandler", () => {
  describe("signInEventHandler should add users to everyone group", () => {
    test("should add user to everyone group if he isn't already", async () => {
      // Arrange
      const db = createDb();
      await createUserAsync(db);
      await createGroupAsync(db, everyoneGroup);
      const eventHandler = createSignInEventHandler(db);

      // Act
      await eventHandler?.({
        user: { id: "1", name: "test" },
        profile: undefined,
        account: null,
      });

      // Assert
      const dbGroupMembers = await db.query.groupMembers.findFirst({
        where: eq(groupMembers.userId, "1"),
      });
      expect(dbGroupMembers?.groupId).toBe("1");
    });
  });

  describe("signInEventHandler should synchronize ldap groups", () => {
    test("should add missing group membership", async () => {
      // Arrange
      const db = createDb();
      await createUserAsync(db);
      await createGroupAsync(db);
      const eventHandler = createSignInEventHandler(db);

      // Act
      await eventHandler?.({
        user: { id: "1", name: "test", groups: ["test"] } as never,
        profile: undefined,
        account: null,
      });

      // Assert
      const dbGroupMembers = await db.query.groupMembers.findFirst({
        where: eq(groupMembers.userId, "1"),
      });
      expect(dbGroupMembers?.groupId).toBe("1");
    });
    test("should remove group membership", async () => {
      // Arrange
      const db = createDb();
      await createUserAsync(db);
      await createGroupAsync(db);
      await db.insert(groupMembers).values({
        userId: "1",
        groupId: "1",
      });
      const eventHandler = createSignInEventHandler(db);

      // Act
      await eventHandler?.({
        user: { id: "1", name: "test", groups: [] } as never,
        profile: undefined,
        account: null,
      });

      // Assert
      const dbGroupMembers = await db.query.groupMembers.findFirst({
        where: eq(groupMembers.userId, "1"),
      });
      expect(dbGroupMembers).toBeUndefined();
    });
    test("should not remove group membership for everyone group", async () => {
      // Arrange
      const db = createDb();
      await createUserAsync(db);
      await createGroupAsync(db, everyoneGroup);
      await db.insert(groupMembers).values({
        userId: "1",
        groupId: "1",
      });
      const eventHandler = createSignInEventHandler(db);

      // Act
      await eventHandler?.({
        user: { id: "1", name: "test", groups: [] } as never,
        profile: undefined,
        account: null,
      });

      // Assert
      const dbGroupMembers = await db.query.groupMembers.findFirst({
        where: eq(groupMembers.userId, "1"),
      });
      expect(dbGroupMembers?.groupId).toBe("1");
    });
  });
  describe("signInEventHandler should synchronize oidc groups", () => {
    test("should add missing group membership", async () => {
      // Arrange
      const db = createDb();
      await createUserAsync(db, "oidc");
      await createGroupAsync(db);
      const eventHandler = createSignInEventHandler(db);

      // Act
      await eventHandler?.({
        user: { id: "1", name: "test" },
        profile: { preferred_username: "test", someRandomGroupsKey: ["test"] },
        account: null,
      });

      // Assert
      const dbGroupMembers = await db.query.groupMembers.findFirst({
        where: eq(groupMembers.userId, "1"),
      });
      expect(dbGroupMembers?.groupId).toBe("1");
    });
    test("should add membership when the groups claim is a single string", async () => {
      // Arrange
      const db = createDb();
      await createUserAsync(db, "oidc");
      await createGroupAsync(db);
      const eventHandler = createSignInEventHandler(db);

      // Act
      await eventHandler?.({
        user: { id: "1", name: "test" },
        profile: { preferred_username: "test", someRandomGroupsKey: "test" },
        account: null,
      });

      // Assert
      const dbGroupMembers = await db.query.groupMembers.findFirst({
        where: eq(groupMembers.userId, "1"),
      });
      expect(dbGroupMembers?.groupId).toBe("1");
    });
    test("should not change memberships for an invalid groups claim", async () => {
      // Arrange
      const db = createDb();
      await createUserAsync(db, "oidc");
      await createGroupAsync(db);
      await db.insert(groupMembers).values({ userId: "1", groupId: "1" });
      const eventHandler = createSignInEventHandler(db);

      // Act
      await eventHandler?.({
        user: { id: "1", name: "test" },
        profile: { preferred_username: "test", someRandomGroupsKey: 42 },
        account: null,
      });

      // Assert
      const dbGroupMembers = await db.query.groupMembers.findFirst({
        where: eq(groupMembers.userId, "1"),
      });
      expect(dbGroupMembers?.groupId).toBe("1");
    });
    test("should remove group membership", async () => {
      // Arrange
      const db = createDb();
      await createUserAsync(db, "oidc");
      await createGroupAsync(db);
      await db.insert(groupMembers).values({
        userId: "1",
        groupId: "1",
      });
      const eventHandler = createSignInEventHandler(db);

      // Act
      await eventHandler?.({
        user: { id: "1", name: "test" },
        profile: { preferred_username: "test", someRandomGroupsKey: [] },
        account: null,
      });

      // Assert
      const dbGroupMembers = await db.query.groupMembers.findFirst({
        where: eq(groupMembers.userId, "1"),
      });
      expect(dbGroupMembers).toBeUndefined();
    });
    test("should not remove group membership for everyone group", async () => {
      // Arrange
      const db = createDb();
      await createUserAsync(db, "oidc");
      await createGroupAsync(db, everyoneGroup);
      await db.insert(groupMembers).values({
        userId: "1",
        groupId: "1",
      });
      const eventHandler = createSignInEventHandler(db);

      // Act
      await eventHandler?.({
        user: { id: "1", name: "test" },
        profile: { preferred_username: "test", someRandomGroupsKey: [] },
        account: null,
      });

      // Assert
      const dbGroupMembers = await db.query.groupMembers.findFirst({
        where: eq(groupMembers.userId, "1"),
      });
      expect(dbGroupMembers?.groupId).toBe("1");
    });
    test("should not synchronize groups when AUTH_OIDC_GROUPS_LOCAL_MANAGEMENT is enabled", async () => {
      // Arrange
      mockEnv.AUTH_OIDC_GROUPS_LOCAL_MANAGEMENT = true;
      const db = createDb();
      await createUserAsync(db, "oidc");
      await createGroupAsync(db);
      const eventHandler = createSignInEventHandler(db);

      // Act
      await eventHandler?.({
        user: { id: "1", name: "test" },
        profile: { preferred_username: "test", someRandomGroupsKey: ["test"] },
        account: null,
      });

      // Assert
      const dbGroupMembers = await db.query.groupMembers.findFirst({
        where: eq(groupMembers.userId, "1"),
      });
      expect(dbGroupMembers).toBeUndefined();

      // Cleanup
      mockEnv.AUTH_OIDC_GROUPS_LOCAL_MANAGEMENT = false;
    });
  });
  test.each([
    ["ldap" as const, { name: "test-new" }, undefined],
    ["oidc" as const, { name: "test" }, { preferred_username: "test-new" }],
    ["oidc" as const, { name: "test" }, { preferred_username: "test@example.com", name: "test-new" }],
  ])("signInEventHandler should update username for %s provider", async (provider, user, profile) => {
    // Arrange
    const db = createDb();
    await createUserAsync(db, provider);
    const eventHandler = createSignInEventHandler(db);

    // Act
    await eventHandler?.({
      user: { id: "1", ...user },
      profile,
      account: null,
    });

    // Assert
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, "1"),
      columns: {
        name: true,
      },
    });
    expect(dbUser?.name).toBe("test-new");
  });
  test("signInEventHandler should preserve credentials-owned data when the user signs in with linked oidc", async () => {
    const db = createDb();
    await createUserAsync(db, "credentials", "local-avatar");
    await createGroupAsync(db);
    await db.insert(groupMembers).values({ userId: "1", groupId: "1" });
    const eventHandler = createSignInEventHandler(db);

    await eventHandler?.({
      user: { id: "1", name: "test" },
      profile: {
        preferred_username: "oidc-name",
        picture: "oidc-avatar",
        someRandomGroupsKey: [],
      },
      account: null,
    });

    const dbUser = await db.query.users.findFirst({ where: eq(users.id, "1") });
    const membership = await db.query.groupMembers.findFirst({ where: eq(groupMembers.userId, "1") });
    expect(dbUser).toMatchObject({
      name: "test",
      image: "local-avatar",
      provider: "credentials",
    });
    expect(membership?.groupId).toBe("1");
  });
  test("signInEventHandler should set color-scheme cookie", async () => {
    // Arrange
    const db = createDb();
    await createUserAsync(db);
    const eventHandler = createSignInEventHandler(db);

    // Act
    await eventHandler?.({
      user: { id: "1", name: "test" },
      profile: undefined,
      account: null,
    });

    // Assert
    expect((await cookies()).set).toHaveBeenCalledWith(
      colorSchemeCookieKey,
      "dark",
      expect.objectContaining({
        path: "/",
      }),
    );
  });
});

const createUserAsync = async (
  db: Database,
  provider: "credentials" | "ldap" | "oidc" = "credentials",
  image?: string,
) =>
  await db.insert(users).values({
    id: "1",
    name: "test",
    colorScheme: "dark",
    image,
    provider,
  });

const createGroupAsync = async (db: Database, name = "test") =>
  await db.insert(groups).values({
    id: "1",
    name,
    position: 1,
  });
