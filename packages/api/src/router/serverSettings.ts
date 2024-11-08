import { getServerSettingByKeyAsync, getServerSettingsAsync, updateServerSettingByKeyAsync } from "@homarr/db/queries";
import type { ServerSettings } from "@homarr/server-settings";
import { defaultServerSettingsKeys } from "@homarr/server-settings";
import { z } from "@homarr/validation";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const serverSettingsRouter = createTRPCRouter({
  getCulture: publicProcedure.query(async ({ ctx }) => {
    return await getServerSettingByKeyAsync(ctx.db, "culture");
  }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await getServerSettingsAsync(ctx.db);
  }),
  saveSettings: protectedProcedure
    .input(
      z.object({
        settingsKey: z.enum(defaultServerSettingsKeys),
        value: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await updateServerSettingByKeyAsync(
        ctx.db,
        input.settingsKey,
        input.value as ServerSettings[keyof ServerSettings],
      );
    }),
});
