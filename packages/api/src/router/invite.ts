import { randomBytes } from "crypto";
import { ApiError } from "../procedure";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { asc, eq } from "@homarr/db";
import { invites } from "@homarr/db/schema";
import { selectInviteSchema } from "@homarr/db/validationSchemas";

import { createApiRouter, permissionRequiredProcedure } from "../procedure";
import { throwIfCredentialsDisabled } from "./invite/checks";

export const inviteRouter = createApiRouter({
  getAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .output(
      z.array(
        selectInviteSchema
          .pick({
            id: true,
            expirationDate: true,
          })
          .extend({
            creator: z.object({ name: z.string().nullable(), id: z.string() }),
          }),
      ),
    )
    .input(z.undefined())
    .meta({
      openapi: {
        method: "GET",
        path: "/api/invites",
        tags: ["invites"],
        protect: true,
        summary: "List user invitations",
        description:
          "Return invitations with their expiration dates and creators, ordered by expiration. Invite tokens are excluded. Requires admin permission and credentials authentication to be enabled.",
      },
      mcp: { enabled: true, description: "List all user invites" },
    })
    .query(async ({ context }) => {
      throwIfCredentialsDisabled();
      return await context.db.query.invites.findMany({
        orderBy: asc(invites.expirationDate),
        columns: {
          token: false,
        },
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),
  createInvite: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(
      z.object({
        expirationDate: z.iso.datetime({ offset: true }),
      }),
    )
    .output(z.object({ id: z.string(), token: z.string() }))
    .meta({
      openapi: {
        method: "POST",
        path: "/api/invites",
        tags: ["invites"],
        protect: true,
        summary: "Create a user invitation",
        description:
          "Create a single-use invitation with the supplied expiration date and return its ID and registration token. Requires admin permission and credentials authentication to be enabled.",
      },
      mcp: {
        enabled: true,
        effect: "additive",
        description:
          "Create a new user invite link. REQUIRED: expirationDate (ISO date string for when the invite expires). Returns the invite ID and token",
      },
    })
    .mutation(async ({ context, input }) => {
      throwIfCredentialsDisabled();
      const id = createId();
      const token = randomBytes(20).toString("hex");

      await context.db.insert(invites).values({
        id,
        expirationDate: new Date(input.expirationDate),
        creatorId: context.session.user.id,
        token,
      });

      return {
        id,
        token,
      };
    }),
  deleteInvite: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .output(z.undefined())
    .meta({
      openapi: {
        method: "DELETE",
        path: "/api/invites/{id}",
        tags: ["invites"],
        protect: true,
        summary: "Delete a user invitation",
        description:
          "Revoke an invitation by ID. Requires admin permission and credentials authentication to be enabled. Returns not found if the invitation does not exist.",
      },
      mcp: {
        enabled: true,
        effect: "destructive",
        description: "Delete an invite by ID. REQUIRED: id (invite ID string)",
      },
    })
    .mutation(async ({ context, input }) => {
      throwIfCredentialsDisabled();
      const dbInvite = await context.db.query.invites.findFirst({
        where: eq(invites.id, input.id),
      });

      if (!dbInvite) {
        throw new ApiError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
      }

      await context.db.delete(invites).where(eq(invites.id, input.id));
    }),
});
