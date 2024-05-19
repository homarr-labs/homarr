import SuperJSON from "superjson";

import { eq } from "@homarr/db";
import { serverSettings } from "@homarr/db/schema/sqlite";
import { logger } from "@homarr/log";
import type {
  defaultServerSettings,
  ServerSettings,
} from "@homarr/server-settings";
import { defaultServerSettingsKeys } from "@homarr/server-settings";
import { z } from "@homarr/validation";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const serverSettingsRouter = createTRPCRouter({
  // this must be public so anonymous users also get analytics
  getAnalytics: publicProcedure.query(async ({ ctx }) => {
    const setting = await ctx.db.query.serverSettings.findFirst({
      where: eq(serverSettings.settingKey, "analytics"),
    });

    if (!setting) {
      logger.info(
        "Server settings for analytics is currently undefined. Using default values instead. If this persists, there may be an issue with the server settings",
      );
      return {
        enableGeneral: true,
        enableIntegrationData: false,
        enableUserData: false,
        enableWidgetData: false,
      } as (typeof defaultServerSettings)["analytics"];
    }

    return SuperJSON.parse<(typeof defaultServerSettings)["analytics"]>(
      setting.value,
    );
  }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.query.serverSettings.findMany();

    const data = {} as ServerSettings;
    defaultServerSettingsKeys.forEach((key) => {
      const settingValue = settings.find((setting) => setting.settingKey === key)?.value;
      if (!settingValue) {
        return;
      }
      data[key] = SuperJSON.parse(settingValue);
    });
    return data;
  }),
  saveSettings: protectedProcedure
    .input(
      z.object({
        settingsKey: z.enum(defaultServerSettingsKeys),
        value: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const databaseRunResult = await ctx.db
        .update(serverSettings)
        .set({
          value: SuperJSON.stringify(input.value),
        })
        .where(eq(serverSettings.settingKey, input.settingsKey));
      return databaseRunResult.changes === 1;
    }),
});
