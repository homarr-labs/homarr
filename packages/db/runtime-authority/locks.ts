import { sql } from "drizzle-orm";

export const authUserParentLock = (userId: string) => sql`SELECT "id" FROM "user" WHERE "id" = ${userId} FOR UPDATE`;

export const authGroupParentLocks = (maximumRows: number) =>
  sql`SELECT "id", "name" FROM "group" ORDER BY "id" LIMIT ${maximumRows + 1} FOR UPDATE`;
