import { createLogger } from "@homarr/core/infrastructure/logs";
import { updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";

import { createApiRouter, permissionRequiredProcedure } from "../procedure";

const logger = createLogger({ module: "updateCheckerRouter" });

export const updateCheckerRouter = createApiRouter({
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
});
