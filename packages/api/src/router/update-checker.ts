import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { getServerSettingByKeyAsync, updateServerSettingByKeyAsync } from "@homarr/db/queries";
import { selectUnseenReleases, updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";

import packageJson from "../../../../package.json";
import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

const logger = createLogger({ module: "updateCheckerRouter" });

interface WhatsNewRelease {
  tagName: string;
  name: string | null;
  publishedAt: Date;
  url: string;
  body: string;
}

interface WhatsNewResult {
  currentVersion: string;
  releases: WhatsNewRelease[];
}

const readRecentReleasesAsync = async () => {
  try {
    const handler = updateCheckerRequestHandler.handler({});
    const data = await handler.getDataAsync();
    return data.data.recentReleases;
  } catch (error) {
    logger.error(new Error("Failed to read the cached update check", { cause: error }));
    return [];
  }
};

export const updateCheckerRouter = createTRPCRouter({
  getAvailableUpdates: permissionRequiredProcedure.requiresPermission("admin").query(async () => {
    try {
      const handler = updateCheckerRequestHandler.handler({});
      const data = await handler.getDataAsync();
      return data.data.availableUpdates;
    } catch (error) {
      logger.error(new Error("Failed to read the cached update check", { cause: error }));
      return []; // An empty list hides the indicator without violating TanStack Query's data contract.
    }
  }),
  getWhatsNew: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ scope: z.enum(["unseen", "recent"]) }))
    .query(async ({ ctx, input }): Promise<WhatsNewResult> => {
      const currentVersion = packageJson.version;
      const settings = await getServerSettingByKeyAsync(ctx.db, "whatsNew");
      if (input.scope === "unseen" && !settings.enabled) return { currentVersion, releases: [] };

      const recentReleases = await readRecentReleasesAsync();
      let releases = recentReleases;
      if (input.scope === "unseen") {
        releases = selectUnseenReleases(recentReleases, currentVersion, settings.lastSeenVersion);
      }

      return {
        currentVersion,
        releases: releases.map((release) => ({
          tagName: release.tagName,
          name: release.name,
          publishedAt: release.publishedAt,
          url: release.url,
          body: release.body,
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
