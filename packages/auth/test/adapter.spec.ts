import { describe, expect, test } from "vitest";

import { eq } from "@homarr/db";
import { accounts, apiKeys, groupMembers, groups, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { createAdapter } from "../adapter";

describe("createAdapter should create drizzle adapter", () => {
  test.each([["credentials" as const], ["ldap" as const], ["oidc" as const]])(
    "createAdapter getUserByEmail should return user for provider %s when this provider provided",
    async (provider) => {
      // Arrange
      const db = createDb();
      const adapter = createAdapter(db, provider);
      const email = "test@example.com";
      await db.insert(users).values({ id: "1", name: "test", email, provider });

      // Act
      const user = await adapter.getUserByEmail?.(email);

      // Assert
      expect(user).toEqual({
        id: "1",
        name: "test",
        email,
        emailVerified: null,
        image: null,
      });
    },
  );

  test.each([
    ["credentials", ["ldap", "oidc"]],
    ["ldap", ["credentials", "oidc"]],
    ["oidc", ["credentials", "ldap"]],
  ] as const)(
    "createAdapter getUserByEmail should return null if only for other providers than %s exist",
    async (requestedProvider, existingProviders) => {
      // Arrange
      const db = createDb();
      const adapter = createAdapter(db, requestedProvider);
      const email = "test@example.com";
      for (const provider of existingProviders) {
        await db.insert(users).values({ id: provider, name: `test-${provider}`, email, provider });
      }

      // Act
      const user = await adapter.getUserByEmail?.(email);

      // Assert
      expect(user).toBeNull();
    },
  );

  test("createAdapter getUserByEmail should throw error if provider is unknown", async () => {
    // Arrange
    const db = createDb();
    const adapter = createAdapter(db, "unknown");
    const email = "test@example.com";

    // Act
    const actAsync = async () => await adapter.getUserByEmail?.(email);

    // Assert
    await expect(actAsync()).rejects.toThrow("Unable to get user by email for unknown provider");
  });

  test("getUserByEmail should return a credentials user for oidc when credentials linking is enabled", async () => {
    const db = createDb();
    const adapter = createAdapter(db, "oidc", true);
    const email = "test@example.com";
    await db.insert(users).values({ id: "credentials-user", name: "test", email, provider: "credentials" });

    const user = await adapter.getUserByEmail?.(email);

    expect(user?.id).toBe("credentials-user");
  });

  test("getUserByEmail should not return credentials users for non-oidc providers", async () => {
    const db = createDb();
    const adapter = createAdapter(db, "ldap", true);
    const email = "test@example.com";
    await db.insert(users).values({ id: "credentials-user", name: "test", email, provider: "credentials" });

    const user = await adapter.getUserByEmail?.(email);

    expect(user).toBeNull();
  });

  test("getUserByEmail should prefer an existing oidc user over a credentials user", async () => {
    const db = createDb();
    const adapter = createAdapter(db, "oidc", true);
    const email = "test@example.com";
    await db.insert(users).values([
      { id: "credentials-user", name: "credentials", email, provider: "credentials" },
      { id: "oidc-user", name: "oidc", email, provider: "oidc" },
    ]);

    const user = await adapter.getUserByEmail?.(email);

    expect(user?.id).toBe("oidc-user");
  });

  test("linkAccount should preserve the credentials user and their data", async () => {
    const db = createDb();
    const adapter = createAdapter(db, "oidc", true);
    const email = "test@example.com";
    await db.insert(users).values({
      id: "credentials-user",
      name: "test",
      email,
      password: "hashed-password",
      provider: "credentials",
      colorScheme: "light",
      completedBoardTour: true,
    });
    await db.insert(groups).values({ id: "group", name: "Test group", position: 1 });
    await db.insert(groupMembers).values({ groupId: "group", userId: "credentials-user" });
    await db.insert(apiKeys).values({ id: "api-key", apiKey: "secret", userId: "credentials-user" });

    const user = await adapter.getUserByEmail?.(email);
    if (!user) throw new Error("Expected credentials user to be found for OIDC linking");
    await adapter.linkAccount?.({
      userId: user.id,
      type: "oidc",
      provider: "oidc",
      providerAccountId: "oidc-subject",
    });

    const linkedUser = await db.query.users.findFirst({ where: eq(users.id, "credentials-user") });
    const account = await db.query.accounts.findFirst({ where: eq(accounts.providerAccountId, "oidc-subject") });
    const membership = await db.query.groupMembers.findFirst({
      where: eq(groupMembers.userId, "credentials-user"),
    });
    const apiKey = await db.query.apiKeys.findFirst({ where: eq(apiKeys.userId, "credentials-user") });
    const userByAccount = await adapter.getUserByAccount?.({
      provider: "oidc",
      providerAccountId: "oidc-subject",
    });
    const allUsers = await db.query.users.findMany();
    expect(linkedUser).toMatchObject({
      id: "credentials-user",
      password: "hashed-password",
      provider: "credentials",
      colorScheme: "light",
      completedBoardTour: true,
    });
    expect(account?.userId).toBe("credentials-user");
    expect(membership?.groupId).toBe("group");
    expect(apiKey?.id).toBe("api-key");
    expect(userByAccount?.id).toBe("credentials-user");
    expect(allUsers).toHaveLength(1);
  });
});
