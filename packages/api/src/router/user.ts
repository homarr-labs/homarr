import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { comparePasswordsAsync, hashPasswordAsync } from "@homarr/auth";
import { isProviderEnabled } from "@homarr/auth/server";
import { createId } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import type { Database } from "@homarr/db";
import { and, eq, handleTransactionsAsync, inArray, like } from "@homarr/db";
import { getMaxGroupPositionAsync } from "@homarr/db/queries";
import { groupMembers, groupPermissions, groups, invites, onboarding, users } from "@homarr/db/schema";
import { selectUserSchema } from "@homarr/db/validationSchemas";
import type { SupportedAuthProvider } from "@homarr/definitions";
import { credentialsAdminGroup, supportedAuthProviders } from "@homarr/definitions";
import { byIdSchema } from "@homarr/validation/common";
import type { userBaseCreateSchema } from "@homarr/validation/user";
import {
  defaultHeaderPreferences,
  headerPreferencesMutationSchema,
  userByteUnitSystemSchema,
  userChangeColorSchemeSchema,
  userChangeHomeBoardsSchema,
  userChangePasswordApiSchema,
  userChangeSearchPreferencesSchema,
  userCreateSchema,
  userDdgBangsSchema,
  userEditProfileSchema,
  userEnableRightClickOnWidgetsSchema,
  userFirstDayOfWeekSchema,
  userInitSchema,
  userPingIconsEnabledSchema,
  userRegistrationApiSchema,
  userPreferencesSchema,
  userPreferencesPatchSchema,
} from "@homarr/validation/user";

