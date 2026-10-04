import { observable } from "@trpc/server/observable";
import z from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { logLevels } from "@homarr/core/infrastructure/logs/constants";
import type { LoggerMessage } from "@homarr/redis";
import { loggingChannel } from "@homarr/redis";
import { zodEnumFromArray } from "@homarr/validation/enums";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

const logger = createLogger({ module: "logRouter" });

type LogSubscriptionEvent =
  | { type: "history"; messages: LoggerMessage[] }
  | { type: "message"; message: LoggerMessage };

export const logRouter = createTRPCRouter({
  subscribe: permissionRequiredProcedure
    .requiresPermission("other-view-logs")
    .input(
      z.object({
        levels: z.array(zodEnumFromArray(logLevels)).default(["info"]),
      }),
    )
    .subscription(({ input }) => {
      return observable<LogSubscriptionEvent>((emit) => {
        let isClosed = false;
        let unsubscribe: (() => void) | null = null;
        let isHistoryLoaded = false;
        const bufferedMessages: LoggerMessage[] = [];

        const onMessage = (message: LoggerMessage) => {
          if (!input.levels.includes(message.level)) return;

          if (!isHistoryLoaded) {
            bufferedMessages.push(message);
            return;
          }

          emit.next({ type: "message", message });
        };

        void loggingChannel
          .subscribeAsync(onMessage)
          .then(async (unsubscribeFromLogging) => {
            if (isClosed) {
              unsubscribeFromLogging();
              return;
            }

            unsubscribe = unsubscribeFromLogging;
            logger.info("A tRPC client has connected to the logging procedure");

            const history = (await loggingChannel.getRecentAsync()).filter((message) =>
              input.levels.includes(message.level),
            );
            if (isClosed) return;

            emit.next({ type: "history", messages: history });

            const historyIds = new Set(history.map((message) => message.id));
            isHistoryLoaded = true;
            for (const message of bufferedMessages) {
              if (!historyIds.has(message.id)) {
                emit.next({ type: "message", message });
              }
            }
            bufferedMessages.length = 0;
          })
          .catch((error: unknown) => {
            unsubscribe?.();
            unsubscribe = null;
            if (!isClosed) {
              emit.error(error);
            }
          });

        return () => {
          isClosed = true;
          unsubscribe?.();
        };
      });
    }),
});
