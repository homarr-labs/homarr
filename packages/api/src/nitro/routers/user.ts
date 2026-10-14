import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { comparePasswordsAsync, hashPasswordAsync } from "@homarr/auth/security";
import type { Database } from "@homarr/db";
import type { SupportedAuthProvider } from "@homarr/definitions";
import { supportedAuthProviders } from "@homarr/definitions";
import { byIdSchema } from "@homarr/validation/common";
import {
  defaultHeaderPreferences,
  headerPreferencesMutationSchema,
  userByteUnitSystemSchema,
  userChangeColorSchemeSchema,
  userChangeHomeBoardsSchema,
  userChangePasswordApiSchema,
  userChangeSearchPreferencesSchema,
  userDdgBangsSchema,
  userEditProfileSchema,
  userEnableRightClickOnWidgetsSchema,
  userFirstDayOfWeekSchema,
  userPingIconsEnabledSchema,
  userPreferencesSchema,
  userPreferencesPatchSchema,
} from "@homarr/validation/user";

import { convertIntersectionToZodObject } from "../../schema-merger";
import type { SourceProcedureDescriptor } from "../procedure";
import type { SourceLeafPath } from "../port-map";
import { createPreferenceHelpers } from "./-identity/preferences";
import { identityProcedure } from "./-identity/projection";
import type { PreferenceProcedureResources, UserProcedureResources } from "./-identity/resources";

export const portedUserPaths = [
  "user.setProfileImage",
  "user.getAll",
  "user.selectable",
  "user.search",
  "user.getPreferences",
  "user.getById",
  "user.editProfile",
  "user.delete",
  "user.changePassword",
  "user.updatePreferences",
  "user.changeHomeBoards",
  "user.changeDefaultSearchEngine",
  "user.changeSearchPreferences",
  "user.changeColorScheme",
  "user.changeByteUnitSystem",
  "user.changeEnableRightClickOnWidgets",
  "user.changePingIconsEnabled",
  "user.changeHeaderPreferences",
  "user.changeDdgBangs",
  "user.changeFirstDayOfWeek",
  "user.completeTour",
  "user.resetTours",
  "user.getTourStatus",
] as const satisfies readonly SourceLeafPath[];

export const pendingUserPaths = [
  "user.initUser",
  "user.register",
  "user.create",
] as const satisfies readonly SourceLeafPath[];

type UserPath = (typeof portedUserPaths)[number];
type QueryPath = Extract<Extract<SourceProcedureDescriptor, { kind: "query" }>["path"], UserPath>;
type MutationPath = Extract<Extract<SourceProcedureDescriptor, { kind: "mutation" }>["path"], UserPath>;

const query = (path: QueryPath) =>
  identityProcedure({ path, kind: "query", access: { kind: "protected" }, demo: "guarded" });
const mutation = (path: MutationPath) =>
  identityProcedure({ path, kind: "mutation", access: { kind: "protected" }, demo: "guarded" });
const adminQuery = (path: QueryPath) =>
  identityProcedure({ path, kind: "query", access: { kind: "permission", permission: "admin" }, demo: "guarded" });

