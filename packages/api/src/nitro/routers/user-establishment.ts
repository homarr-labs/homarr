import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { hashPasswordAsync } from "@homarr/auth/security";
import { credentialsAdminGroup } from "@homarr/definitions";
import { userCreateSchema, userInitSchema, userRegistrationApiSchema } from "@homarr/validation/user";

import { convertIntersectionToZodObject } from "../../schema-merger";
import { authenticatedProcedure, sourceProcedure, sourceProjectionMeta } from "../procedure";
import { throwIfCredentialsDisabled } from "./-identity/resources";
import { createUserEstablishmentHelpers } from "./-user-establishment/helpers";
import type { UserEstablishmentResources } from "./-user-establishment/resources";

export const userEstablishmentImplementedPaths = ["user.initUser", "user.register", "user.create"] as const;
export const userEstablishmentPendingPaths = [] as const;
export const userEstablishmentBindingHeldPaths = ["user.initUser", "user.register", "user.create"] as const;

export function createUserEstablishmentProcedures(resources: UserEstablishmentResources) {
  const {
    checkUsernameAlreadyTakenAndThrowAsync,
    getMaxGroupPositionAsync,
    createUserAsync,
    initializeUserAsync,
    registerUserAsync,
  } = createUserEstablishmentHelpers(resources);
  const { and, eq } = resources.operators;

  return {
    initUser: sourceProcedure({
      path: "user.initUser",
      kind: "mutation",
      access: { kind: "onboardingStep", step: "user" },
      demo: "guarded",
    })
      .input(userInitSchema)
      .handler(async ({ context, input }) => {
        throwIfCredentialsDisabled(resources);
        await checkUsernameAlreadyTakenAndThrowAsync(context.db, "credentials", input.username);
        const maxPosition = await getMaxGroupPositionAsync(context.db);
        const hashedPassword = await hashPasswordAsync(input.password);
        const userId = resources.createId();
        const groupId = resources.createId();
        const userRow = { id: userId, name: input.username, email: input.email, password: hashedPassword };
        const groupRow = { id: groupId, name: credentialsAdminGroup, ownerId: userId, position: maxPosition + 1 };
        const nextStep =
          resources.providers().enabled.includes("ldap") || resources.providers().enabled.includes("oidc")
            ? "group"
            : "setup";
        await initializeUserAsync(context.db, { userRow, groupRow, nextStep });
      }),
    register: sourceProcedure({
      path: "user.register",
      kind: "mutation",
      access: { kind: "public" },
      demo: "guarded",
    })
      .input(userRegistrationApiSchema)
      .output(z.void())
      .handler(async ({ context, input }) => {
        throwIfCredentialsDisabled(resources);
        const { invites } = resources.getSchemaForDatabase(context.db);
        const inviteWhere = and(eq(invites.id, input.inviteId), eq(invites.token, input.token));
        const dbInvite = await context.db.query.invites.findFirst({
          columns: { id: true, expirationDate: true },
          where: inviteWhere,
        });
        if (!dbInvite || dbInvite.expirationDate < resources.clock.now()) {
          throw new ORPCError("FORBIDDEN", { message: "Invalid invite" });
        }
        await checkUsernameAlreadyTakenAndThrowAsync(context.db, "credentials", input.username);
        const hashedPassword = await hashPasswordAsync(input.password);
        const userId = resources.createId();
        const user = { id: userId, name: input.username, password: hashedPassword };
        await registerUserAsync(context.db, user, inviteWhere);
      }),
    create: authenticatedProcedure({
      path: "user.create",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "POST",
            path: "/api/users",
            tags: ["users"],
            protect: true,
            summary: "Create a user",
            description:
              "Create a credentials account and assign the supplied groups. Requires admin permission and credentials authentication to be enabled. The username must be unique and password confirmation must match.",
          },
          mcp: {
            enabled: true,
            description:
              "Create a new user account (admin only). REQUIRED: username (string), password (string), confirmPassword (must match password). OPTIONAL: email (string or null)",
          },
        }),
      )
      .input(convertIntersectionToZodObject(userCreateSchema))
      .output(z.void())
      .handler(async ({ context, input }) => {
        throwIfCredentialsDisabled(resources);
        await checkUsernameAlreadyTakenAndThrowAsync(context.db, "credentials", input.username);
        const userId = await createUserAsync(context.db, input);
        if (input.groupIds.length >= 1) {
          const { groupMembers } = resources.getSchemaForDatabase(context.db);
          await context.db.insert(groupMembers).values(input.groupIds.map((groupId) => ({ groupId, userId })));
        }
      }),
  };
}
