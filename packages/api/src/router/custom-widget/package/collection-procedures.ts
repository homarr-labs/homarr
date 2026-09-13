import { widgetPackageAdminProcedure } from "./procedure";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { and, eq, inArray } from "@homarr/db";
import { customWidgetStorage } from "@homarr/db/schema";

import { publicProcedure } from "../../../trpc";
import { widgetCollectorSchema } from "./collection-contracts";
import { collectorKey, historyKey, readCollectionRecord, writeCollectionRecord } from "./collection-storage";
import { withWidgetInstallationLock } from "./coordination";
import { validatePackageHandlerInput } from "./invocations";
import { resolvePackagePlacement } from "./records";
import { readPackageHistory, widgetHistoryInputSchema } from "./history";

const admin = widgetPackageAdminProcedure;
export const packageCollectionProcedures = {
  collectors: admin.input(z.object({ itemId: z.string() })).query(async ({ ctx, input }) => {
    const resolved = await resolvePackagePlacement(ctx, input.itemId);
    const rows = await ctx.db.query.customWidgetStorage.findMany({
      where: and(
        eq(customWidgetStorage.installationId, resolved.installation.id),
        eq(customWidgetStorage.scope, "system"),
        eq(customWidgetStorage.ownerKey, input.itemId),
      ),
    });
    return rows.flatMap((row) => {
      if (!row.key.startsWith("collector:")) return [];
      const parsed = widgetCollectorSchema.safeParse(JSON.parse(row.value));
      if (!parsed.success) return [];
      return [parsed.data];
    });
  }),
  saveCollector: admin
    .input(
      widgetCollectorSchema
        .omit({ id: true, installationId: true, userId: true })
        .extend({ id: z.string().optional() }),
    )
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolvePackagePlacement(ctx, input.itemId);
      const handler = resolved.artifact.manifest.handlers[input.handler];
      if (handler?.kind !== "query")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a declared query handler" });
      validatePackageHandlerInput(handler, input.input);
      const id = input.id ?? createId();
      const collector = { ...input, id, installationId: resolved.installation.id, userId: ctx.session.user.id };
      await withWidgetInstallationLock(resolved.installation.id, async () => {
        if (input.id) {
          const previous = await readCollectionRecord(ctx, resolved.installation.id, collectorKey(id));
          if (widgetCollectorSchema.parse(previous).itemId !== input.itemId) throw new TRPCError({ code: "FORBIDDEN" });
        }
        await writeCollectionRecord(ctx, resolved.installation.id, input.itemId, collectorKey(id), collector);
      });
      return { id };
    }),
  removeCollector: admin
    .input(z.object({ itemId: z.string(), id: z.string(), discardHistory: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolvePackagePlacement(ctx, input.itemId);
      await withWidgetInstallationLock(resolved.installation.id, async () => {
        await ctx.db
          .delete(customWidgetStorage)
          .where(
            and(
              eq(customWidgetStorage.installationId, resolved.installation.id),
              eq(customWidgetStorage.ownerKey, input.itemId),
              eq(customWidgetStorage.scope, "system"),
              inArray(customWidgetStorage.key, [collectorKey(input.id), historyKey(input.id)]),
            ),
          );
      });
    }),
};

export const packageHistoryProcedures = {
  packageHistory: publicProcedure
    .input(widgetHistoryInputSchema.extend({ itemId: z.string() }))
    .query(async ({ ctx, input }) => readPackageHistory(ctx, await resolvePackagePlacement(ctx, input.itemId), input)),
};
