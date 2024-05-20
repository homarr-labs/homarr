import { observable } from "@trpc/server/observable";

import { pingChannel, pingUrlChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../../trpc";

export const appRouter = createTRPCRouter({
  ping: publicProcedure
    .input(
      z.object({
        url: z.string(),
      }),
    )
    .subscription(async ({ input }) => {
      await pingUrlChannel.addAsync(input.url);
      const response = await fetch(input.url);

      return observable<{ url: string; statusCode: number }>((emit) => {
        emit.next({
          url: input.url,
          statusCode: response.status,
        });

        pingChannel.subscribe((message) => {
          // Only emit if same url
          if (message.url !== input.url) return;
          emit.next(message);
        });

        return () => {
          void pingUrlChannel.removeAsync(input.url);
        };
      });
    }),
});
