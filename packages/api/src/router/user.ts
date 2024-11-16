import { TRPCError } from "@trpc/server";

import { createSaltAsync, hashPasswordAsync } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { and, createId, eq, like, schema } from "@homarr/db";
import { invites, users } from "@homarr/db/schema/sqlite";
import type { SupportedAuthProvider } from "@homarr/definitions";
import { logger } from "@homarr/log";
import { validation, z } from "@homarr/validation";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { throwIfCredentialsDisabled } from "./invite/checks";

export const userRouter = createTRPCRouter({
  register: publicProcedure.input(validation.user.registrationApi).mutation(async ({ ctx, input }) => {
    throwIfCredentialsDisabled();
    const inviteWhere = and(eq(invites.id, input.inviteId), eq(invites.token, input.token));
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

    await checkUsernameAlreadyTakenAndThrowAsync(ctx.db, "credentials", input.username);

    await createUserAsync(ctx.db, input);

    // Delete invite as it's used
    await ctx.db.delete(invites).where(inviteWhere);
  }),
  create: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({ openapi: { method: "POST", path: "/api/users", tags: ["users"], protect: true } })
    .input(validation.user.create)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      throwIfCredentialsDisabled();
      await checkUsernameAlreadyTakenAndThrowAsync(ctx.db, "credentials", input.username);

      await createUserAsync(ctx.db, input);
    }),
  setProfileImage: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        // Max image size of 256KB, only png and jpeg are allowed
        image: z
          .string()
          .regex(/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9/+]+=*$/g)
          .max(262144)
          .nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Only admins can change other users profile images
      if (ctx.session.user.id !== input.userId && !ctx.session.user.permissions.includes("admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to change other users profile images",
        });
      }

      const user = await ctx.db.query.users.findFirst({
        columns: {
          id: true,
          image: true,
          provider: true,
        },
        where: eq(users.id, input.userId),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.provider !== "credentials") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Profile image can not be changed for users with external providers",
        });
      }

      await ctx.db
        .update(users)
        .set({
          image: input.image,
        })
        .where(eq(users.id, input.userId));
    }),
  getAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.void())
    .output(
      z.array(
        z.object({
          id: z.string(),
          name: z.string().nullable(),
          email: z.string().nullable(),
          emailVerified: z.date().nullable(),
          image: z.string().nullable(),
        }),
      ),
    )
    .meta({ openapi: { method: "GET", path: "/api/users", tags: ["users"], protect: true } })
    .query(({ ctx }) => {
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
  // Is protected because also used in board access / integration access forms
  selectable: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        image: true,
      },
    });
  }),
  search: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(
      z.object({
        query: z.string(),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input, ctx }) => {
      const dbUsers = await ctx.db.query.users.findMany({
        columns: {
          id: true,
          name: true,
          image: true,
        },
        where: like(users.name, `%${input.query}%`),
        limit: input.limit,
      });
      return dbUsers.map((user) => ({
        id: user.id,
        name: user.name ?? "",
        image: user.image,
      }));
    }),
  getById: protectedProcedure.input(z.object({ userId: z.string() })).query(async ({ input, ctx }) => {
    // Only admins can view other users details
    if (ctx.session.user.id !== input.userId && !ctx.session.user.permissions.includes("admin")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not allowed to view other users details",
      });
    }
    const user = await ctx.db.query.users.findFirst({
      columns: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        provider: true,
        homeBoardId: true,
        firstDayOfWeek: true,
        pingIconsEnabled: true,
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
  editProfile: protectedProcedure.input(validation.user.editProfile).mutation(async ({ input, ctx }) => {
    // Only admins can view other users details
    if (ctx.session.user.id !== input.id && !ctx.session.user.permissions.includes("admin")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not allowed to edit other users details",
      });
    }

    const user = await ctx.db.query.users.findFirst({
      columns: { email: true, provider: true },
      where: eq(users.id, input.id),
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    if (user.provider !== "credentials") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Username and email can not be changed for users with external providers",
      });
    }

    await checkUsernameAlreadyTakenAndThrowAsync(ctx.db, "credentials", input.name, input.id);

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
  delete: protectedProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    // Only admins and user itself can delete a user
    if (ctx.session.user.id !== input && !ctx.session.user.permissions.includes("admin")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not allowed to delete other users",
      });
    }

    await ctx.db.delete(users).where(eq(users.id, input));
  }),
  changePassword: protectedProcedure.input(validation.user.changePasswordApi).mutation(async ({ ctx, input }) => {
    const user = ctx.session.user;
    // Only admins can change other users' passwords
    if (!user.permissions.includes("admin") && user.id !== input.userId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const dbUser = await ctx.db.query.users.findFirst({
      columns: {
        id: true,
        password: true,
        salt: true,
        provider: true,
      },
      where: eq(users.id, input.userId),
    });

    if (!dbUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    if (dbUser.provider !== "credentials") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Password can not be changed for users with external providers",
      });
    }

    // Admins can change the password of other users without providing the previous password
    const isPreviousPasswordRequired = ctx.session.user.id === input.userId;

    logger.info(
      `User ${user.id} is changing password for user ${input.userId}, previous password is required: ${isPreviousPasswordRequired}`,
    );

    if (isPreviousPasswordRequired) {
      const previousPasswordHash = await hashPasswordAsync(input.previousPassword, dbUser.salt ?? "");
      const isValid = previousPasswordHash === dbUser.password;

      if (!isValid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid password",
        });
      }
    }

    const salt = await createSaltAsync();
    const hashedPassword = await hashPasswordAsync(input.password, salt);
    await ctx.db
      .update(users)
      .set({
        password: hashedPassword,
      })
      .where(eq(users.id, input.userId));
  }),
  changeHomeBoardId: protectedProcedure
    .input(validation.user.changeHomeBoard.and(z.object({ userId: z.string() })))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.session.user;
      // Only admins can change other users passwords
      if (!user.permissions.includes("admin") && user.id !== input.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const dbUser = await ctx.db.query.users.findFirst({
        columns: {
          id: true,
        },
        where: eq(users.id, input.userId),
      });

      if (!dbUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      await ctx.db
        .update(users)
        .set({
          homeBoardId: input.homeBoardId,
        })
        .where(eq(users.id, input.userId));
    }),
  changeColorScheme: protectedProcedure.input(validation.user.changeColorScheme).mutation(async ({ input, ctx }) => {
    await ctx.db
      .update(users)
      .set({
        colorScheme: input.colorScheme,
      })
      .where(eq(users.id, ctx.session.user.id));
  }),
  getPingIconsEnabledOrDefault: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      return false;
    }

    const user = await ctx.db.query.users.findFirst({
      columns: {
        id: true,
        pingIconsEnabled: true,
      },
      where: eq(users.id, ctx.session.user.id),
    });

    return user?.pingIconsEnabled ?? false;
  }),
  changePingIconsEnabled: protectedProcedure
    .input(validation.user.pingIconsEnabled.and(validation.common.byId))
    .mutation(async ({ input, ctx }) => {
      // Only admins can change other users ping icons enabled
      if (!ctx.session.user.permissions.includes("admin") && ctx.session.user.id !== input.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      await ctx.db
        .update(users)
        .set({
          pingIconsEnabled: input.pingIconsEnabled,
        })
        .where(eq(users.id, ctx.session.user.id));
    }),
  getFirstDayOfWeekForUserOrDefault: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      return 1 as const;
    }

    const user = await ctx.db.query.users.findFirst({
      columns: {
        id: true,
        firstDayOfWeek: true,
      },
      where: eq(users.id, ctx.session.user.id),
    });

    return user?.firstDayOfWeek ?? (1 as const);
  }),
  changeFirstDayOfWeek: protectedProcedure
    .input(validation.user.firstDayOfWeek.and(validation.common.byId))
    .mutation(async ({ input, ctx }) => {
      // Only admins can change other users first day of week
      if (!ctx.session.user.permissions.includes("admin") && ctx.session.user.id !== input.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const dbUser = await ctx.db.query.users.findFirst({
        columns: {
          id: true,
        },
        where: eq(users.id, input.id),
      });

      if (!dbUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      await ctx.db
        .update(users)
        .set({
          firstDayOfWeek: input.firstDayOfWeek,
        })
        .where(eq(users.id, ctx.session.user.id));
    }),
});

export const createUserAsync = async (db: Database, input: z.infer<typeof validation.user.create>) => {
  const salt = await createSaltAsync();
  const hashedPassword = await hashPasswordAsync(input.password, salt);

  const username = input.username.toLowerCase();

  const userId = createId();
  await db.insert(schema.users).values({
    id: userId,
    name: username,
    email: input.email,
    password: hashedPassword,
    salt,
  });
  return userId;
};

const checkUsernameAlreadyTakenAndThrowAsync = async (
  db: Database,
  provider: SupportedAuthProvider,
  username: string,
  ignoreId?: string,
) => {
  const user = await db.query.users.findFirst({
    where: and(eq(users.name, username.toLowerCase()), eq(users.provider, provider)),
  });

  if (!user) return;
  if (ignoreId && user.id === ignoreId) return;

  throw new TRPCError({
    code: "CONFLICT",
    message: "Username already taken",
  });
};
