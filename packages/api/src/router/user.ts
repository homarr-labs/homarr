import "server-only";

import { TRPCError } from "@trpc/server";

import { createSalt, hashPassword } from "@alparr/auth";
import { createId, schema } from "@alparr/db";
import { initUserSchema } from "@alparr/validation";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  initUser: publicProcedure
    .input(initUserSchema)
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
});
