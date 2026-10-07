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
import { boards, serverSettings, searchEngines } from "@homarr/db/schema";
import {
  authBrandingSchema,
  boardServerSettingsSchema,
  serverSettingsSchema,
  serverSettingsPatchSchema,
  mergeServerSettings,
  brandingServerSettingsSchema,
  parseBrandingSettings,
} from "@homarr/server-settings";

import { createTRPCRouter, permissionRequiredProcedure, publicProcedure } from "../trpc";

const boardServerSettingsUpdateSchema = boardServerSettingsSchema.partial();

const analyticsServerSettingsUpdateSchema = z.object({ enableGeneral: z.boolean().optional() }).strict();
const brandingServerSettingsUpdateSchema = brandingServerSettingsSchema.partial().extend({
  authBranding: authBrandingSchema.partial().strict().optional(),
});
const legacyAuthBrandingUpdateSchema = z.object({
  showCustomAppNameOnLogin: z.boolean().optional(),
  showCustomLogoOnLogin: z.boolean().optional(),
  showCustomGreetingOnLogin: z.boolean().optional(),
});

const validateBoardHomeIdsAsync = async (
  db: Database,
  input: { homeBoardId?: string | null; mobileHomeBoardId?: string | null },
) => {
  const inputBoardIds = [input.homeBoardId, input.mobileHomeBoardId].filter((id) => id !== undefined && id !== null);

  if (inputBoardIds.length === 0) return;

  const publicBoards = await db.query.boards.findMany({
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
};

export const serverSettingsRouter = createTRPCRouter({
  getCulture: publicProcedure.query(async ({ ctx }) => {
    return await getServerSettingByKeyAsync(ctx.db, "culture");
  }),
  getAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      openapi: { method: "GET", path: "/api/settings", tags: ["settings"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Get every server setting group at once (analytics, appearance, board, branding, crawlingAndIndexing, culture, search, ...). Requires admin permission",
      },
    })
    .input(z.void())
    .output(serverSettingsSchema)
    .query(async ({ ctx }) => {
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
      await validateBoardHomeIdsAsync(ctx.db, input);

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
    .meta({
      openapi: { method: "PATCH", path: "/api/settings", tags: ["settings"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Update one server setting group. REQUIRED: settingsKey (for example 'appearance', 'culture', 'search' or 'board'), value (object which is merged into the current settings of that group). Requires admin permission",
      },
    })
    .input(
      z.discriminatedUnion("settingsKey", [
        z.object({ settingsKey: z.literal("analytics"), value: analyticsServerSettingsUpdateSchema }),
        z.object({
          settingsKey: z.literal("crawlingAndIndexing"),
          value: serverSettingsPatchSchema.shape.crawlingAndIndexing.unwrap(),
        }),
        z.object({ settingsKey: z.literal("board"), value: serverSettingsPatchSchema.shape.board.unwrap() }),
        z.object({ settingsKey: z.literal("user"), value: serverSettingsPatchSchema.shape.user.unwrap() }),
        z.object({ settingsKey: z.literal("appearance"), value: serverSettingsPatchSchema.shape.appearance.unwrap() }),
        z.object({
          settingsKey: z.literal("branding"),
          value: brandingServerSettingsUpdateSchema.extend(legacyAuthBrandingUpdateSchema.shape).strict(),
        }),
        z.object({ settingsKey: z.literal("culture"), value: serverSettingsPatchSchema.shape.culture.unwrap() }),
        z.object({ settingsKey: z.literal("search"), value: serverSettingsPatchSchema.shape.search.unwrap() }),
      ]),
    )
    .output(z.void())
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
        const existing = await ctx.db.query.serverSettings.findFirst({
          where: eq(serverSettings.settingKey, "branding"),
        });
        if (existing) await updateServerSettingByKeyAsync(ctx.db, "branding", value);
        else await insertServerSettingByKeyAsync(ctx.db, "branding", value);
        return;
      }
      if (input.settingsKey === "analytics") {
        const parsedInput = analyticsServerSettingsUpdateSchema.parse(input.value);
        await updateAnalyticsServerSettingAsync(ctx.db, (current) => ({ ...current, ...parsedInput }));
        return;
      }
      // Board defaults must point to public boards before any settings are persisted.
      if (input.settingsKey === "board") {
        await validateBoardHomeIdsAsync(ctx.db, boardServerSettingsUpdateSchema.parse(input.value));
      }

      const parsed = serverSettingsPatchSchema.safeParse({ [input.settingsKey]: input.value });
      if (!parsed.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: parsed.error.message, cause: parsed.error });
      }
      if (parsed.data.search?.defaultSearchEngineId) {
        const engine = await ctx.db.query.searchEngines.findFirst({
          columns: { id: true },
          where: eq(searchEngines.id, parsed.data.search.defaultSearchEngineId),
        });
        if (!engine) throw new TRPCError({ code: "BAD_REQUEST", message: "Search engine not found" });
      }
      const current = await getServerSettingsAsync(ctx.db);
      const merged = mergeServerSettings(current, parsed.data);
      const existing = await ctx.db.query.serverSettings.findFirst({
        where: eq(serverSettings.settingKey, input.settingsKey),
      });
      if (!existing) {
        await insertServerSettingByKeyAsync(ctx.db, input.settingsKey, merged[input.settingsKey]);
        return;
      }
      await updateServerSettingByKeyAsync(ctx.db, input.settingsKey, merged[input.settingsKey]);
    }),
});
