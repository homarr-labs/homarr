import { TRPCError } from "@trpc/server";

import { eq, handleTransactionsAsync } from "@homarr/db";
import { customWidgetInstallations } from "@homarr/db/schema";
import { getWidgetConnectionBindingNames, isWidgetConnectionCompatible } from "@homarr/custom-widgets/package";

import { publishWidgetPackageChange } from "./events";
import { getWidgetCollection } from "./portable-collection-records";
import {
  mapCollectionBindings,
  validateCollectionBindings,
  withCollectionInstallationLocks,
} from "./portable-collection-transfer";
import { getBoundConnection } from "./connections";
import { getPackagePlacements } from "./records";
import type { PackageContext } from "./types";

export async function setWidgetCollectionBindings(
  ctx: PackageContext,
  importId: string,
  bindings: Record<string, string>,
) {
  const initial = await getWidgetCollection(ctx, importId);
  return withCollectionInstallationLocks(
    initial.entries.map(({ id }) => id),
    async (signal) => {
      const collection = await getWidgetCollection(ctx, importId);
      await validateCollectionBindings(ctx, collection, bindings);
      const changes: { id: string; bindings: string; itemIds: string[] }[] = [];
      for (const entry of collection.entries) {
        if (!entry.manifest)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Widget '${entry.key}' has an invalid source draft. Repair it first.`,
          });
        const nextBindings = { ...entry.bindings };
        for (const name of Object.keys(entry.mapping)) {
          for (const key of Object.keys(nextBindings)) {
            if (key === name || key.startsWith(`${name}:`)) delete nextBindings[key];
          }
        }
        Object.assign(nextBindings, mapCollectionBindings(entry.mapping, bindings));
        for (const name of Object.keys(entry.mapping)) {
          const requirement = entry.requirements[name];
          if (!requirement)
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Widget '${entry.key}' no longer declares connection '${name}'. Review its package mapping.`,
            });
          for (const bindingName of getWidgetConnectionBindingNames(name, requirement, nextBindings)) {
            const connection = await getBoundConnection(ctx, nextBindings, bindingName);
            if (!isWidgetConnectionCompatible(requirement, connection.configuration))
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Widget '${entry.key}' connection '${name}' is incompatible with the selected shared connection`,
              });
          }
        }
        changes.push({
          id: entry.id,
          bindings: JSON.stringify(nextBindings),
          itemIds: (await getPackagePlacements(ctx, entry.id)).map(({ id }) => id),
        });
      }
      const updatedAt = new Date();
      await handleTransactionsAsync(ctx.db, {
        async handleAsync(database, schema) {
          await database.transaction(async (tx) => {
            for (const change of changes)
              await tx
                .update(schema.customWidgetInstallations)
                .set({ bindings: change.bindings, updatedAt })
                .where(eq(schema.customWidgetInstallations.id, change.id));
            signal.throwIfAborted();
          });
        },
        handleSync(database) {
          database.transaction((tx) => {
            for (const change of changes)
              tx.update(customWidgetInstallations)
                .set({ bindings: change.bindings, updatedAt })
                .where(eq(customWidgetInstallations.id, change.id))
                .run();
            signal.throwIfAborted();
          });
        },
      });
      for (const change of changes)
        await publishWidgetPackageChange({ installationId: change.id, itemIds: change.itemIds, kind: "bindings" });
      return getWidgetCollection(ctx, importId);
    },
  );
}
