import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { Database } from "@homarr/db";
import { and, eq, inArray } from "@homarr/db";
import {
  getServerSettingByKeyAsync,
  getServerSettingsAsync,
  insertServerSettingByKeyAsync,
  updateServerSettingByKeyAsync,
} from "@homarr/db/queries";
import { boards, serverSettings } from "@homarr/db/schema";
import { defaultServerSettingsKeys } from "@homarr/server-settings";
import { serverSettingSchemas, serverSettingsSchema, settingsInitSchema } from "@homarr/validation/settings";

import { createTRPCRouter, onboardingProcedure, permissionRequiredProcedure, publicProcedure } from "../trpc";
import { nextOnboardingStepAsync } from "./onboard/onboard-queries";

const boardServerSettingsSchema = serverSettingSchemas.board;

const boardServerSettingsUpdateSchema = boardServerSettingsSchema.partial();

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
          "Get every server setting group at once (analytics, appearance, board, crawlingAndIndexing, culture, search, ...). Requires admin permission",
      },
    })
    .input(z.void())
    .output(serverSettingsSchema)
    .query(async ({ ctx }) => {
      return await getServerSettingsAsync(ctx.db);
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
      const current = await getServerSettingByKeyAsync(ctx.db, input.settingsKey);
      const value = serverSettingSchemas[input.settingsKey].partial().parse(input.value);

      if (input.settingsKey === "board") {
        await validateBoardHomeIdsAsync(ctx.db, boardServerSettingsUpdateSchema.parse(value));
      }

      await updateServerSettingByKeyAsync(ctx.db, input.settingsKey, {
        ...current,
        ...value,
      });
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
