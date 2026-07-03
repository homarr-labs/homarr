import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { getServerSettingByKeyAsync } from "@homarr/db/queries";
import { sendPingRequestAsync } from "@homarr/ping";

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
});
