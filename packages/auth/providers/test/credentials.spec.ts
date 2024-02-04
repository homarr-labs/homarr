import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TableConfig } from "@homarr/db";
import { createId, db, schema } from "@homarr/db";
import { users } from "@homarr/db/schema/sqlite";

import { createSalt, hashPassword } from "../../security";
import { credentialsConfiguration } from "../credentials";

vi.mock("@homarr/db", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const mod = await importOriginal<typeof import("@homarr/db")>();
  const sqlite = new Database(`:memory:`);
  const db = drizzle(sqlite, { schema: mod.schema });
  migrate(db, {
    migrationsFolder: "./packages/db/migrations",
  });
  return { ...mod, db, sqlite };
});

describe("Credentials authorization", () => {
  afterEach(async () => {
    const toDelete = Object.values(schema).filter(
      (value) => "getSQL" in value,
    ) as unknown as SQLiteTableWithColumns<TableConfig>[];
    let maxIterations = toDelete.length * 4;

    while (toDelete.length > 0 && maxIterations-- > 0) {
      const next = toDelete.pop()!;
      try {
        await db.delete(next).execute();
      } catch (e) {
        toDelete.unshift(next);
      }
    }

    if (maxIterations <= 0) {
      throw new Error("Failed to delete all tables");
    }
  });

  it("should authorize user with correct credentials", async () => {
    const userId = createId();
    const salt = await createSalt();
    await db.insert(users).values({
      id: userId,
      name: "test",
      password: await hashPassword("test", salt),
      salt,
    });
    const result = await credentialsConfiguration.authorize({
      name: "test",
      password: "test",
    });

    expect(result).toEqual({ id: userId, name: "test" });
  });

  const passwordsThatShouldNotAuthorize = [
    "wrong",
    "Test",
    "test ",
    " test",
    " test ",
  ];

  passwordsThatShouldNotAuthorize.forEach((password) => {
    it(`should not authorize user with incorrect credentials (${password})`, async () => {
      const userId = createId();
      const salt = await createSalt();
      await db.insert(users).values({
        id: userId,
        name: "test",
        password: await hashPassword("test", salt),
        salt,
      });
      const result = await credentialsConfiguration.authorize({
        name: "test",
        password,
      });

      expect(result).toBeNull();
    });
  });

  it(`should not authorize user for not existing user`, async () => {
    const result = await credentialsConfiguration.authorize({
      name: "test",
      password: "test",
    });

    expect(result).toBeNull();
  });
});
