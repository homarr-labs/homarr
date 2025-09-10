import { logger } from "@homarr/log";
import { updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";

export async function invalidateUpdateCheckerCacheAsync() {
  try {
    const handler = updateCheckerRequestHandler.handler({});
    await handler.invalidateAsync();
  } catch (error) {
    logger.error(new Error("Failed to invalidate update checker cache", { cause: error }));
  }
}
