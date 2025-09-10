import { logger } from "@homarr/log";
import { updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";

const localLogger = logger.child({ module: "invalidateUpdateCheckerCache" });

/**
 * Invalidates the update checker cache on startup to ensure fresh data.
 * It is important as we want to avoid showing pending updates after the update to latest version.
 */
export async function invalidateUpdateCheckerCacheAsync() {
  try {
    const handler = updateCheckerRequestHandler.handler({});
    await handler.invalidateAsync();
    localLogger.debug("Update checker cache invalidated");
  } catch (error) {
    localLogger.error(new Error("Failed to invalidate update checker cache", { cause: error }));
  }
}
