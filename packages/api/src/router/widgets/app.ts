import { ApiError } from "../../procedure";
import { z } from "zod/v4";

import { getServerSettingByKeyAsync } from "@homarr/db/queries";
import { sendPingRequestAsync } from "@homarr/ping";

import { createApiRouter, publicProcedure } from "../../procedure";
import { AppRepository } from "../app";

export const appRouter = createApiRouter({
  ping: publicProcedure.input(z.object({ id: z.string() })).query(async ({ context, input }) => {
    const boardSettings = await getServerSettingByKeyAsync(context.db, "board");
    if (boardSettings.forceDisableStatus) {
      throw new ApiError({
        code: "FORBIDDEN",
        message: "Ping functionality is disabled by server settings",
      });
    }

    const repository = new AppRepository(context.db, context.session?.user ?? null);
    const app = await repository.getByIdAsync(input.id);

    if (!app) {
      throw new ApiError({
        code: "NOT_FOUND",
        message: "App not found",
      });
    }

    const pingUrl = app.pingUrl ?? app.href;

    if (!pingUrl) {
      throw new ApiError({
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
