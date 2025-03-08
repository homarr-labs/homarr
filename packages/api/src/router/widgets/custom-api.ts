import { z } from "zod";

import { fetchCustomApiRequestHandler } from "@homarr/request-handler/custom-api-fetch";

import { createTRPCRouter, publicProcedure } from "../../trpc";

const serverStatusInputSchema = z.object({
  url: z.string().nonempty(),
  method: z.string().nonempty(),
  headerName: z.string(),
  headerValue: z.string(),
});

export const customApiRouter = createTRPCRouter({
  fetchURL: publicProcedure.input(serverStatusInputSchema).query(async ({ input }) => {
    const innerHandler = fetchCustomApiRequestHandler.handler({
      url: input.url,
      headerName: input.headerName,
      headerValue: input.headerValue,
    });
    return await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: true });
  }),
});
