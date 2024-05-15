import { describe, expect, test } from "vitest";

import { createId } from "@homarr/db";
import { users } from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";

import { createSalt, hashPassword } from "../../security";
import { authorizeWithBasicCredentials } from "../credentials/authorization/basic-authorization";

const defaultUserId = createId();

describe("authorizeWithBasicCredentials", () => {
  test("should authorize user with correct credentials", async () => {
    // Arrange
    const db = createDb();
    const salt = await createSalt();
    await db.insert(users).values({
      id: defaultUserId,
      name: "test",
      salt,
      password: await hashPassword("test", salt),
    });

    // Act
    const result = await authorizeWithBasicCredentials(db, {
      name: "test",
      password: "test",
      credentialType: "basic",
    });

    // Assert
    expect(result).toEqual({ id: defaultUserId, name: "test" });
  });

  test("should not authorize user with incorrect credentials", async () => {
    // Arrange
    const db = createDb();
    const salt = await createSalt();
    await db.insert(users).values({
      id: defaultUserId,
      name: "test",
      salt,
      password: await hashPassword("test", salt),
    });

    // Act
    const result = await authorizeWithBasicCredentials(db, {
      name: "test",
      password: "wrong",
      credentialType: "basic",
    });

    // Assert
    expect(result).toBeNull();
  });

  test("should not authorize user with incorrect username", async () => {
    // Arrange
    const db = createDb();
    const salt = await createSalt();
    await db.insert(users).values({
      id: defaultUserId,
      name: "test",
      salt,
      password: await hashPassword("test", salt),
    });

    // Act
    const result = await authorizeWithBasicCredentials(db, {
      name: "wrong",
      password: "test",
      credentialType: "basic",
    });

    // Assert
    expect(result).toBeNull();
  });

  test("should not authorize user when password is not set", async () => {
    // Arrange
    const db = createDb();
    await db.insert(users).values({
      id: defaultUserId,
      name: "test",
    });

    // Act
    const result = await authorizeWithBasicCredentials(db, {
      name: "test",
      password: "test",
      credentialType: "basic",
    });

    // Assert
    expect(result).toBeNull();
  });
});
