import { getServerSettingByKeyAsync, getServerSettingsAsync, updateServerSettingByKeyAsync } from "@homarr/db/queries";
import type { ServerSettings } from "@homarr/server-settings";
import { defaultServerSettingsKeys } from "@homarr/server-settings";
import { validation, z } from "@homarr/validation";

import { createTRPCRouter, onboardingProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { nextOnboardingStepAsync } from "./onboard/onboard-queries";

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
  initSettings: onboardingProcedure
    .requiresStep("settings")
    .input(validation.settings.init)
    .mutation(async ({ ctx, input }) => {
      await updateServerSettingByKeyAsync(ctx.db, "analytics", input.analytics);
      await updateServerSettingByKeyAsync(ctx.db, "crawlingAndIndexing", input.crawlingAndIndexing);
      await nextOnboardingStepAsync(ctx.db, undefined);
    }),
});
