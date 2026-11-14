import { TRPCError } from "@trpc/server";

import type { Database } from "@homarr/db";
import { inArray } from "@homarr/db";
import { groups, users } from "@homarr/db/schema";

export const throwIfPermissionPrincipalsInvalidAsync = async (
  db: Database,
  principalKind: "user" | "group",
  principalIds: string[],
) => {
  if (new Set(principalIds).size !== principalIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Principal IDs must be unique",
    });
  }
  if (principalIds.length === 0) return;

  const existingPrincipals =
    principalKind === "user"
      ? await db.query.users.findMany({ columns: { id: true }, where: inArray(users.id, principalIds) })
      : await db.query.groups.findMany({ columns: { id: true }, where: inArray(groups.id, principalIds) });
  if (existingPrincipals.length === principalIds.length) return;

  throw new TRPCError({
    code: "NOT_FOUND",
    message: principalKind === "user" ? "User not found" : "Group not found",
  });
};
