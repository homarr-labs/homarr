import { TRPCError } from "@trpc/server";
import z from "zod/v4";

import { sendServerAnalyticsAsync, trackEvent } from "@homarr/analytics";
import { env } from "@homarr/common/env";
import { db } from "@homarr/db";
import { getServerSettingByKeyAsync } from "@homarr/db/queries";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure } from "../trpc";

const getInstanceId = async (): Promise<string | null> => {
  if (env.NO_EXTERNAL_CONNECTION) return null;
  const settings = await getServerSettingByKeyAsync(db, "analytics");
  if (!settings.enableGeneral) return null;
  return settings.instanceId;
};

export const analyticsRouter = createTRPCRouter({
  sendAnalytics: permissionRequiredProcedure.requiresPermission("admin").mutation(async () => {
    if (env.NO_EXTERNAL_CONNECTION) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "External connections are disabled" });
    }
    return { status: await sendServerAnalyticsAsync() };
  }),

  trackFeature: protectedProcedure
    .input(
      z.object({
        feature: z.string().max(128),
        properties: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const instanceId = await getInstanceId();
      if (!instanceId) return;

      trackEvent(instanceId, `feature:${input.feature}`, {
        ...input.properties,
        userId: ctx.session.user.id,
      });
    }),

  heartbeat: protectedProcedure.mutation(async ({ ctx }) => {
    const instanceId = await getInstanceId();
    if (!instanceId) return;

    trackEvent(instanceId, "user-active", {
      userId: ctx.session.user.id,
    });
  }),
});
