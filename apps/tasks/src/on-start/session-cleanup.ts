import { env } from "@homarr/auth/env";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { db, inArray } from "@homarr/db";
import { sessions, users } from "@homarr/db/schema";
import { supportedAuthProviders } from "@homarr/definitions";

const logger = createLogger({ module: "sessionCleanup" });

/**
 * Deletes sessions for users that have inactive auth providers.
 * Sessions from other providers are deleted so they can no longer be used.
 */
export async function cleanupSessionsAsync() {
  try {
    const currentAuthProviders = env.AUTH_PROVIDERS;

    const inactiveAuthProviders = supportedAuthProviders.filter((provider) => !currentAuthProviders.includes(provider));
    if (inactiveAuthProviders.length === 0) {
      logger.debug("No sessions to delete");
      return;
    }

    const subQuery = db.select({ id: users.id }).from(users).where(inArray(users.provider, inactiveAuthProviders));
    const deletedSessions = await db
      .delete(sessions)
      .where(inArray(sessions.userId, subQuery))
      .returning({ userId: sessions.userId });

    if (deletedSessions.length > 0) {
      logger.info("Deleted sessions for inactive providers", {
        count: deletedSessions.length,
      });
    } else {
      logger.debug("No sessions to delete");
    }
  } catch (error) {
    logger.error(new Error("Failed to clean up sessions", { cause: error }));
  }
}
