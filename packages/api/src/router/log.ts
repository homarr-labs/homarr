import { observable } from "@trpc/server/observable";

import type { LoggerMessage } from "@homarr/redis";
import { loggingChannel } from "@homarr/redis";

import { createTRPCRouter, publicProcedure } from "../trpc";
import { logger } from "@homarr/log";

export const logRouter = createTRPCRouter({
  subscribe: publicProcedure.subscription(() => {
    return observable<LoggerMessage>((emit) => {
      loggingChannel.subscribe((data) => {
        emit.next(data);
      });
      logger.info('A tRPC client has connected to the logging procedure');
    });
  }),
});
