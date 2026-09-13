import { z } from "zod/v4";

import { publicProcedure } from "../../../trpc";
import { invokePackageHandler, packageOperationInputSchema, subscribePackageHandler } from "./invocations";
import { packageHistoryProcedures } from "./collection-procedures";
import { packageLifecycleProcedures } from "./lifecycle";
import { withWidgetInstallationLock } from "./coordination";
import { resolvePackagePlacement } from "./records";
import { readWidgetStorage, widgetStorageInputSchema, writeWidgetStorage } from "./storage";
import { getWidgetCapabilities } from "./capabilities";

export const packageWidgetProcedures = {
  ...packageLifecycleProcedures,
  ...packageHistoryProcedures,
  packageQuery: publicProcedure.input(packageOperationInputSchema).query(({ ctx, input, signal }) => {
    if (input.name === "$capabilities") return getWidgetCapabilities(ctx, input.itemId);
    return invokePackageHandler(ctx, input, "query", signal);
  }),
  packageAction: publicProcedure
    .input(packageOperationInputSchema)
    .mutation(({ ctx, input, signal }) => invokePackageHandler(ctx, input, "action", signal)),
  packageSubscription: publicProcedure
    .input(packageOperationInputSchema)
    .subscription(({ ctx, input, signal }) => subscribePackageHandler(ctx, input, signal)),
  packageStorageGet: publicProcedure
    .input(widgetStorageInputSchema)
    .query(async ({ ctx, input }) => readWidgetStorage(ctx, await resolvePackagePlacement(ctx, input.itemId), input)),
  packageStorageSet: publicProcedure
    .input(widgetStorageInputSchema.extend({ value: z.unknown() }))
    .mutation(async ({ ctx, input }) =>
      (async () => {
        const placement = await resolvePackagePlacement(ctx, input.itemId);
        return withWidgetInstallationLock(placement.installation.id, async () =>
          writeWidgetStorage(ctx, await resolvePackagePlacement(ctx, input.itemId), { ...input, value: input.value }),
        );
      })(),
    ),
};
