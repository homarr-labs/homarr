import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { Database } from "@homarr/db";
import { and, eq, inArray } from "@homarr/db";
import {
  getServerSettingByKeyAsync,
  getServerSettingsAsync,
  insertServerSettingByKeyAsync,
  updateAnalyticsServerSettingAsync,
  updateServerSettingByKeyAsync,
} from "@homarr/db/queries";
import { boards, serverSettings } from "@homarr/db/schema";
import type { ServerSettings } from "@homarr/server-settings";
import {
  authBrandingSchema,
  brandingServerSettingsSchema,
  defaultServerSettingsKeys,
  parseBrandingSettings,
} from "@homarr/server-settings";

import { createTRPCRouter, permissionRequiredProcedure, publicProcedure } from "../trpc";

const boardServerSettingsSchema = z.object({
  homeBoardId: z.string().nullable(),
  mobileHomeBoardId: z.string().nullable(),
  enableStatusByDefault: z.boolean(),
  forceDisableStatus: z.boolean(),
}) satisfies z.ZodType<ServerSettings["board"]>;

const boardServerSettingsUpdateSchema = boardServerSettingsSchema.partial();
const analyticsServerSettingsUpdateSchema = z.object({ enableGeneral: z.boolean().optional() }).strict();
const brandingServerSettingsUpdateSchema = brandingServerSettingsSchema.partial().extend({
  authBranding: authBrandingSchema.partial().optional(),
});
const legacyAuthBrandingUpdateSchema = z.object({
  showCustomAppNameOnLogin: z.boolean().optional(),
  showCustomLogoOnLogin: z.boolean().optional(),
  showCustomGreetingOnLogin: z.boolean().optional(),
});

const saveBoardSettingsAsync = async (db: Database, input: unknown) => {
  const parsedInput = boardServerSettingsUpdateSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new TRPCError({ code: "BAD_REQUEST", cause: parsedInput.error, message: parsedInput.error.message });
  }

  const current = await getServerSettingByKeyAsync(db, "board");
  const parsedSettings = boardServerSettingsSchema.safeParse({ ...current, ...parsedInput.data });
  if (!parsedSettings.success) {
    throw new TRPCError({ code: "BAD_REQUEST", cause: parsedSettings.error, message: parsedSettings.error.message });
  }
  const next = parsedSettings.data;
  const boardIds = [next.homeBoardId, next.mobileHomeBoardId].filter((id) => id !== null);

  if (boardIds.length > 0) {
    const publicBoards = await db.query.boards.findMany({
      columns: { id: true },
      where: and(inArray(boards.id, boardIds), eq(boards.isPublic, true)),
    });
    const publicBoardIds = new Set(publicBoards.map((board) => board.id));
    const invalidBoardIds = boardIds.filter((id) => !publicBoardIds.has(id));
    if (invalidBoardIds.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Board settings home board IDs must reference public boards: ${invalidBoardIds.join(", ")}`,
      });
    }
  }

  const existing = await db.query.serverSettings.findFirst({
    where: eq(serverSettings.settingKey, "board"),
  });
  if (existing) {
    await updateServerSettingByKeyAsync(db, "board", next);
  } else {
    await insertServerSettingByKeyAsync(db, "board", next);
  }
  return next;
};

export const serverSettingsRouter = createTRPCRouter({
  getCulture: publicProcedure.query(async ({ ctx }) => {
    return await getServerSettingByKeyAsync(ctx.db, "culture");
  }),
  getAll: permissionRequiredProcedure.requiresPermission("admin").query(async ({ ctx }) => {
    return await getServerSettingsAsync(ctx.db);
  }),
  getBranding: publicProcedure
    .meta({
      mcp: { enabled: true, description: "Returns the public instance branding configuration." },
    })
    .query(async ({ ctx }) => {
      const branding = await getServerSettingByKeyAsync(ctx.db, "branding");
      return parseBrandingSettings(branding);
    }),
  getBoardSettings: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      openapi: {
        method: "GET",
        path: "/api/settings/board",
        tags: ["settings"],
        protect: true,
        summary: "Get global board settings",
        description:
          "Return instance desktop and mobile home board IDs and default status behavior. Requires admin permission.",
      },
      mcp: {
        enabled: true,
        description:
          "Get global board defaults, including desktop/mobile home board IDs and status behavior. Requires admin permission",
      },
    })
    .input(z.void())
    .output(boardServerSettingsSchema)
    .query(async ({ ctx }) => {
      return await getServerSettingByKeyAsync(ctx.db, "board");
    }),
  updateBoardSettings: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/settings/board",
        tags: ["settings"],
        protect: true,
        summary: "Update global board settings",
        description:
          "Update supplied instance board defaults and return the resulting settings. Home board IDs must reference public boards, or be null to clear the default. Requires admin permission.",
      },
      mcp: {
        enabled: true,
        description:
          "Update global board defaults. Requires admin permission. Optional fields: homeBoardId, mobileHomeBoardId, enableStatusByDefault, forceDisableStatus. Home board IDs must reference public boards or be null",
      },
    })
    .input(boardServerSettingsUpdateSchema)
    .output(boardServerSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      return await saveBoardSettingsAsync(ctx.db, input);
    }),
  saveSettings: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(
      z.object({
        settingsKey: z.enum(defaultServerSettingsKeys),
        value: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.settingsKey === "board") {
        await saveBoardSettingsAsync(ctx.db, input.value);
        return;
      }
      if (input.settingsKey === "branding") {
        const current = await getServerSettingByKeyAsync(ctx.db, "branding");
        const parsedInput = brandingServerSettingsUpdateSchema.parse(input.value);
        const legacyInput = legacyAuthBrandingUpdateSchema.parse(input.value);
        const authBranding = { ...current.authBranding };
        authBranding.showAppName = legacyInput.showCustomAppNameOnLogin ?? authBranding.showAppName;
        authBranding.showLogo = legacyInput.showCustomLogoOnLogin ?? authBranding.showLogo;
        authBranding.showGreeting = legacyInput.showCustomGreetingOnLogin ?? authBranding.showGreeting;
        Object.assign(authBranding, parsedInput.authBranding);
        const value = brandingServerSettingsSchema.parse({
          ...parseBrandingSettings(current),
          ...parsedInput,
          authBranding,
        });
        await updateServerSettingByKeyAsync(ctx.db, "branding", value);
        return;
      }
      if (input.settingsKey === "analytics") {
        const parsedInput = analyticsServerSettingsUpdateSchema.parse(input.value);
        await updateAnalyticsServerSettingAsync(ctx.db, (current) => ({ ...current, ...parsedInput }));
        return;
      }
      const current = await getServerSettingByKeyAsync(ctx.db, input.settingsKey);
      await updateServerSettingByKeyAsync(ctx.db, input.settingsKey, {
        ...current,
        ...input.value,
      } as ServerSettings[typeof input.settingsKey]);
    }),
});
