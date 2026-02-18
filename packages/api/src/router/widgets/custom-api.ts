import { z } from "zod/v4";

import { encryptSecret } from "@homarr/common/server";
import { fetchCustomApiRequestHandler } from "@homarr/request-handler/custom-api-fetch";

import { createTRPCRouter, publicProcedure } from "../../trpc";

const fetchCustomApiInputSchema = z.object({
  url: z.string().nonempty(),
  method: z.string().nonempty(),
  headers: z.array(z.string()),
});

export const customApiRouter = createTRPCRouter({
  fetchURL: publicProcedure.input(fetchCustomApiInputSchema).query(async ({ input }) => {
    const innerHandler = fetchCustomApiRequestHandler.handler({
      url: input.url,
      method: input.method,
      headers: input.headers.map((header) => {
        const colonIndex = header.indexOf(":");
        if (colonIndex === -1) return header;
        const name = header.slice(0, colonIndex);
        const value = header.slice(colonIndex + 1).trim();
        return `${name}:${encryptSecret(value)}`;
      }),
    });
    return await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: true });
  }),
});
