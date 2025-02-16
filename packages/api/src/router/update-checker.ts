import { formatError } from "pretty-print-error";

import { logger } from "@homarr/log";
import { updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

export const updateCheckerRouter = createTRPCRouter({
  getAvailableUpdates: permissionRequiredProcedure.requiresPermission("admin").query(async () => {
    try {
      const handler = updateCheckerRequestHandler.handler({});
      const data = await handler.getCachedOrUpdatedDataAsync({});
      return data.data.availableUpdates;
    } catch (error) {
      logger.error(`Failed to get available updates\n${formatError(error)}`);
      return undefined; // We return undefined to not show the indicator in the UI
    }
  }),
});
