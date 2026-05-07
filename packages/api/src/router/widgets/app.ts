import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";

import { getServerSettingByKeyAsync } from "@homarr/db/queries";
import { sendPingRequestAsync } from "@homarr/ping";
import { pingChannel, pingUrlChannel } from "@homarr/redis";

import { createTRPCRouter, publicProcedure } from "../../trpc";
import { AppRepository } from "../app";

export const appRouter = createTRPCRouter({
  ping: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const boardSettings = await getServerSettingByKeyAsync(ctx.db, "board");
    if (boardSettings.forceDisableStatus) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Ping functionality is disabled by server settings",
      });
    }

    const repository = new AppRepository(ctx.db, ctx.session?.user ?? null);
    const app = await repository.getByIdAsync(input.id);

    if (!app) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "App not found",
      });
    }

    const pingUrl = app.pingUrl ?? app.href;

    if (!pingUrl) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "No URL to ping configured for this app",
      });
    }

    const pingResult = await sendPingRequestAsync(pingUrl);

    return {
      url: pingUrl,
      ...pingResult,
    };
  }),
  updatedPing: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .subscription(async ({ ctx, input }) => {
      const boardSettings = await getServerSettingByKeyAsync(ctx.db, "board");
      if (boardSettings.forceDisableStatus) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Ping functionality is disabled by server settings",
        });
      }

      const repository = new AppRepository(ctx.db, ctx.session?.user ?? null);
      const app = await repository.getByIdAsync(input.id);

      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "App not found",
        });
      }

      const pingUrl = app.pingUrl ?? app.href;

      if (!pingUrl) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "No URL to ping configured for this app",
        });
      }

      await pingUrlChannel.addAsync(pingUrl);

      return observable<{ url: string; statusCode: number; durationMs: number } | { url: string; error: string }>(
        (emit) => {
          const unsubscribe = pingChannel.subscribe((message) => {
            // Only emit if same url
            if (message.url !== pingUrl) return;
            emit.next(message);
          });

          return () => {
            unsubscribe();
            void pingUrlChannel.removeAsync(pingUrl);
          };
        },
      );
    }),
});
