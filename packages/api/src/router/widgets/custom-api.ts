import { z } from "zod";

import { fetchCustomApiRequestHandler } from "@homarr/request-handler/custom-api-fetch";

import { createTRPCRouter, publicProcedure } from "../../trpc";

const serverStatusInputSchema = z.object({
  url: z.string().nonempty(),
});

export const customApiRouter = createTRPCRouter({
  fetchURL: publicProcedure.input(serverStatusInputSchema).query(async ({ input }) => {
    const innerHandler = fetchCustomApiRequestHandler.handler({
      url: input.url,
    });
    return await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: true });
  }),
});
