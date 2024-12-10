import { updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const updateCheckerRouter = createTRPCRouter({
  getAvailableUpdates: protectedProcedure.query(async () => {
    const handler = updateCheckerRequestHandler.handler({});
    const data = await handler.getCachedOrUpdatedDataAsync({});
    return data.data.availableUpdates;
  }),
});
