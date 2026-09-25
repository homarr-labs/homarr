import { TRPCError } from "@trpc/server";

import { sendServerAnalyticsAsync } from "@homarr/analytics";
import { env } from "@homarr/common/env";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

export const analyticsRouter = createTRPCRouter({
  sendAnalytics: permissionRequiredProcedure.requiresPermission("admin").mutation(async () => {
    if (env.NO_EXTERNAL_CONNECTION) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "External connections are disabled" });
    }
    return { status: await sendServerAnalyticsAsync() };
  }),
});
