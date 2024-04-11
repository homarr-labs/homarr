import { randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";

import { asc, createId, eq } from "@homarr/db";
import { invites } from "@homarr/db/schema/sqlite";
import { z } from "@homarr/validation";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const inviteRouter = createTRPCRouter({
  all: protectedProcedure.query(async ({ ctx }) => {
    const dbInvites = await ctx.db.query.invites.findMany({
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
    return dbInvites;
  }),
  create: protectedProcedure
    .input(
      z.object({
        expirationDate: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = createId();
      const token = randomBytes(20).toString("hex");

      await ctx.db.insert(invites).values({
        id,
        expirationDate: input.expirationDate,
        creatorId: ctx.session.user.id,
        token,
      });

      return {
        id,
        token,
      };
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const dbInvite = await ctx.db.query.invites.findFirst({
        where: eq(invites.id, input.id),
      });

      if (!dbInvite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
      }

      await ctx.db.delete(invites).where(eq(invites.id, input.id));
    }),
});
