import { describe, expect, test, vi } from "vitest";

import { createId } from "@homarr/common";
import { apiKeys, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { getSessionFromApiKeyAsync } from "../api-key";
import { createSaltAsync, hashPasswordAsync } from "../security";

// Mock the logger to avoid console output during tests
vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({
    warn: vi.fn(),
    info: vi.fn(),
  }),
}));

const defaultUserId = createId();
const defaultApiKeyId = createId();

describe("getSessionFromApiKeyAsync", () => {
  test("should return null when api key header is null", async () => {
    // Arrange
    const db = createDb();

    // Act
    const result = await getSessionFromApiKeyAsync(db, null, "127.0.0.1", "test-agent");

    // Assert
    expect(result).toBeNull();
  });

  test("should return null when api key format is invalid (no dot)", async () => {
    // Arrange
    const db = createDb();

    // Act
    const result = await getSessionFromApiKeyAsync(db, "invalidformat", "127.0.0.1", "test-agent");

    // Assert
    expect(result).toBeNull();
  });

  test("should return null when api key format is invalid (missing token)", async () => {
    // Arrange
    const db = createDb();

    // Act
    const result = await getSessionFromApiKeyAsync(db, "keyid.", "127.0.0.1", "test-agent");

    // Assert
    expect(result).toBeNull();
  });

  test("should return null when api key format is invalid (missing id)", async () => {
    // Arrange
    const db = createDb();

    // Act
    const result = await getSessionFromApiKeyAsync(db, ".token", "127.0.0.1", "test-agent");

    // Assert
    expect(result).toBeNull();
  });

  test("should return null when api key is not found in database", async () => {
    // Arrange
    const db = createDb();

    // Act
    const result = await getSessionFromApiKeyAsync(db, "nonexistent.token", "127.0.0.1", "test-agent");

    // Assert
    expect(result).toBeNull();
  });

  test("should return null when api key token does not match", async () => {
    // Arrange
    const db = createDb();
    const salt = await createSaltAsync();
    const hashedApiKey = await hashPasswordAsync("correcttoken", salt);

    await db.insert(users).values({
      id: defaultUserId,
      name: "testuser",
      email: "test@example.com",
    });

    await db.insert(apiKeys).values({
      id: defaultApiKeyId,
      apiKey: hashedApiKey,
      salt,
      userId: defaultUserId,
    });

    // Act
    const result = await getSessionFromApiKeyAsync(db, `${defaultApiKeyId}.wrongtoken`, "127.0.0.1", "test-agent");

    // Assert
    expect(result).toBeNull();
  });

  test("should return session when api key is valid", async () => {
    // Arrange
    const db = createDb();
    const salt = await createSaltAsync();
    const rawToken = "validtesttoken123";
    const hashedApiKey = await hashPasswordAsync(rawToken, salt);

    await db.insert(users).values({
      id: defaultUserId,
      name: "testuser",
      email: "test@example.com",
    });

    await db.insert(apiKeys).values({
      id: defaultApiKeyId,
      apiKey: hashedApiKey,
      salt,
      userId: defaultUserId,
    });

    // Act
    const result = await getSessionFromApiKeyAsync(db, `${defaultApiKeyId}.${rawToken}`, "127.0.0.1", "test-agent");

    // Assert
    expect(result).not.toBeNull();
    expect(result?.user).toBeDefined();
    expect(result?.user.id).toEqual(defaultUserId);
    expect(result?.user.name).toEqual("testuser");
  });

  test("should work with null ip address", async () => {
    // Arrange
    const db = createDb();
    const salt = await createSaltAsync();
    const rawToken = "validtesttoken123";
    const hashedApiKey = await hashPasswordAsync(rawToken, salt);

    await db.insert(users).values({
      id: defaultUserId,
      name: "testuser",
      email: "test@example.com",
    });

    await db.insert(apiKeys).values({
      id: defaultApiKeyId,
      apiKey: hashedApiKey,
      salt,
      userId: defaultUserId,
    });

    // Act
    const result = await getSessionFromApiKeyAsync(db, `${defaultApiKeyId}.${rawToken}`, null, "test-agent");

    // Assert
    expect(result).not.toBeNull();
    expect(result?.user.id).toEqual(defaultUserId);
  });
});
