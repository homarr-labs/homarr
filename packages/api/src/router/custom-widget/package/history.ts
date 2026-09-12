import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { widgetCollectorSchema } from "./collection-contracts";
import type { WidgetHistory } from "./collection-contracts";
import { collectorKey, getCollectorSourceDigest, historyKey, readCollectionRecord } from "./collection-storage";
import { authorizePackageHandler } from "./permissions";
import type { ResolvedPackagePlacement } from "./records";
import type { PackageContext } from "./types";

export const widgetHistoryInputSchema = z.object({
  collectorId: z.string(),
  from: z.number().optional(),
  to: z.number().optional(),
  maximumPoints: z.number().int().min(2).max(10_000).default(1000),
});

export async function readPackageHistory(
  ctx: PackageContext,
  resolved: ResolvedPackagePlacement,
  input: z.infer<typeof widgetHistoryInputSchema>,
) {
  if (resolved.preview) return { samples: [], unit: "", lastAttempt: 0 };
  const raw = await readCollectionRecord(ctx, resolved.installation.id, collectorKey(input.collectorId));
  const collector = widgetCollectorSchema.parse(raw);
  if (collector.itemId !== resolved.item.id) throw new TRPCError({ code: "FORBIDDEN" });
  await authorizePackageHandler(ctx, resolved, collector.handler, "query", collector.input);
  const history = (await readCollectionRecord(
    ctx,
    resolved.installation.id,
    historyKey(collector.id),
  )) as WidgetHistory | null;
  if (!history || history.sourceDigest !== (await getCollectorSourceDigest(ctx, resolved, collector)))
    return { samples: [], unit: collector.unit, lastAttempt: 0 };
  const earliest = Math.max(input.from ?? 0, Date.now() - collector.retentionDays * 86_400_000);
  const samples = history.samples
    .filter(({ timestamp }) => timestamp >= earliest && timestamp <= (input.to ?? Date.now()))
    .slice(-collector.maximumPoints);
  if (samples.length <= input.maximumPoints) return { ...history, samples };
  // Even sampling keeps the endpoints; authors needing aggregate buckets may query the full retained series.
  return {
    ...history,
    samples: Array.from(
      { length: input.maximumPoints },
      (_, index) => samples[Math.floor((index * (samples.length - 1)) / (input.maximumPoints - 1))],
    ).filter((sample) => sample !== undefined),
  };
}
