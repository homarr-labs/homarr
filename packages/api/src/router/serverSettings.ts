import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq, inArray } from "@homarr/db";
import {
  getServerSettingByKeyAsync,
  getServerSettingsAsync,
  insertServerSettingByKeyAsync,
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
const brandingServerSettingsUpdateSchema = brandingServerSettingsSchema.partial().extend({
  authBranding: authBrandingSchema.partial().optional(),
});
const legacyAuthBrandingUpdateSchema = z.object({
  showCustomAppNameOnLogin: z.boolean().optional(),
  showCustomLogoOnLogin: z.boolean().optional(),
  showCustomGreetingOnLogin: z.boolean().optional(),
});
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
      openapi: { method: "GET", path: "/api/settings/board", tags: ["settings"], protect: true },
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
      openapi: { method: "PATCH", path: "/api/settings/board", tags: ["settings"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Update global board defaults. Requires admin permission. Optional fields: homeBoardId, mobileHomeBoardId, enableStatusByDefault, forceDisableStatus. Home board IDs must reference public boards or be null",
      },
    })
    .input(boardServerSettingsUpdateSchema)
    .output(boardServerSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const inputBoardIds = [input.homeBoardId, input.mobileHomeBoardId].filter(
        (id) => id !== undefined && id !== null,
      );

      if (inputBoardIds.length > 0) {
        const publicBoards = await ctx.db.query.boards.findMany({
          columns: { id: true },
          where: and(inArray(boards.id, inputBoardIds), eq(boards.isPublic, true)),
        });
        const publicBoardIds = new Set(publicBoards.map((board) => board.id));
        const invalidBoardIds = inputBoardIds.filter((id) => !publicBoardIds.has(id));
        if (invalidBoardIds.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Board settings home board IDs must reference public boards: ${invalidBoardIds.join(", ")}`,
          });
        }
      }

      const current = await getServerSettingByKeyAsync(ctx.db, "board");
      const next = { ...current, ...input };
      const existing = await ctx.db.query.serverSettings.findFirst({
        where: eq(serverSettings.settingKey, "board"),
      });

      if (existing) {
        await updateServerSettingByKeyAsync(ctx.db, "board", next);
      } else {
        await insertServerSettingByKeyAsync(ctx.db, "board", next);
      }

      return next;
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
      const current = await getServerSettingByKeyAsync(ctx.db, input.settingsKey);
      await updateServerSettingByKeyAsync(ctx.db, input.settingsKey, {
        ...current,
        ...input.value,
      } as ServerSettings[typeof input.settingsKey]);
    }),
});
