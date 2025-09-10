import { logger } from "@homarr/log";
import { updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";

const localLogger = logger.child({ module: "invalidateUpdateCheckerCache" });

export async function invalidateUpdateCheckerCacheAsync() {
  try {
    const handler = updateCheckerRequestHandler.handler({});
    await handler.invalidateAsync();
    localLogger.debug("Update checker cache invalidated");
  } catch (error) {
    localLogger.error(new Error("Failed to invalidate update checker cache", { cause: error }));
  }
}
