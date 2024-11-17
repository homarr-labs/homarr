import { observable } from "@trpc/server/observable";

import { logger } from "@homarr/log";
import type { LoggerMessage } from "@homarr/redis";
import { loggingChannel } from "@homarr/redis";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

export const logRouter = createTRPCRouter({
  subscribe: permissionRequiredProcedure.requiresPermission("other-view-logs").subscription(() => {
    return observable<LoggerMessage>((emit) => {
      const unsubscribe = loggingChannel.subscribe((data) => {
        emit.next(data);
      });
      logger.info("A tRPC client has connected to the logging procedure");

      return () => {
        unsubscribe();
      };
    });
  }),
});
