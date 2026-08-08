import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq, inArray } from "@homarr/db";
import {
  getServerSettingByKeyAsync,
  getServerSettingsAsync,
  mergeServerSettingByKeyAsync,
  updateServerSettingByKeyAsync,
} from "@homarr/db/queries";
import { boards } from "@homarr/db/schema";
import type { ServerSettings } from "@homarr/server-settings";
import { defaultServerSettingsKeys } from "@homarr/server-settings";
import { settingsInitSchema } from "@homarr/validation/settings";

import { createTRPCRouter, onboardingProcedure, permissionRequiredProcedure, publicProcedure } from "../trpc";
import { nextOnboardingStepAsync } from "./onboard/onboard-queries";

const boardServerSettingsSchema = z.object({
  homeBoardId: z.string().nullable(),
  mobileHomeBoardId: z.string().nullable(),
  enableAutomaticMobileLayout: z.boolean(),
  enableStatusByDefault: z.boolean(),
  forceDisableStatus: z.boolean(),
}) satisfies z.ZodType<ServerSettings["board"]>;

const boardServerSettingsUpdateSchema = boardServerSettingsSchema.partial();

export const serverSettingsRouter = createTRPCRouter({
  getCulture: publicProcedure.query(async ({ ctx }) => {
    return await getServerSettingByKeyAsync(ctx.db, "culture");
  }),
  getAll: permissionRequiredProcedure.requiresPermission("admin").query(async ({ ctx }) => {
    return await getServerSettingsAsync(ctx.db);
  }),
  getBoardSettings: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      openapi: { method: "GET", path: "/api/settings/board", tags: ["settings"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Get global board defaults, including desktop/mobile home board IDs, automatic mobile layout mode, and status behavior. Requires admin permission",
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
          "Update global board defaults. Requires admin permission. Optional fields: homeBoardId, mobileHomeBoardId, enableAutomaticMobileLayout, enableStatusByDefault, forceDisableStatus. Home board IDs must reference public boards returned by the public-board listing tool or API, using each board's id field, or be null",
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
      await mergeServerSettingByKeyAsync(ctx.db, "board", next, input);

      return await getServerSettingByKeyAsync(ctx.db, "board");
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
      const current = await getServerSettingByKeyAsync(ctx.db, input.settingsKey);
      const next = {
        ...current,
        ...input.value,
      } as ServerSettings[keyof ServerSettings];
      await mergeServerSettingByKeyAsync(ctx.db, input.settingsKey, next, input.value);
    }),
  initSettings: onboardingProcedure
    .requiresStep("settings")
    .input(settingsInitSchema)
    .mutation(async ({ ctx, input }) => {
      const currentAnalytics = await getServerSettingByKeyAsync(ctx.db, "analytics");
      await updateServerSettingByKeyAsync(ctx.db, "analytics", { ...currentAnalytics, ...input.analytics });
      await updateServerSettingByKeyAsync(ctx.db, "crawlingAndIndexing", input.crawlingAndIndexing);
      await nextOnboardingStepAsync(ctx.db, undefined);
    }),
});
