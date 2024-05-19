import SuperJSON from "superjson";

import { eq } from "@homarr/db";
import { serverSettings } from "@homarr/db/schema/sqlite";
import type { ServerSettings } from "@homarr/server-settings";
import { defaultServerSettingsKeys } from "@homarr/server-settings";
import { z } from "@homarr/validation";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const serverSettingsRouter = createTRPCRouter({
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
