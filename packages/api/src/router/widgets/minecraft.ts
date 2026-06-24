import { z } from "zod/v4";

import { minecraftServerStatusRequestHandler } from "@homarr/request-handler/minecraft-server-status";

import { createTRPCRouter, publicProcedure } from "../../trpc";

const serverStatusInputSchema = z.object({
  domain: z.string().nonempty(),
  isBedrockServer: z.boolean(),
});
export const minecraftRouter = createTRPCRouter({
  getServerStatus: publicProcedure.input(serverStatusInputSchema).query(async ({ input }) => {
    const innerHandler = minecraftServerStatusRequestHandler.handler({
      isBedrockServer: input.isBedrockServer,
      domain: input.domain,
    });
    return await innerHandler.getDataAsync();
  }),
});
