import { TRPCError } from "@trpc/server";

import { and, eq, handleTransactionsAsync } from "@homarr/db";
import { customWidgetStorage } from "@homarr/db/schema";

import { getBindingsDigest } from "./connections";
import { packageDigest } from "./records";
import type { ResolvedPackagePlacement } from "./records";
import type { PackageContext } from "./types";
import type { WidgetCollector, WidgetHistory } from "./collection-contracts";

export const collectorKey = (id: string) => `collector:${id}`;
export const historyKey = (id: string) => `history:${id}`;

export async function writeCollectionRecord(
  ctx: PackageContext,
  installationId: string,
  ownerKey: string,
  key: string,
  value: unknown,
) {
  const id = packageDigest([installationId, "system", key]);
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized) > 1_048_576)
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Collection record exceeds 1 MiB" });
  const row = { id, installationId, ownerKey, scope: "system", key, value: serialized, updatedAt: new Date() };
  await handleTransactionsAsync(ctx.db, {
    async handleAsync(database, schema) {
      await database.transaction(async (transaction) => {
        await transaction.delete(schema.customWidgetStorage).where(eq(schema.customWidgetStorage.id, id));
        await transaction.insert(schema.customWidgetStorage).values(row);
      });
    },
    handleSync(database) {
      database.transaction((transaction) => {
        transaction.delete(customWidgetStorage).where(eq(customWidgetStorage.id, id)).run();
        transaction.insert(customWidgetStorage).values(row).run();
      });
    },
  });
}

export async function getCollectorSourceDigest(
  ctx: PackageContext,
  resolved: ResolvedPackagePlacement,
  collector: WidgetCollector,
) {
  return packageDigest({
    connections: await getBindingsDigest(ctx, resolved.bindings),
    options: resolved.configuration,
    handler: collector.handler,
    server: resolved.artifact.server,
    descriptor: resolved.artifact.manifest.handlers[collector.handler],
    dependencies: resolved.artifact.dependencyLock,
    input: collector.input,
    path: collector.valuePath,
  });
}

export async function readCollectionRecord(ctx: PackageContext, installationId: string, key: string) {
  const row = await ctx.db.query.customWidgetStorage.findFirst({
    where: and(
      eq(customWidgetStorage.installationId, installationId),
      eq(customWidgetStorage.scope, "system"),
      eq(customWidgetStorage.key, key),
    ),
  });
  if (!row) return null;
  return JSON.parse(row.value) as unknown;
}

export function trimWidgetHistory(history: WidgetHistory, collector: WidgetCollector) {
  const earliest = Date.now() - collector.retentionDays * 86_400_000;
  history.samples = history.samples.filter(({ timestamp }) => timestamp >= earliest).slice(-collector.maximumPoints);
  while (history.samples.length && Buffer.byteLength(JSON.stringify(history)) > 950_000)
    history.samples.splice(0, Math.max(1, Math.floor(history.samples.length / 10)));
  return history;
}
