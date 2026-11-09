import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { getServerSettingByKeyAsync, updateServerSettingByKeyAsync } from "@homarr/db/queries";
import { selectUnseenReleases, updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";

import packageJson from "../../../../package.json";
import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

const logger = createLogger({ module: "updateCheckerRouter" });

const readUpdateCheckAsync = async () => {
  try {
    const handler = updateCheckerRequestHandler.handler({});
    const data = await handler.getDataAsync();
    return data.data;
  } catch (error) {
    logger.error(new Error("Failed to read the cached update check", { cause: error }));
    return { availableUpdates: [], recentReleases: [] };
  }
};

export const updateCheckerRouter = createTRPCRouter({
  getAvailableUpdates: permissionRequiredProcedure.requiresPermission("admin").query(async () => {
    const { availableUpdates } = await readUpdateCheckAsync();
    return availableUpdates;
  }),
  getWhatsNew: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ scope: z.enum(["unseen", "recent"]) }))
    .query(async ({ ctx, input }) => {
      const currentVersion = packageJson.version;
      const settings = await getServerSettingByKeyAsync(ctx.db, "whatsNew");
      if (input.scope === "unseen" && !settings.enabled) return { currentVersion, releases: [] };

      const { recentReleases } = await readUpdateCheckAsync();
      let releases = recentReleases;
      if (input.scope === "unseen") {
        releases = selectUnseenReleases(recentReleases, currentVersion, settings.lastSeenVersion);
      }

      return {
        currentVersion,
        releases: releases.map(({ tagName, name, publishedAt, url, body }) => ({
          tagName,
          name,
          publishedAt,
          url,
          body,
        })),
      };
    }),
  markWhatsNewSeen: permissionRequiredProcedure.requiresPermission("admin").mutation(async ({ ctx }) => {
    const settings = await getServerSettingByKeyAsync(ctx.db, "whatsNew");
    await updateServerSettingByKeyAsync(ctx.db, "whatsNew", {
      ...settings,
      lastSeenVersion: packageJson.version,
    });
  }),
});
