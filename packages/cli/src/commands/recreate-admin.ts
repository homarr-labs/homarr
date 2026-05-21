import { parseArgs } from "node:util";

import { hashPasswordAsync } from "@homarr/auth/security";
import { createId } from "@homarr/common";
import { generateSecureRandomToken } from "../utils";
import { and, count, eq, max } from "drizzle-orm";

import { getCliDb } from "../cli-db";
import { CliError, requireCredentialsProvider } from "../errors";
import { groupMembers, groupPermissions, groups, users } from "@homarr/db/schema";
import { usernameSchema } from "@homarr/validation/user";

export async function recreateAdminHandler(args: string[]): Promise<number> {
  requireCredentialsProvider();

  const { values } = parseArgs({
    args,
    options: {
      username: { type: "string", short: "u" },
    },
  });

  if (!values.username) {
    throw new CliError("Missing required option: --username / -u", 2);
  }

  const result = await usernameSchema.safeParseAsync(values.username);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => `- ${issue.message}`).join("\n");
    throw new CliError(`Invalid username:\n${messages}`, 2);
  }

  const db = getCliDb();

  const totalCount = await db
    .select({
      count: count(),
    })
    .from(groupPermissions)
    .leftJoin(groupMembers, eq(groupMembers.groupId, groupPermissions.groupId))
    .leftJoin(users, eq(users.id, groupMembers.userId))
    .where(and(eq(groupPermissions.permission, "admin"), eq(users.provider, "credentials")))
    .then((rows: { count: number }[]) => rows.at(0)?.count ?? 0);

  if (totalCount > 0) {
    throw new CliError("Credentials admin user exists");
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.name, result.data),
  });

  if (existingUser) {
    throw new CliError("User with this name already exists");
  }

  const temporaryGroupId = createId();
  const maxPosition = await db
    .select({ value: max(groups.position) })
    .from(groups)
    .then((result: { value: number | null }[]) => result[0]?.value ?? 1);

  await db.insert(groups).values({
    id: temporaryGroupId,
    name: temporaryGroupId,
    position: maxPosition + 1,
  });

  await db.insert(groupPermissions).values({
    groupId: temporaryGroupId,
    permission: "admin",
  });

  const password = generateSecureRandomToken(24);
  const hashedPassword = await hashPasswordAsync(password);
  const userId = createId();

  await db.insert(users).values({
    id: userId,
    name: result.data,
    provider: "credentials",
    password: hashedPassword,
  });

  await db.insert(groupMembers).values({
    groupId: temporaryGroupId,
    userId,
  });

  console.log(
    "We created a new admin user for you. Please keep in mind, that the admin group of it has a temporary name. You should change it to something more meaningful.",
  );
  console.log(`\tUsername: ${result.data}`);
  console.log(`\tPassword: ${password}`);
  console.log(`\tGroup: ${temporaryGroupId}`);
  console.log("");
  return 0;
}
