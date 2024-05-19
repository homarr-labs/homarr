import { describe, expect, it } from "vitest";

import { createId } from "@homarr/db";
import { users } from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";

import { createSaltAsync, hashPasswordAsync } from "../../security";
import { createCredentialsConfiguration } from "../credentials";

describe("Credentials authorization", () => {
  it("should authorize user with correct credentials", async () => {
    const db = createDb();
    const userId = createId();
    const salt = await createSaltAsync();
    await db.insert(users).values({
      id: userId,
      name: "test",
      password: await hashPasswordAsync("test", salt),
      salt,
    });
    const result = await createCredentialsConfiguration(db).authorize({
      name: "test",
      password: "test",
    });

    expect(result).toEqual({ id: userId, name: "test" });
  });

  const passwordsThatShouldNotAuthorize = ["wrong", "Test", "test ", " test", " test "];

  passwordsThatShouldNotAuthorize.forEach((password) => {
    it(`should not authorize user with incorrect credentials (${password})`, async () => {
      const db = createDb();
      const userId = createId();
      const salt = await createSaltAsync();
      await db.insert(users).values({
        id: userId,
        name: "test",
        password: await hashPasswordAsync("test", salt),
        salt,
      });
      const result = await createCredentialsConfiguration(db).authorize({
        name: "test",
        password,
      });

      expect(result).toBeNull();
    });
  });

  it("should not authorize user for not existing user", async () => {
    const db = createDb();
    const result = await createCredentialsConfiguration(db).authorize({
      name: "test",
      password: "test",
    });

    expect(result).toBeNull();
  });
});
