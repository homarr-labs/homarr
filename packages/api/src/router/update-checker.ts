import { createSubPubChannel } from "@homarr/redis";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const updateCheckerRouter = createTRPCRouter({
  getAvailableUpdates: protectedProcedure.query(async () => {
    const channel = createSubPubChannel<{
      availableUpdates: { name: string | null; contentHtml?: string; url: string; tag_name: string }[];
    }>("homarr:update", {
      persist: true,
    });

    const data = await channel.getLastDataAsync();

    return data?.availableUpdates;
  }),
});
