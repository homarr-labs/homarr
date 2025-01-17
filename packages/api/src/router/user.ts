import { TRPCError } from "@trpc/server";

import { createSaltAsync, hashPasswordAsync } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { and, createId, eq, like } from "@homarr/db";
import { boards, groupMembers, groupPermissions, groups, invites, users } from "@homarr/db/schema";
import { selectUserSchema } from "@homarr/db/validationSchemas";
import { credentialsAdminGroup } from "@homarr/definitions";
import type { SupportedAuthProvider } from "@homarr/definitions";
import { logger } from "@homarr/log";
import { validation, z } from "@homarr/validation";

import { convertIntersectionToZodObject } from "../schema-merger";
import {
  createTRPCRouter,
  onboardingProcedure,
  permissionRequiredProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";
import { throwIfActionForbiddenAsync } from "./board/board-access";
import { throwIfCredentialsDisabled } from "./invite/checks";
import { nextOnboardingStepAsync } from "./onboard/onboard-queries";

export const userRouter = createTRPCRouter({
  initUser: onboardingProcedure
    .requiresStep("user")
    .input(validation.user.init)
    .mutation(async ({ ctx, input }) => {
      throwIfCredentialsDisabled();

      const userId = await createUserAsync(ctx.db, input);
      const groupId = createId();
      await ctx.db.insert(groups).values({
        id: groupId,
        name: credentialsAdminGroup,
        ownerId: userId,
      });
      await ctx.db.insert(groupPermissions).values({
        groupId,
        permission: "admin",
      });
      await ctx.db.insert(groupMembers).values({
        groupId,
        userId,
      });
      await nextOnboardingStepAsync(ctx.db, undefined);
    }),
  register: publicProcedure
    .input(validation.user.registrationApi)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
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

      const userId = await createUserAsync(ctx.db, input);

      if (input.groupIds.length >= 1) {
        await ctx.db.insert(groupMembers).values(input.groupIds.map((groupId) => ({ groupId, userId })));
      }
    }),
  setProfileImage: protectedProcedure
    .output(z.void())
    .meta({ openapi: { method: "PUT", path: "/api/users/profileImage", tags: ["users"], protect: true } })
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
    .output(z.array(selectUserSchema.pick({ id: true, name: true, email: true, emailVerified: true, image: true })))
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
  selectable: protectedProcedure
    .input(z.object({ excludeExternalProviders: z.boolean().default(false) }).optional())
    .output(z.array(selectUserSchema.pick({ id: true, name: true, image: true })))
    .meta({ openapi: { method: "GET", path: "/api/users/selectable", tags: ["users"], protect: true } })
    .query(({ ctx, input }) => {
      return ctx.db.query.users.findMany({
        columns: {
          id: true,
          name: true,
          image: true,
        },
        where: input?.excludeExternalProviders ? eq(users.provider, "credentials") : undefined,
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
    .output(z.array(selectUserSchema.pick({ id: true, name: true, image: true })))
    .meta({ openapi: { method: "POST", path: "/api/users/search", tags: ["users"], protect: true } })
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
  getById: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .output(
      selectUserSchema.pick({
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        provider: true,
        homeBoardId: true,
        mobileHomeBoardId: true,
        firstDayOfWeek: true,
        pingIconsEnabled: true,
        defaultSearchEngineId: true,
      }),
    )
    .meta({ openapi: { method: "GET", path: "/api/users/{userId}", tags: ["users"], protect: true } })
    .query(async ({ input, ctx }) => {
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
          mobileHomeBoardId: true,
          firstDayOfWeek: true,
          pingIconsEnabled: true,
          defaultSearchEngineId: true,
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
  editProfile: protectedProcedure
    .input(validation.user.editProfile)
    .output(z.void())
    .meta({ openapi: { method: "PUT", path: "/api/users/profile", tags: ["users"], protect: true } })
    .mutation(async ({ input, ctx }) => {
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
  delete: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .output(z.void())
    .meta({ openapi: { method: "DELETE", path: "/api/users/{userId}", tags: ["users"], protect: true } })
    .mutation(async ({ input, ctx }) => {
      // Only admins and user itself can delete a user
      if (ctx.session.user.id !== input.userId && !ctx.session.user.permissions.includes("admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to delete other users",
        });
      }

      await ctx.db.delete(users).where(eq(users.id, input.userId));
    }),
  changePassword: protectedProcedure
    .input(validation.user.changePasswordApi)
    .output(z.void())
    .meta({ openapi: { method: "PATCH", path: "/api/users/{userId}/changePassword", tags: ["users"], protect: true } })
    .mutation(async ({ ctx, input }) => {
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
  changeHomeBoards: protectedProcedure
    .input(convertIntersectionToZodObject(validation.user.changeHomeBoards.and(z.object({ userId: z.string() }))))
    .output(z.void())
    .meta({ openapi: { method: "PATCH", path: "/api/users/changeHome", tags: ["users"], protect: true } })
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

      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.userId), "view");

      await ctx.db
        .update(users)
        .set({
          homeBoardId: input.homeBoardId,
          mobileHomeBoardId: input.mobileHomeBoardId,
        })
        .where(eq(users.id, input.userId));
    }),
  changeDefaultSearchEngine: protectedProcedure
    .input(
      convertIntersectionToZodObject(validation.user.changeDefaultSearchEngine.and(z.object({ userId: z.string() }))),
    )
    .output(z.void())
    .meta({ openapi: { method: "PATCH", path: "/api/users/changeSearchEngine", tags: ["users"], protect: true } })
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
          defaultSearchEngineId: input.defaultSearchEngineId,
        })
        .where(eq(users.id, input.userId));
    }),
  changeColorScheme: protectedProcedure
    .input(validation.user.changeColorScheme)
    .output(z.void())
    .meta({ openapi: { method: "PATCH", path: "/api/users/changeScheme", tags: ["users"], protect: true } })
    .mutation(async ({ input, ctx }) => {
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
  getFirstDayOfWeekForUserOrDefault: publicProcedure.input(z.undefined()).query(async ({ ctx }) => {
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
    .input(convertIntersectionToZodObject(validation.user.firstDayOfWeek.and(validation.common.byId)))
    .output(z.void())
    .meta({ openapi: { method: "PATCH", path: "/api/users/firstDayOfWeek", tags: ["users"], protect: true } })
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

const createUserAsync = async (db: Database, input: Omit<z.infer<typeof validation.user.baseCreate>, "groupIds">) => {
  const salt = await createSaltAsync();
  const hashedPassword = await hashPasswordAsync(input.password, salt);

  const username = input.username.toLowerCase();

  const userId = createId();
  await db.insert(users).values({
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
