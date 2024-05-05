import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";

import { createSalt, hashPassword } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { createId, eq, schema } from "@homarr/db";
import { users } from "@homarr/db/schema/sqlite";
import { exampleChannel } from "@homarr/redis";
import { validation, z } from "@homarr/validation";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

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
  create: publicProcedure
    .input(validation.user.create)
    .mutation(async ({ ctx, input }) => {
      await createUser(ctx.db, input);
    }),
  // TODO: The user id should be provided as otherwise it will update the current user when he want's to change another user's profile image
  setProfileImage: protectedProcedure
    .input(
      z.object({
        // Max image size of 256KB, only png and jpeg are allowed
        image: z
          .string()
          .regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9/+]+=*$/g)
          .max(262144)
          .nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        columns: {
          id: true,
          image: true,
        },
        where: eq(users.id, ctx.session.user.id),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      await ctx.db
        .update(users)
        .set({
          image: input.image,
        })
        .where(eq(users.id, ctx.session.user.id));
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
      const user = await ctx.db.query.users.findFirst({
        columns: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
        },
        where: eq(users.id, input.userId),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),
  editProfile: publicProcedure
    .input(validation.user.editProfile)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        columns: { email: true },
        where: eq(users.id, input.id),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const emailDirty = input.email && user.email !== input.email;
      await ctx.db
        .update(users)
        .set({
          name: input.name,
          email: emailDirty === true ? input.email : undefined,
          emailVerified: emailDirty === true ? null : undefined,
        })
        .where(eq(users.id, input.id));
    }),
  delete: publicProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    await ctx.db.delete(users).where(eq(users.id, input));
  }),
  changePassword: protectedProcedure
    .input(validation.user.changePasswordApi)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      // Only admins can change other users' passwords
      if (!user.permissions.includes("admin") && user.id !== input.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Admins can change the password of other users without providing the previous password
      const isPreviousPasswordRequired = ctx.session.user.id === input.userId;

      if (isPreviousPasswordRequired) {
        const dbUser = await ctx.db.query.users.findFirst({
          columns: {
            id: true,
            password: true,
            salt: true,
          },
          where: eq(users.id, input.userId),
        });

        if (!dbUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const previousPasswordHash = await hashPassword(
          input.previousPassword,
          dbUser.salt ?? "",
        );
        const isValid = previousPasswordHash === dbUser.password;

        if (!isValid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Invalid password",
          });
        }
      }

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
