import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";

import { createSalt, hashPassword } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { and, createId, eq, schema } from "@homarr/db";
import { invites, users } from "@homarr/db/schema/sqlite";
import { exampleChannel } from "@homarr/redis";
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

      await createUser(ctx.db, input);
    }),
  register: publicProcedure
    .input(validation.user.registrationApi)
    .mutation(async ({ ctx, input }) => {
      const inviteWhere = and(
        eq(invites.id, input.inviteId),
        eq(invites.token, input.token),
      );
      const dbInvite = await ctx.db.query.invites.findFirst({
        columns: {
          id: true,
          expirationDate: true,
        },
        where: inviteWhere,
      });

      if (!dbInvite || dbInvite.expirationDate < new Date()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid invite",
        });
      }

      await createUser(ctx.db, input);
      // Delete invite as it's used
      await ctx.db.delete(invites).where(inviteWhere);
    }),
  create: publicProcedure
    .input(validation.user.create)
    .mutation(async ({ ctx, input }) => {
      await createUser(ctx.db, input);
    }),
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
      },
    });
  }),
  selectable: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        image: true,
      },
    });
  }),
  getById: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.query.users.findFirst({
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
  editProfile: publicProcedure
    .input(
      z.object({
        form: validation.user.editProfile,
        userId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      const emailDirty =
        input.form.email && user[0]?.email !== input.form.email;
      await ctx.db
        .update(users)
        .set({
          name: input.form.name,
          email: emailDirty === true ? input.form.email : undefined,
          emailVerified: emailDirty === true ? null : undefined,
        })
        .where(eq(users.id, input.userId));
    }),
  delete: publicProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    await ctx.db.delete(users).where(eq(users.id, input));
  }),
  changePassword: publicProcedure
    .input(validation.user.changePassword)
    .mutation(async ({ ctx, input }) => {
      const salt = await createSalt();
      const hashedPassword = await hashPassword(input.password, salt);
      await ctx.db
        .update(users)
        .set({
          password: hashedPassword,
        })
        .where(eq(users.id, input.userId));
    }),
  setMessage: publicProcedure.input(z.string()).mutation(async ({ input }) => {
    await exampleChannel.publish({ message: input });
  }),
  test: publicProcedure.subscription(() => {
    return observable<{ message: string }>((emit) => {
      exampleChannel.subscribe((message) => {
        emit.next(message);
      });
    });
  }),
});

const createUser = async (
  db: Database,
  input: z.infer<typeof validation.user.create>,
) => {
  const salt = await createSalt();
  const hashedPassword = await hashPassword(input.password, salt);

  const userId = createId();
  await db.insert(schema.users).values({
    id: userId,
    name: input.username,
    password: hashedPassword,
    salt,
  });
};
