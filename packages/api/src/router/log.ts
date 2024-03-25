import { observable } from "@trpc/server/observable";

import { loggingChannel } from "@homarr/redis";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const logRouter = createTRPCRouter({
  subscribe: publicProcedure.subscription(() => {
    return observable<string>((emit) => {
      loggingChannel.subscribe((data) => {
        emit.next(data.message);
      });
    });
  }),
});
