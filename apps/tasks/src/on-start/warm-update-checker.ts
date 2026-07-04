import { createLogger } from "@homarr/core/infrastructure/logs";
import { updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";

const logger = createLogger({ module: "warmUpdateChecker" });

export async function warmUpdateCheckerAsync() {
  try {
    const handler = updateCheckerRequestHandler.handler({});
    await handler.getDataAsync();
    logger.debug("Update checker warmed");
  } catch (error) {
    logger.error(new Error("Failed to warm update checker", { cause: error }));
  }
}
