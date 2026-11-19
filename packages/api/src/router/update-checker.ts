import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import { getServerSettingByKeyAsync, updateServerSettingByKeyAsync } from "@homarr/db/queries";
import { users } from "@homarr/db/schema";
import { selectUnseenReleases, updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";

import packageJson from "../../../../package.json";
import { createApiRouter, permissionRequiredProcedure } from "../procedure";

const logger = createLogger({ module: "updateCheckerRouter" });

const hasCompletedBoardTourAsync = async (db: Database, userId: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { completedBoardTour: true },
  });
  return user?.completedBoardTour === true;
};

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

export const updateCheckerRouter = createApiRouter({
  getAvailableUpdates: permissionRequiredProcedure.requiresPermission("admin").query(async () => {
    const { availableUpdates } = await readUpdateCheckAsync();
    return availableUpdates;
  }),
  getWhatsNew: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ scope: z.enum(["unseen", "recent"]) }))
    .query(async ({ context, input }) => {
      const currentVersion = packageJson.version;
      const settings = await getServerSettingByKeyAsync(context.db, "whatsNew");
      if (input.scope === "unseen" && !settings.enabled) return { currentVersion, releases: [] };
      if (input.scope === "unseen" && !(await hasCompletedBoardTourAsync(context.db, context.session.user.id))) {
        return { currentVersion, releases: [] };
      }

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
  markWhatsNewSeen: permissionRequiredProcedure.requiresPermission("admin").mutation(async ({ context }) => {
    const settings = await getServerSettingByKeyAsync(context.db, "whatsNew");
    await updateServerSettingByKeyAsync(context.db, "whatsNew", {
      ...settings,
      lastSeenVersion: packageJson.version,
    });
  }),
});
