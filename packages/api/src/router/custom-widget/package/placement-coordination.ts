import { TRPCError } from "@trpc/server";
import { parse } from "superjson";

import { isRecord } from "@homarr/common";
import { and, eq, inArray } from "@homarr/db";
import { customWidgetInstallations, items } from "@homarr/db/schema";

import { withWidgetInstallationLock } from "./coordination";
import { publishWidgetPackageChange } from "./events";
import type { PackageContext } from "./types";

interface PlacementChange {
  boardId?: string;
  itemId?: string;
  submittedItems?: readonly { kind: string; options: unknown }[];
}

function installationId(options: unknown) {
  if (typeof options === "string") {
    try {
      options = parse(options);
    } catch {
      return;
    }
  }
  if (isRecord(options) && typeof options.definitionId === "string") return options.definitionId;
}

function placementSnapshot(rows: { id: string; options: string; boardId: string }[]) {
  return JSON.stringify(rows.toSorted((a, b) => a.id.localeCompare(b.id)));
}

function placementConflict(): never {
  throw new TRPCError({ code: "CONFLICT", message: "A custom widget changed while saving. Reload and try again." });
}

/** Placement writes and package migrations share the same lease, including writes from the board editor. */
export async function withWidgetPlacementChange<T>(
  ctx: Pick<PackageContext, "db">,
  change: PlacementChange,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const readPlacements = async () => {
    if (!change.boardId && !change.itemId) return [];
    return ctx.db.query.items.findMany({
      columns: { id: true, options: true, boardId: true },
      where: and(
        eq(items.kind, "customApi"),
        change.boardId ? eq(items.boardId, change.boardId) : undefined,
        change.itemId ? eq(items.id, change.itemId) : undefined,
      ),
    });
  };
  const placements = await readPlacements();
  const candidates = new Set<string>();
  for (const item of [
    ...placements,
    ...(change.submittedItems ?? []).filter((submitted) => submitted.kind === "customApi"),
  ]) {
    const id = installationId(item.options);
    if (id) candidates.add(id);
  }
  if (!candidates.size) return operation(new AbortController().signal);
  const installations = await ctx.db.query.customWidgetInstallations.findMany({
    columns: { id: true, activeArtifactId: true },
    where: inArray(customWidgetInstallations.id, [...candidates]),
  });
  // v2 definitions deliberately retain their existing mutation path.
  if (!installations.length) return operation(new AbortController().signal);
  const ids = installations.map(({ id }) => id).toSorted();
  async function lock(index: number, signal?: AbortSignal): Promise<T> {
    const nextId = ids[index];
    if (nextId) return withWidgetInstallationLock(nextId, (nextSignal) => lock(index + 1, nextSignal), signal);
    const current = await ctx.db.query.customWidgetInstallations.findMany({
      columns: { id: true, activeArtifactId: true },
      where: inArray(customWidgetInstallations.id, ids),
    });
    // The request's configuration may have been authored against the previous schema. Do not
    // merge it over a migration that completed while this operation was waiting for its leases.
    if (
      current.length !== installations.length ||
      installations.some(
        (before) => current.find((after) => after.id === before.id)?.activeArtifactId !== before.activeArtifactId,
      )
    )
      placementConflict();
    if (placementSnapshot(await readPlacements()) !== placementSnapshot(placements)) placementConflict();
    signal?.throwIfAborted();
    const result = await operation(signal ?? new AbortController().signal);
    const updated = await readPlacements();
    for (const id of ids) {
      const changedIds = new Set<string>();
      for (const row of [...placements, ...updated]) {
        if (installationId(row.options) !== id) continue;
        const before = placements.find((previous) => previous.id === row.id);
        const after = updated.find((next) => next.id === row.id);
        if (before?.options !== after?.options) changedIds.add(row.id);
      }
      if (changedIds.size)
        await publishWidgetPackageChange({ installationId: id, itemIds: [...changedIds], kind: "bindings" });
    }
    return result;
  }
  return lock(0);
}