export const userPreferencesResponseSchema = userPreferencesSchema.extend({ userId: z.string() }).meta({
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

export function createUserPreferenceProcedures(resources: PreferenceProcedureResources) {
  const { getUserPreferencesAsync, updateUserPreferencesAsync } = createPreferenceHelpers(resources);
  const { eq } = resources.operators;
  return {
    getPreferences: query("user.getPreferences")
      .input(z.object({ userId: z.string().min(1).optional() }))
      .output(userPreferencesResponseSchema)
      .handler(({ context, input }) => getUserPreferencesAsync(context, input.userId ?? context.principal.user.id)),
    updatePreferences: mutation("user.updatePreferences")
      .input(
        z
          .strictObject({ userId: z.string().min(1).optional(), ...userPreferencesPatchSchema.shape })
          .refine((input) => Object.keys(input).some((key) => key !== "userId"), "Supply at least one preference")
          .meta({ minProperties: 1, not: { required: ["userId"], maxProperties: 1 } }),
      )
      .output(userPreferencesResponseSchema)
      .handler(({ context, input }) => {
        const { userId, ...patch } = input;
        return updateUserPreferencesAsync(context, userId ?? context.principal.user.id, patch);
      }),
    changeHomeBoards: mutation("user.changeHomeBoards")
      .input(convertIntersectionToZodObject(userChangeHomeBoardsSchema.and(z.object({ userId: z.string() }))))
      .output(z.void())
      .handler(async ({ context, input }) => {
        await updateUserPreferencesAsync(context, input.userId, {
          homeBoardId: input.homeBoardId,
          mobileHomeBoardId: input.mobileHomeBoardId,
        });
      }),
    changeDefaultSearchEngine: mutation("user.changeDefaultSearchEngine")
      .input(
        convertIntersectionToZodObject(
          userChangeSearchPreferencesSchema.omit({ openInNewTab: true }).and(z.object({ userId: z.string() })),
        ),
      )
      .output(z.void())
      .handler(async ({ context, input }) => {
        await updateUserPreferencesAsync(context, input.userId, {
          defaultSearchEngineId: input.defaultSearchEngineId,
          ddgBangs: input.ddgBangsEnabled,
        });
      }),
    changeSearchPreferences: mutation("user.changeSearchPreferences")
      .input(convertIntersectionToZodObject(userChangeSearchPreferencesSchema.and(z.object({ userId: z.string() }))))
      .output(z.void())
      .handler(async ({ context, input }) => {
        await updateUserPreferencesAsync(context, input.userId, {
          defaultSearchEngineId: input.defaultSearchEngineId,
          openSearchInNewTab: input.openInNewTab,
          ddgBangs: input.ddgBangsEnabled,
        });
      }),
    changeColorScheme: mutation("user.changeColorScheme")
      .input(userChangeColorSchemeSchema)
      .output(z.void())
      .handler(async ({ context, input }) => {
        await updateUserPreferencesAsync(context, context.principal.user.id, { colorScheme: input.colorScheme });
      }),
    changeByteUnitSystem: mutation("user.changeByteUnitSystem")
      .input(userByteUnitSystemSchema.and(byIdSchema))
      .output(z.void())
      .handler(async ({ context, input }) => {
        await updateUserPreferencesAsync(context, input.id, { byteUnitSystem: input.byteUnitSystem });
      }),
    changeEnableRightClickOnWidgets: mutation("user.changeEnableRightClickOnWidgets")
      .input(convertIntersectionToZodObject(userEnableRightClickOnWidgetsSchema.and(byIdSchema)))
      .output(z.void())
      .handler(async ({ context, input }) => {
        await updateUserPreferencesAsync(context, input.id, {
          enableRightClickOnWidgets: input.enableRightClickOnWidgets,
        });
      }),
    changePingIconsEnabled: mutation("user.changePingIconsEnabled")
      .input(userPingIconsEnabledSchema.and(byIdSchema))
      .handler(async ({ context, input }) => {
        await updateUserPreferencesAsync(context, input.id, { pingIconsEnabled: input.pingIconsEnabled });
      }),
    changeHeaderPreferences: mutation("user.changeHeaderPreferences")
      .input(z.object({ id: z.string(), headerPreferences: headerPreferencesMutationSchema }))
      .output(z.void())
      .handler(async ({ context, input }) => {
        await updateUserPreferencesAsync(context, input.id, { headerPreferences: input.headerPreferences });
      }),
    changeDdgBangs: mutation("user.changeDdgBangs")
      .input(convertIntersectionToZodObject(userDdgBangsSchema.and(byIdSchema)))
      .output(z.void())
      .handler(async ({ context, input }) => {
        await updateUserPreferencesAsync(context, input.id, { ddgBangs: input.ddgBangs });
      }),
    changeFirstDayOfWeek: mutation("user.changeFirstDayOfWeek")
      .input(convertIntersectionToZodObject(userFirstDayOfWeekSchema.and(byIdSchema)))
      .output(z.void())
      .handler(async ({ context, input }) => {
        await updateUserPreferencesAsync(context, input.id, { firstDayOfWeek: input.firstDayOfWeek });
      }),
    completeTour: mutation("user.completeTour")
      .input(z.object({ tour: z.enum(["manage", "board"]) }))
      .handler(async ({ context, input }) => {
        const columnByTour = { manage: { completedManageTour: true }, board: { completedBoardTour: true } };
        await context.db
          .update(resources.tables.users)
          .set(columnByTour[input.tour])
          .where(eq(resources.tables.users.id, context.principal.user.id));
      }),
    resetTours: mutation("user.resetTours").handler(async ({ context }) => {
      await context.db
        .update(resources.tables.users)
        .set({ completedManageTour: false, completedBoardTour: false })
        .where(eq(resources.tables.users.id, context.principal.user.id));
    }),
    getTourStatus: query("user.getTourStatus").handler(async ({ context }) => {
      if (context.demo.enabled) return { completedManageTour: true, completedBoardTour: true };
      const user = await context.db.query.users.findFirst({
        columns: { completedManageTour: true, completedBoardTour: true },
        where: eq(resources.tables.users.id, context.principal.user.id),
      });
      return {
        completedManageTour: user?.completedManageTour ?? false,
        completedBoardTour: user?.completedBoardTour ?? false,
      };
    }),
  };
}

export function createUserProcedures(resources: UserProcedureResources) {
  const { eq, and, inArray, like } = resources.operators;
  const selectUserSchema = resources.validation.selectUserSchema;
  const profileColumns = { id: true, name: true, image: true, email: true } as const;
  const detailColumns = {
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
  } as const;
  async function checkUsernameAlreadyTakenAndThrowAsync(
    db: Database,
    provider: SupportedAuthProvider,
    username: string,
    ignoreId?: string,
  ) {
    const user = await db.query.users.findFirst({
      where: and(eq(resources.tables.users.name, username), eq(resources.tables.users.provider, provider)),
    });
    if (!user || (ignoreId && user.id === ignoreId)) return;
    throw new ORPCError("CONFLICT", { message: "Username already taken" });
  }

  return {
    ...createUserPreferenceProcedures(resources),
    setProfileImage: mutation("user.setProfileImage")
      .input(
        z.object({
          userId: z.string(),
          image: z
            .string()
            .regex(/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9/+]+=*$/g)
            .max(350000)
            .nullable(),
        }),
      )
      .output(z.void())
      .handler(async ({ context, input }) => {
        if (context.principal.user.id !== input.userId && !context.principal.user.permissions.includes("admin")) {
          throw new ORPCError("FORBIDDEN", { message: "You are not allowed to change other users profile images" });
        }
        const user = await context.db.query.users.findFirst({
          columns: { id: true, image: true, provider: true },
          where: eq(resources.tables.users.id, input.userId),
        });
        if (!user) throw new ORPCError("NOT_FOUND", { message: "User not found" });
        await context.db
          .update(resources.tables.users)
          .set({ image: input.image })
          .where(eq(resources.tables.users.id, input.userId));
      }),
    getAll: adminQuery("user.getAll")
      .input(z.void())
      .output(z.array(selectUserSchema.pick({ id: true, name: true, email: true, emailVerified: true, image: true })))
      .handler(({ context }) =>
        context.db.query.users.findMany({
          columns: { id: true, name: true, email: true, emailVerified: true, image: true },
        }),
      ),
    selectable: query("user.selectable")
      .input(z.object({ providers: z.array(z.enum(supportedAuthProviders)).optional() }).optional())
      .output(z.array(selectUserSchema.pick(profileColumns)))
      .handler(({ context, input }) =>
        context.db.query.users.findMany({
          columns: profileColumns,
          where: input?.providers ? inArray(resources.tables.users.provider, input.providers) : undefined,
        }),
      ),
    search: adminQuery("user.search")
      .input(z.object({ query: z.string(), limit: z.number().min(1).max(100).default(10) }))
      .output(z.array(selectUserSchema.pick(profileColumns)))
      .handler(async ({ context, input }) => {
        const users = await context.db.query.users.findMany({
          columns: profileColumns,
          where: like(resources.tables.users.name, `%${input.query}%`),
          limit: input.limit,
        });
        return users.map((user) => ({ id: user.id, name: user.name ?? "", image: user.image, email: user.email }));
      }),
    getById: query("user.getById")
      .input(z.object({ userId: z.string() }))
      .output(selectUserSchema.pick(detailColumns))
      .handler(async ({ context, input }) => {
        if (context.principal.user.id !== input.userId && !context.principal.user.permissions.includes("admin")) {
          throw new ORPCError("FORBIDDEN", { message: "You are not allowed to view other users details" });
        }
        const user = await context.db.query.users.findFirst({
          columns: detailColumns,
          where: eq(resources.tables.users.id, input.userId),
        });
        if (!user) throw new ORPCError("NOT_FOUND", { message: "User not found" });
        return user;
      }),
    editProfile: mutation("user.editProfile")
      .input(userEditProfileSchema)
      .output(z.void())
      .handler(async ({ context, input }) => {
        if (context.principal.user.id !== input.id && !context.principal.user.permissions.includes("admin")) {
          throw new ORPCError("FORBIDDEN", { message: "You are not allowed to edit other users details" });
        }
        const user = await context.db.query.users.findFirst({
          columns: { name: true, email: true, provider: true },
          where: eq(resources.tables.users.id, input.id),
        });
        if (!user) throw new ORPCError("NOT_FOUND", { message: "User not found" });
        if (user.provider !== "credentials")
          throw new ORPCError("FORBIDDEN", {
            message: "Username and email can not be changed for users with external providers",
          });
        if (context.demo.enabled && input.name !== user.name)
          throw new ORPCError("FORBIDDEN", { message: "Username changes are disabled in demo mode" });
        await checkUsernameAlreadyTakenAndThrowAsync(context.db, "credentials", input.name, input.id);
        const emailDirty = input.email && user.email !== input.email;
        await context.db
          .update(resources.tables.users)
          .set({
            name: input.name,
            email: emailDirty === true ? input.email : undefined,
            emailVerified: emailDirty === true ? null : undefined,
          })
          .where(eq(resources.tables.users.id, input.id));
      }),
    delete: mutation("user.delete")
      .input(z.object({ userId: z.string() }))
      .output(z.void())
      .handler(async ({ context, input }) => {
        if (context.demo.enabled)
          throw new ORPCError("FORBIDDEN", { message: "User deletion is disabled in demo mode" });
        if (context.principal.user.id !== input.userId && !context.principal.user.permissions.includes("admin")) {
          throw new ORPCError("FORBIDDEN", { message: "You are not allowed to delete other users" });
        }
        await context.db.delete(resources.tables.users).where(eq(resources.tables.users.id, input.userId));
      }),
    changePassword: mutation("user.changePassword")
      .input(convertIntersectionToZodObject(userChangePasswordApiSchema))
      .output(z.void())
      .handler(async ({ context, input }) => {
        if (context.demo.enabled)
          throw new ORPCError("FORBIDDEN", { message: "Password changes are disabled in demo mode" });
        const user = context.principal.user;
        if (!user.permissions.includes("admin") && user.id !== input.userId)
          throw new ORPCError("NOT_FOUND", { message: "User not found" });
        const dbUser = await context.db.query.users.findFirst({
          columns: { id: true, password: true, provider: true },
          where: eq(resources.tables.users.id, input.userId),
        });
        if (!dbUser) throw new ORPCError("NOT_FOUND", { message: "User not found" });
        if (dbUser.provider !== "credentials")
          throw new ORPCError("FORBIDDEN", {
            message: "Password can not be changed for users with external providers",
          });
        const isPreviousPasswordRequired = user.id === input.userId;
        resources.logger.info("Changing user password", {
          actorId: user.id,
          targetUserId: input.userId,
          previousPasswordRequired: isPreviousPasswordRequired,
        });
        if (
          isPreviousPasswordRequired &&
          !(await comparePasswordsAsync(input.previousPassword, dbUser.password ?? ""))
        ) {
          throw new ORPCError("FORBIDDEN", { message: "Invalid password" });
        }
        const hashedPassword = await hashPasswordAsync(input.password);
        await context.db
          .update(resources.tables.users)
          .set({ password: hashedPassword })
          .where(eq(resources.tables.users.id, input.userId));
      }),
  };
}