import { convertIntersectionToZodObject } from "../schema-merger";
import {
  createTRPCRouter,
  isDemoMode,
  onboardingProcedure,
  permissionRequiredProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";
import { throwIfCredentialsDisabled } from "./invite/checks";
import { getUserPreferencesAsync, updateUserPreferencesAsync } from "./user/preferences";

const logger = createLogger({ module: "userRouter" });

const userPreferencesResponseSchema = userPreferencesSchema.extend({ userId: z.string() }).meta({
  id: "UserPreferences",
  example: {
    userId: "example-user",
    colorScheme: "light",
    byteUnitSystem: "binary",
    firstDayOfWeek: 0,
    pingIconsEnabled: true,
    enableRightClickOnWidgets: true,
    homeBoardId: null,
    mobileHomeBoardId: null,
    defaultSearchEngineId: null,
    openSearchInNewTab: true,
    ddgBangs: true,
    headerPreferences: defaultHeaderPreferences,
  },
});

export const userRouter = createTRPCRouter({
  initUser: onboardingProcedure
    .requiresStep("user")
    .input(userInitSchema)
    .mutation(async ({ ctx, input }) => {
      throwIfCredentialsDisabled();
      await checkUsernameAlreadyTakenAndThrowAsync(ctx.db, "credentials", input.username);

      const maxPosition = await getMaxGroupPositionAsync(ctx.db);
      const hashedPassword = await hashPasswordAsync(input.password);
      const userId = createId();
      const groupId = createId();
      const userRow = {
        id: userId,
        name: input.username,
        email: input.email,
        password: hashedPassword,
      };
      const groupRow = {
        id: groupId,
        name: credentialsAdminGroup,
        ownerId: userId,
        position: maxPosition + 1,
      };
      const nextStep = isProviderEnabled("ldap") || isProviderEnabled("oidc") ? "group" : "setup";

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            await transaction.insert(schema.users).values(userRow);
            await transaction.insert(schema.groups).values(groupRow);
            await transaction.insert(schema.groupPermissions).values({ groupId, permission: "admin" });
            await transaction.insert(schema.groupMembers).values({ groupId, userId });
            await transaction.update(schema.onboarding).set({ previousStep: "user", step: nextStep });
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            transaction.insert(users).values(userRow).run();
            transaction.insert(groups).values(groupRow).run();
            transaction.insert(groupPermissions).values({ groupId, permission: "admin" }).run();
            transaction.insert(groupMembers).values({ groupId, userId }).run();
            transaction.update(onboarding).set({ previousStep: "user", step: nextStep }).run();
          });
        },
      });
    }),
  register: publicProcedure
    .input(userRegistrationApiSchema)
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

      const hashedPassword = await hashPasswordAsync(input.password);

      const userId = createId();
      const user = {
        id: userId,
        name: input.username,
        password: hashedPassword,
      };

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (trx) => {
            await trx.insert(schema.users).values(user);

            // Delete invite as it's used
            const queryResult = await trx.delete(schema.invites).where(inviteWhere);
            const count = queryResult.rowCount ?? 0;
            if (count === 0) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Invalid invite",
              });
            }
          });
        },
        handleSync(db) {
          db.transaction((trx) => {
            trx.insert(users).values(user).run();
            // Delete invite as it's used
            const result = trx.delete(invites).where(inviteWhere).run();

            if (result.changes === 0) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Invalid invite",
              });
            }
          });
        },
      });
    }),
  create: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
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
    })
    .input(convertIntersectionToZodObject(userCreateSchema))
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
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/users/profileImage",
        tags: ["users"],
        protect: true,
        summary: "Set a profile image",
        description:
          "Set a user's image to a base64 PNG, JPEG, GIF, or WebP data URL, or null to clear it. The data URL is limited to 350,000 characters. Users can update themselves; updating another user requires admin permission.",
      },
    })
    .input(
      z.object({
        userId: z.string(),
        image: z
          .string()
          .regex(/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9/+]+=*$/g)
          .max(350000) // approximately 256 KiB in base64 (256 * 1024 * 4 / 3 + prefixes)
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
        selectUserSchema.pick({
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
        }),
      ),
    )
    .meta({
      openapi: {
        method: "GET",
        path: "/api/users",
        tags: ["users"],
        protect: true,
        summary: "List all users",
        description:
          "Return user IDs, names, email addresses, verification dates, and profile images. Requires admin permission.",
      },
      mcp: { enabled: true, description: "List all users (admin only)" },
    })
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
    .input(z.object({ providers: z.array(z.enum(supportedAuthProviders)).optional() }).optional())
    .output(
      z.array(
        selectUserSchema.pick({
          id: true,
          name: true,
          image: true,
          email: true,
        }),
      ),
    )
    .meta({
      openapi: {
        method: "GET",
        path: "/api/users/selectable",
        tags: ["users"],
        protect: true,
        summary: "List selectable users",
        description:
          "Return user IDs, names, profile images, and email addresses for selection controls, optionally filtered by authentication provider. Requires authentication.",
      },
    })
    .query(({ ctx, input }) => {
      return ctx.db.query.users.findMany({
        columns: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
        where: input?.providers ? inArray(users.provider, input.providers) : undefined,
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
    .output(
      z.array(
        selectUserSchema.pick({
          id: true,
          name: true,
          image: true,
          email: true,
        }),
      ),
    )
    .meta({
      openapi: {
        method: "POST",
        path: "/api/users/search",
        tags: ["users"],
        protect: true,
        summary: "Search users",
        description:
          "Find users whose names contain the query. Returns IDs, names, profile images, and email addresses, with up to 100 results. Requires admin permission.",
      },
    })
    .query(async ({ input, ctx }) => {
      const dbUsers = await ctx.db.query.users.findMany({
        columns: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
        where: like(users.name, `%${input.query}%`),
        limit: input.limit,
      });
      return dbUsers.map((user) => ({
        id: user.id,
        name: user.name ?? "",
        image: user.image,
        email: user.email,
      }));
    }),
  getPreferences: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/users/preferences",
        tags: ["users"],
        protect: true,
        summary: "Get user preferences",
        description:
          "Read every preference as structured JSON. Omit userId for the current user; reading another user requires admin permission.",
      },
      mcp: {
        enabled: true,
        description:
          "Read all preferences, including color scheme, home boards, search behavior and structured header layout. Optional userId defaults to the current user; another user requires admin permission. Use user_updatePreferences to patch supplied fields.",
      },
    })
    .input(z.object({ userId: z.string().min(1).optional() }))
    .output(userPreferencesResponseSchema)
    .query(({ ctx, input }) => getUserPreferencesAsync(ctx, input.userId ?? ctx.session.user.id)),
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
        colorScheme: true,
        byteUnitSystem: true,
        firstDayOfWeek: true,
        pingIconsEnabled: true,
        enableRightClickOnWidgets: true,
        headerPreferences: true,
        defaultSearchEngineId: true,
        openSearchInNewTab: true,
        ddgBangs: true,
        completedManageTour: true,
        completedBoardTour: true,
      }),
    )
    .meta({
      openapi: {
        method: "GET",
        path: "/api/users/{userId}",
        tags: ["users"],
        protect: true,
        summary: "Get a user",
        description:
          "Return a user's profile, authentication provider, and preferences. Users can read themselves; reading another user requires admin permission.",
      },
      mcp: { enabled: true, description: "Get user details by user ID. REQUIRED: userId (string)" },
    })
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
          colorScheme: true,
          byteUnitSystem: true,
          firstDayOfWeek: true,
          pingIconsEnabled: true,
          enableRightClickOnWidgets: true,
          headerPreferences: true,
          defaultSearchEngineId: true,
          openSearchInNewTab: true,
          ddgBangs: true,
          completedManageTour: true,
          completedBoardTour: true,
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
    .input(userEditProfileSchema)
    .output(z.void())
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/users/profile",
        tags: ["users"],
        protect: true,
        summary: "Update a user profile",
        description:
          "Update a credentials account's username and email. Users can update themselves; updating another user requires admin permission. External-provider profiles cannot be edited, and username changes are disabled in demo mode.",
      },
    })
    .mutation(async ({ input, ctx }) => {
      // Only admins can view other users details
      if (ctx.session.user.id !== input.id && !ctx.session.user.permissions.includes("admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to edit other users details",
        });
      }

      const user = await ctx.db.query.users.findFirst({
        columns: { name: true, email: true, provider: true },
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

      if (isDemoMode && input.name !== user.name) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Username changes are disabled in demo mode",
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
    .meta({
      openapi: {
        method: "DELETE",
        path: "/api/users/{userId}",
        tags: ["users"],
        protect: true,
        summary: "Delete a user",
        description:
          "Delete a user account. Users can delete themselves; deleting another user requires admin permission. Disabled in demo mode.",
      },
      mcp: { enabled: true, description: "Delete a user by ID. REQUIRED: userId (string)" },
    })
    .mutation(async ({ input, ctx }) => {
      if (isDemoMode) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User deletion is disabled in demo mode",
        });
      }

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
    .input(convertIntersectionToZodObject(userChangePasswordApiSchema))
    .output(z.void())
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/users/{userId}/changePassword",
        tags: ["users"],
        protect: true,
        summary: "Change a user password",
        description:
          "Change a credentials account's password. Changing your own password requires the previous password, including for admins. Admins can reset another user's password without verifying their previous password. Disabled in demo mode.",
      },
    })
    .mutation(async ({ ctx, input }) => {
      if (isDemoMode) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Password changes are disabled in demo mode",
        });
      }

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

      logger.info("Changing user password", {
        actorId: ctx.session.user.id,
        targetUserId: input.userId,
        previousPasswordRequired: isPreviousPasswordRequired,
      });

      if (isPreviousPasswordRequired) {
        const isValid = await comparePasswordsAsync(input.previousPassword, dbUser.password ?? "");

        if (!isValid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Invalid password",
          });
        }
      }

      const hashedPassword = await hashPasswordAsync(input.password);
      await ctx.db
        .update(users)
        .set({
          password: hashedPassword,
        })
        .where(eq(users.id, input.userId));
    }),
  updatePreferences: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/users/preferences",
        tags: ["users"],
        protect: true,
        summary: "Update user preferences",
        description:
          "Update only supplied preferences and return the result. Omitted fields remain unchanged; null clears nullable references. Header fields and zones merge, while each supplied zone array replaces that zone. The complete merged header must retain unique items and account access. New board shortcuts must be accessible to the target user. Omit userId for yourself; another user requires admin permission. All validation completes before one write.",
      },
      mcp: {
        enabled: true,
        description:
          "Patch one or more user preferences and return the complete result. Read current values with user_getPreferences. All preference fields are optional; supply at least one. Omitted fields remain unchanged; null clears home-board/search-engine references. Header fields and zones merge; supplied zone arrays replace their zone and must preserve unique items and account access. Optional userId defaults to yourself; changing another user requires admin permission.",
      },
    })
    .input(
      z
        .strictObject({ userId: z.string().min(1).optional(), ...userPreferencesPatchSchema.shape })
        .refine((input) => Object.keys(input).some((key) => key !== "userId"), "Supply at least one preference")
        .meta({
          minProperties: 1,
          not: { required: ["userId"], maxProperties: 1 },
        }),
    )
    .output(userPreferencesResponseSchema)
    .mutation(({ ctx, input }) => {
      const { userId, ...patch } = input;
      return updateUserPreferencesAsync(ctx, userId ?? ctx.session.user.id, patch);
    }),
  changeHomeBoards: protectedProcedure
    .input(convertIntersectionToZodObject(userChangeHomeBoardsSchema.and(z.object({ userId: z.string() }))))
    .output(z.void())
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/users/changeHome",
        tags: ["users"],
        protect: true,
        summary: "Change user home boards",
        description:
          "Set or clear a user's desktop and mobile home boards. The caller must be able to view each selected board. Users can update themselves; updating another user requires admin permission.",
      },
    })
    .mutation(async ({ input, ctx }) => {
      await updateUserPreferencesAsync(ctx, input.userId, {
        homeBoardId: input.homeBoardId,
        mobileHomeBoardId: input.mobileHomeBoardId,
      });
    }),
  changeDefaultSearchEngine: protectedProcedure
    .input(
      convertIntersectionToZodObject(
        userChangeSearchPreferencesSchema.omit({ openInNewTab: true }).and(z.object({ userId: z.string() })),
      ),
    )
    .output(z.void())
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/users/changeSearchEngine",
        tags: ["users"],
        protect: true,
        deprecated: true,
        summary: "Change the default search engine",
        description:
          "Deprecated: use PATCH /api/users/search-preferences instead. Updates the default search engine and supplied DuckDuckGo bang preference while preserving the new-tab preference. Users can update themselves; updating another user requires admin permission.",
      },
    })
    .mutation(async ({ input, ctx }) => {
      await updateUserPreferencesAsync(ctx, input.userId, {
        defaultSearchEngineId: input.defaultSearchEngineId,
        ddgBangs: input.ddgBangsEnabled,
      });
    }),
  changeSearchPreferences: protectedProcedure
    .input(convertIntersectionToZodObject(userChangeSearchPreferencesSchema.and(z.object({ userId: z.string() }))))
    .output(z.void())
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/users/search-preferences",
        tags: ["users"],
        protect: true,
        summary: "Update search preferences",
        description:
          "Set a user's default search engine, new-tab behavior, and DuckDuckGo bang preference. Users can update themselves; updating another user requires admin permission.",
      },
    })
    .mutation(async ({ input, ctx }) => {
      await updateUserPreferencesAsync(ctx, input.userId, {
        defaultSearchEngineId: input.defaultSearchEngineId,
        openSearchInNewTab: input.openInNewTab,
        ddgBangs: input.ddgBangsEnabled,
      });
    }),
  changeColorScheme: protectedProcedure
    .input(userChangeColorSchemeSchema)
    .output(z.void())
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/users/changeScheme",
        tags: ["users"],
        protect: true,
        summary: "Change your color scheme",
        description: "Set the current user's preferred color scheme. Requires authentication.",
      },
    })
    .mutation(async ({ input, ctx }) => {
      await updateUserPreferencesAsync(ctx, ctx.session.user.id, { colorScheme: input.colorScheme });
    }),
  changeByteUnitSystem: protectedProcedure
    .input(userByteUnitSystemSchema.and(byIdSchema))
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      await updateUserPreferencesAsync(ctx, input.id, { byteUnitSystem: input.byteUnitSystem });
    }),
  changeEnableRightClickOnWidgets: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/users/right-click-widgets",
        tags: ["users"],
        protect: true,
        summary: "Change widget context menu behavior",
        description:
          "Enable or disable opening widget context menus with a right click for a user. Users can update themselves; updating another user requires admin permission.",
      },
    })
    .input(convertIntersectionToZodObject(userEnableRightClickOnWidgetsSchema.and(byIdSchema)))
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      await updateUserPreferencesAsync(ctx, input.id, { enableRightClickOnWidgets: input.enableRightClickOnWidgets });
    }),
  changePingIconsEnabled: protectedProcedure
    .input(userPingIconsEnabledSchema.and(byIdSchema))
    .mutation(async ({ input, ctx }) => {
      await updateUserPreferencesAsync(ctx, input.id, { pingIconsEnabled: input.pingIconsEnabled });
    }),
  changeHeaderPreferences: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/users/header-preferences",
        tags: ["users"],
        protect: true,
        summary: "Update header preferences",
        description:
          "Replace a user's header layout and display preferences. New board shortcuts must reference boards the target user can view; existing shortcuts may be retained. Users can update themselves; updating another user requires admin permission.",
      },
    })
    .input(z.object({ id: z.string(), headerPreferences: headerPreferencesMutationSchema }))
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      await updateUserPreferencesAsync(ctx, input.id, { headerPreferences: input.headerPreferences });
    }),
  changeDdgBangs: protectedProcedure
    .input(convertIntersectionToZodObject(userDdgBangsSchema.and(byIdSchema)))
    .output(z.void())
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/users/ddg-bangs",
        tags: ["users"],
        protect: true,
        deprecated: true,
        summary: "Change DuckDuckGo bang behavior",
        description:
          "Deprecated: use PATCH /api/users/search-preferences instead. Enable or disable DuckDuckGo bangs for a user. Users can update themselves; updating another user requires admin permission.",
      },
    })
    .mutation(async ({ input, ctx }) => {
      await updateUserPreferencesAsync(ctx, input.id, { ddgBangs: input.ddgBangs });
    }),
  changeFirstDayOfWeek: protectedProcedure
    .input(convertIntersectionToZodObject(userFirstDayOfWeekSchema.and(byIdSchema)))
    .output(z.void())
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/users/firstDayOfWeek",
        tags: ["users"],
        protect: true,
        summary: "Change the first day of the week",
        description:
          "Set a user's preferred first day of the week. Users can update themselves; updating another user requires admin permission.",
      },
    })
    .mutation(async ({ input, ctx }) => {
      await updateUserPreferencesAsync(ctx, input.id, { firstDayOfWeek: input.firstDayOfWeek });
    }),
  completeTour: protectedProcedure
    .input(z.object({ tour: z.enum(["manage", "board"]) }))
    .mutation(async ({ input, ctx }) => {
      const columnByTour = {
        manage: { completedManageTour: true },
        board: { completedBoardTour: true },
      } as const;

      await ctx.db.update(users).set(columnByTour[input.tour]).where(eq(users.id, ctx.session.user.id));
    }),
  resetTours: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(users)
      .set({
        completedManageTour: false,
        completedBoardTour: false,
      })
      .where(eq(users.id, ctx.session.user.id));
  }),
  getTourStatus: protectedProcedure.query(async ({ ctx }) => {
    if (isDemoMode) {
      return {
        completedManageTour: true,
        completedBoardTour: true,
      };
    }

    const user = await ctx.db.query.users.findFirst({
      columns: {
        completedManageTour: true,
        completedBoardTour: true,
      },
      where: eq(users.id, ctx.session.user.id),
    });

    return {
      completedManageTour: user?.completedManageTour ?? false,
      completedBoardTour: user?.completedBoardTour ?? false,
    };
  }),
});

const createUserAsync = async (db: Database, input: Omit<z.infer<typeof userBaseCreateSchema>, "groupIds">) => {
  const hashedPassword = await hashPasswordAsync(input.password);

  const userId = createId();
  await db.insert(users).values({
    id: userId,
    name: input.username,
    email: input.email,
    password: hashedPassword,
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
    where: and(eq(users.name, username), eq(users.provider, provider)),
  });

  if (!user) return;
  if (ignoreId && user.id === ignoreId) return;

  throw new TRPCError({
    code: "CONFLICT",
    message: "Username already taken",
  });
};
