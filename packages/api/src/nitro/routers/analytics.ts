import { ORPCError } from "@orpc/server";

import { authenticatedProcedure } from "../procedure";
import type { AnalyticsProcedureResources } from "./-analytics/resources";

export const analyticsImplementedPaths = ["analytics.sendAnalytics"] as const;
export const analyticsPendingPaths = [] as const;
export const analyticsBindingHeldPaths = ["analytics.sendAnalytics"] as const;

export function createAnalyticsProcedures(resources: AnalyticsProcedureResources) {
  return {
    sendAnalytics: authenticatedProcedure({
      path: "analytics.sendAnalytics",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    }).handler(async ({ context }) => {
      if (resources.noExternalConnection()) {
        throw new ORPCError("PRECONDITION_FAILED", { message: "External connections are disabled" });
      }
      return { status: await resources.analytics.sendServerAnalyticsAsync(context.db) };
    }),
  };
}
