import "server-only";

import { TRPCError } from "@trpc/server";

import { createSalt, hashPassword } from "@homarr/auth";
import { createId, db, eq, schema } from "@homarr/db";
import { users } from "@homarr/db/schema/sqlite";
import { validation, z } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  initUser: publicProcedure
    .input(validation.user.init)
    .mutation(async ({ ctx, input }) => {
      const firstUser = await ctx.db.query.users.findFirst({
        columns: {
          id: true,
        },
      });

      if (firstUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User already exists",
        });
      }

      const salt = await createSalt();
      const hashedPassword = await hashPassword(input.password, salt);

      const userId = createId();
      await ctx.db.insert(schema.users).values({
        id: userId,
        name: input.username,
        password: hashedPassword,
        salt,
      });
    }),
  getAll: publicProcedure.query(async () => {
    return db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
      },
    });
  }),
  getById: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return db.query.users.findFirst({
        columns: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
        },
        where: eq(users.id, input.userId),
      });
    }),
});
