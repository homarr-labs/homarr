import { eq } from "@homarr/db";
import { items } from "@homarr/db/schema";

import { withWidgetInstallationLock } from "./coordination";
import { publishWidgetPackageChange } from "./events";
import { parseBindings, parsePackagePlacement } from "./records";
import type { PackageContext } from "./types";

/** A shared connection can change the target of several installations; let their actions finish first. */
export async function withWidgetConnectionChange<T>(
  ctx: PackageContext,
  connectionId: string,
  change: () => Promise<T>,
) {
  const installations = await ctx.db.query.customWidgetInstallations.findMany();
  const placements = await ctx.db.query.items.findMany({ where: eq(items.kind, "customApi") });
  const affected = new Set(
    installations
      .filter((row) => Object.values(parseBindings(row.bindings)).includes(connectionId))
      .map(({ id }) => id),
  );
  const byInstallation = new Map<string, string[]>();
  for (const placement of placements) {
    const options = parsePackagePlacement(placement.options);
    if (!options) continue;
    const ids = byInstallation.get(options.definitionId) ?? [];
    ids.push(placement.id);
    byInstallation.set(options.definitionId, ids);
    if (Object.values(options.connectionBindings).includes(connectionId)) affected.add(options.definitionId);
  }
  const ids = [...affected].toSorted();
  async function lock(index: number, signal?: AbortSignal): Promise<T> {
    const id = ids[index];
    if (id) return withWidgetInstallationLock(id, (innerSignal) => lock(index + 1, innerSignal), signal);
    signal?.throwIfAborted();
    const result = await change();
    for (const installationId of ids)
      await publishWidgetPackageChange({
        installationId,
        itemIds: byInstallation.get(installationId) ?? [],
        kind: "bindings",
      });
    return result;
  }
  return lock(0);
}
