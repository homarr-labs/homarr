import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";

import type { ArchiveTeamWarriorStatus } from "@homarr/request-handler/archive-team-warrior";
import { archiveTeamWarriorRequestHandler } from "@homarr/request-handler/archive-team-warrior";

import { createTRPCRouter, publicProcedure } from "../../trpc";

const inputSchema = z.object({ url: z.string().url() });

export const archiveTeamWarriorRouter = createTRPCRouter({
  getStatus: publicProcedure.input(inputSchema).query(async ({ input }) => {
    const handler = archiveTeamWarriorRequestHandler.handler({ url: input.url });
    const { data, timestamp } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

    return {
      status: data,
      updatedAt: timestamp,
    };
  }),

  subscribeStatus: publicProcedure.input(inputSchema).subscription(({ input }) => {
    return observable<{ status: ArchiveTeamWarriorStatus; updatedAt: Date }>((emit) => {
      const handler = archiveTeamWarriorRequestHandler.handler({ url: input.url });
      const unsubscribe = handler.subscribe((status) => {
        emit.next({
          status,
          updatedAt: new Date(),
        });
      });

      return () => {
        unsubscribe();
      };
    });
  }),
});
