import { observable } from "@trpc/server/observable";

import { sendPingRequestAsync } from "@homarr/ping";
import { pingChannel, pingUrlChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../../trpc";

export const appRouter = createTRPCRouter({
  ping: publicProcedure.input(z.object({ url: z.string() })).query(async ({ input }) => {
    const pingResult = await sendPingRequestAsync(input.url);

    return {
      url: input.url,
      ...pingResult,
    };
  }),
  updatedPing: publicProcedure
    .input(
      z.object({
        url: z.string(),
      }),
    )
    .subscription(async ({ input }) => {
      await pingUrlChannel.addAsync(input.url);

      const pingResult = await sendPingRequestAsync(input.url);

      return observable<{ url: string; statusCode: number } | { url: string; error: string }>((emit) => {
        let isConnectionClosed = false;

        emit.next({ url: input.url, ...pingResult });
        pingChannel.subscribe((message) => {
          if (isConnectionClosed) return;

          // Only emit if same url
          if (message.url !== input.url) return;
          emit.next(message);
        });

        return () => {
          isConnectionClosed = true;
          void pingUrlChannel.removeAsync(input.url);
        };
      });
    }),
});
