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
import { colorSchemes } from "@homarr/definitions";
import type { ServerSettings } from "@homarr/server-settings";
import {
  authBrandingSchema,
  brandingServerSettingsSchema,
  defaultServerSettingsKeys,
  parseBrandingSettings,
} from "@homarr/server-settings";

import { supportedLanguages } from "@homarr/translation";

import { createTRPCRouter, permissionRequiredProcedure, publicProcedure } from "../trpc";

const boardServerSettingsSchema = z.object({
  homeBoardId: z.string().nullable(),
  mobileHomeBoardId: z.string().nullable(),
  enableStatusByDefault: z.boolean(),
  forceDisableStatus: z.boolean(),
}) satisfies z.ZodType<ServerSettings["board"]>;

const boardServerSettingsUpdateSchema = boardServerSettingsSchema.partial();

/**
 * Every setting group at once, as `getAll` returns it.
 *
 * The groups are described here rather than derived from the defaults so the documented REST
 * response stays an exact shape; `satisfies` keeps it in step with the stored settings.
 */
const serverSettingsOutputSchema = z.object({
  analytics: z.object({
    enableGeneral: z.boolean(),
    instanceId: z.string().nullable(),
    lastSuccessfulSnapshotAt: z.string().nullable(),
  }),
  crawlingAndIndexing: z.object({
    noIndex: z.boolean(),
    noFollow: z.boolean(),
    noTranslate: z.boolean(),
    noSiteLinksSearchBox: z.boolean(),
  }),
  board: boardServerSettingsSchema,
  user: z.object({ enableGravatar: z.boolean() }),
  appearance: z.object({ defaultColorScheme: z.enum(colorSchemes) }),
  branding: brandingServerSettingsSchema,
  culture: z.object({ defaultLocale: z.enum(supportedLanguages) }),
  search: z.object({ defaultSearchEngineId: z.string().nullable() }),
}) satisfies z.ZodType<ServerSettings>;

/**
 * The same groups as a patch, used by the configuration import.
 *
 * It is strict so that a document written for another version is rejected with the offending
 * key instead of being merged into the stored settings unnoticed.
 */
export const serverSettingsPatchSchema = z.strictObject({
  analytics: serverSettingsOutputSchema.shape.analytics.partial().optional(),
  crawlingAndIndexing: serverSettingsOutputSchema.shape.crawlingAndIndexing.partial().optional(),
  board: serverSettingsOutputSchema.shape.board.partial().optional(),
  user: serverSettingsOutputSchema.shape.user.partial().optional(),
  appearance: serverSettingsOutputSchema.shape.appearance.partial().optional(),
  branding: serverSettingsOutputSchema.shape.branding.partial().optional(),
  culture: serverSettingsOutputSchema.shape.culture.partial().optional(),
  search: serverSettingsOutputSchema.shape.search.partial().optional(),
});
const analyticsServerSettingsUpdateSchema = z.object({ enableGeneral: z.boolean().optional() }).strict();
const brandingServerSettingsUpdateSchema = brandingServerSettingsSchema.partial().extend({
  authBranding: authBrandingSchema.partial().optional(),
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
    .output(serverSettingsOutputSchema)
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
      z.object({
        settingsKey: z.enum(defaultServerSettingsKeys),
        value: z.record(z.string(), z.unknown()),
      }),
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
        await updateServerSettingByKeyAsync(ctx.db, "branding", value);
        return;
      }
      if (input.settingsKey === "analytics") {
        const parsedInput = analyticsServerSettingsUpdateSchema.parse(input.value);
        await updateAnalyticsServerSettingAsync(ctx.db, (current) => ({ ...current, ...parsedInput }));
        return;
      }
      // The remaining groups have no schema of their own, so the home board references of the
      // board group are the only part that still has to be checked before it is written
      if (input.settingsKey === "board") {
        await validateBoardHomeIdsAsync(ctx.db, boardServerSettingsUpdateSchema.parse(input.value));
      }

      const current = await getServerSettingByKeyAsync(ctx.db, input.settingsKey);
      await updateServerSettingByKeyAsync(ctx.db, input.settingsKey, {
        ...current,
        ...input.value,
      } as ServerSettings[typeof input.settingsKey]);
    }),
});
