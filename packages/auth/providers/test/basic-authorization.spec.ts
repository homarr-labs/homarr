import { describe, expect, test, vi } from "vitest";

import { createId } from "@homarr/common";
import { users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { hashPasswordAsync } from "../../security";
import { authorizeWithBasicCredentialsAsync } from "../credentials/authorization/basic-authorization";

const mocks = vi.hoisted(() => ({
  logger: { info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => mocks.logger,
}));

const defaultUserId = createId();
const ipAddress = "203.0.113.7";

describe("authorizeWithBasicCredentials", () => {
  test("should authorize user with correct credentials", async () => {
    // Arrange
    const db = createDb();
    await db.insert(users).values({
      id: defaultUserId,
      name: "test",
      password: await hashPasswordAsync("test"),
    });

    // Act
    const result = await authorizeWithBasicCredentialsAsync(
      db,
      {
        name: "test",
        password: "test",
      },
      ipAddress,
    );

    // Assert
    expect(result).toEqual({ id: defaultUserId, name: "test" });
  });

  test("should not authorize user with incorrect credentials", async () => {
    // Arrange
    const db = createDb();
    await db.insert(users).values({
      id: defaultUserId,
      name: "test",
      password: await hashPasswordAsync("test"),
    });

    // Act
    const result = await authorizeWithBasicCredentialsAsync(
      db,
      {
        name: "test",
        password: "wrong",
      },
      ipAddress,
    );

    // Assert
    expect(result).toBeNull();
    expect(mocks.logger.warn).toHaveBeenCalledWith("Password for user was incorrect", { userName: "test", ipAddress });
  });

  test("should not authorize user with incorrect username", async () => {
    // Arrange
    const db = createDb();
    await db.insert(users).values({
      id: defaultUserId,
      name: "test",
      password: await hashPasswordAsync("test"),
    });

    // Act
    const result = await authorizeWithBasicCredentialsAsync(
      db,
      {
        name: "wrong",
        password: "test",
      },
      ipAddress,
    );

    // Assert
    expect(result).toBeNull();
    expect(mocks.logger.warn).toHaveBeenCalledWith("User not found", { userName: "wrong", ipAddress });
  });

  test("should not authorize user when password is not set", async () => {
    // Arrange
    const db = createDb();
    await db.insert(users).values({
      id: defaultUserId,
      name: "test",
    });

    // Act
    const result = await authorizeWithBasicCredentialsAsync(
      db,
      {
        name: "test",
        password: "test",
      },
      ipAddress,
    );

    // Assert
    expect(result).toBeNull();
  });
});
