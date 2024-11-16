import { env } from "@homarr/auth/env.mjs";
import { NEVER } from "@homarr/cron-jobs-core/expressions";
import { db, eq, inArray } from "@homarr/db";
import { sessions, users } from "@homarr/db/schema/sqlite";
import { supportedAuthProviders } from "@homarr/definitions";
import { logger } from "@homarr/log";

import { createCronJob } from "../lib";

/**
 * Deletes sessions for users that have inactive auth providers.
 * Sessions from other providers are deleted so they can no longer be used.
 */
export const sessionCleanupJob = createCronJob("sessionCleanup", NEVER, {
  runOnStart: true,
}).withCallback(async () => {
  const currentAuthProviders = env.AUTH_PROVIDERS;

  const inactiveAuthProviders = supportedAuthProviders.filter((provider) => !currentAuthProviders.includes(provider));
  const subQuery = db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.provider, inactiveAuthProviders))
    .as("sq");
  const sessionsWithInactiveProviders = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .rightJoin(subQuery, eq(sessions.userId, subQuery.id));

  const userIds = sessionsWithInactiveProviders.map(({ userId }) => userId).filter((value) => value !== null);
  await db.delete(sessions).where(inArray(sessions.userId, userIds));

  if (sessionsWithInactiveProviders.length > 0) {
    logger.info(`Deleted sessions for inactive providers count=${userIds.length}`);
  } else {
    logger.debug("No sessions to delete");
  }
});
