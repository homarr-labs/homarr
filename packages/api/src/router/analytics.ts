import { ApiError } from "../procedure";

import { sendServerAnalyticsAsync } from "@homarr/analytics";
import { env } from "@homarr/common/env";

import { createApiRouter, permissionRequiredProcedure } from "../procedure";

export const analyticsRouter = createApiRouter({
  sendAnalytics: permissionRequiredProcedure.requiresPermission("admin").mutation(async () => {
    if (env.NO_EXTERNAL_CONNECTION) {
      throw new ApiError({ code: "PRECONDITION_FAILED", message: "External connections are disabled" });
    }
    return { status: await sendServerAnalyticsAsync() };
  }),
});
