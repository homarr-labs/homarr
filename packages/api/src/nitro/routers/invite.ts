import { randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import type { SourceLeafPath } from "../port-map";
import { identityProcedure } from "./-identity/projection";
import type { InviteProcedureResources } from "./-identity/resources";
import { throwIfCredentialsDisabled } from "./-identity/resources";

export const portedInvitePaths = [
  "invite.getAll",
  "invite.createInvite",
  "invite.deleteInvite",
] as const satisfies readonly SourceLeafPath[];
export const pendingInvitePaths = [] as const;

export function createInviteProcedures(resources: InviteProcedureResources) {
  const { eq, asc } = resources.operators;
  return {
    getAll: identityProcedure({
      path: "invite.getAll",
      kind: "query",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(z.undefined())
      .output(
        z.array(
          resources.validation.selectInviteSchema
            .pick({ id: true, expirationDate: true })
            .extend({ creator: z.object({ name: z.string().nullable(), id: z.string() }) }),
        ),
      )
      .handler(async ({ context }) => {
        throwIfCredentialsDisabled(resources);
        return await context.db.query.invites.findMany({
          orderBy: asc(resources.tables.invites.expirationDate),
          columns: { token: false },
          with: { creator: { columns: { id: true, name: true } } },
        });
      }),
    createInvite: identityProcedure({
      path: "invite.createInvite",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(z.object({ expirationDate: z.iso.datetime({ offset: true }) }))
      .output(z.object({ id: z.string(), token: z.string() }))
      .handler(async ({ context, input }) => {
        throwIfCredentialsDisabled(resources);
        const id = resources.createId();
        const token = randomBytes(20).toString("hex");
        await context.db
          .insert(resources.tables.invites)
          .values({ id, expirationDate: new Date(input.expirationDate), creatorId: context.principal.user.id, token });
        return { id, token };
      }),
    deleteInvite: identityProcedure({
      path: "invite.deleteInvite",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(z.object({ id: z.string() }))
      .output(z.undefined())
      .handler(async ({ context, input }) => {
        throwIfCredentialsDisabled(resources);
        const invite = await context.db.query.invites.findFirst({ where: eq(resources.tables.invites.id, input.id) });
        if (!invite) throw new ORPCError("NOT_FOUND", { message: "Invite not found" });
        await context.db.delete(resources.tables.invites).where(eq(resources.tables.invites.id, input.id));
        return undefined;
      }),
  };
}
