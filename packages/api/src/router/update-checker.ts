import { updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

export const updateCheckerRouter = createTRPCRouter({
  getAvailableUpdates: permissionRequiredProcedure.requiresPermission("admin").query(async () => {
    const handler = updateCheckerRequestHandler.handler({});
    const data = await handler.getCachedOrUpdatedDataAsync({});
    return data.data.availableUpdates;
  }),
});
