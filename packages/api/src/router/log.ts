import { observable } from "@trpc/server/observable";
import z from "zod/v4";

import { logger } from "@homarr/log";
import { logLevels } from "@homarr/log/constants";
import type { LoggerMessage } from "@homarr/redis";
import { loggingChannel } from "@homarr/redis";
import { zodEnumFromArray } from "@homarr/validation/enums";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

export const logRouter = createTRPCRouter({
  subscribe: permissionRequiredProcedure
    .requiresPermission("other-view-logs")
    .input(
      z.object({
        levels: z.array(zodEnumFromArray(logLevels)).default(["info"]),
      }),
    )
    .subscription(({ input }) => {
      return observable<LoggerMessage>((emit) => {
        const unsubscribe = loggingChannel.subscribe((data) => {
          if (!input.levels.includes(data.level)) return;
          emit.next(data);
        });
        logger.info("A tRPC client has connected to the logging procedure");

        return () => {
          unsubscribe();
        };
      });
    }),
});
