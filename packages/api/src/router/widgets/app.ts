import { observable } from "@trpc/server/observable";
import { z } from "zod";

import { pingUrlChannel } from "@homarr/redis";
import { pingRequestHandler } from "@homarr/request-handler/ping";

import { createTRPCRouter, publicProcedure } from "../../trpc";

export const appRouter = createTRPCRouter({
  updatedPing: publicProcedure
    .input(
      z.object({
        url: z.string(),
      }),
    )
    .subscription(async ({ input }) => {
      await pingUrlChannel.addAsync(input.url);
      const innerHandler = pingRequestHandler.handler({ url: input.url });

      return observable<{ url: string; statusCode: number; durationMs: number } | { url: string; error: string }>(
        (emit) => {
          // Run ping request in background
          void innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false }).then(({ data }) => {
            emit.next({ url: input.url, ...data });
          });

          const unsubscribe = innerHandler.subscribe((pingResponse) => {
            emit.next({
              url: input.url,
              ...pingResponse,
            });
          });

          return () => {
            unsubscribe();
            void pingUrlChannel.removeAsync(input.url);
          };
        },
      );
    }),
});
