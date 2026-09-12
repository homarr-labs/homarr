import { TRPCError } from "@trpc/server";

import { getCustomWidgetDefaultOptions } from "@homarr/custom-widgets/core";
import { customWidgetPackageSchema } from "@homarr/custom-widgets/package";

import { getInstallation, packageDigest, parseBindings, readPackageDraft } from "./records";
import { readInstalledWidgetCollection } from "./portable-collection-origin";
import type { InstalledWidgetCollection } from "./portable-collection-origin";
import type { PackageContext } from "./types";

export async function listWidgetCollections(ctx: PackageContext) {
  const rows = await ctx.db.query.customWidgetInstallations.findMany({
    columns: { id: true, origin: true, enabled: true, updatedAt: true },
  });
  const groups = new Map<
    string,
    {
      importId: string;
      manifest: InstalledWidgetCollection["manifest"];
      installationIds: string[];
      enabledCount: number;
      updatedAt: Date;
    }
  >();
  for (const row of rows) {
    const collection = readInstalledWidgetCollection(row.origin);
    if (!collection) continue;
    const group = groups.get(collection.importId) ?? {
      importId: collection.importId,
      manifest: collection.manifest,
      installationIds: [],
      enabledCount: 0,
      updatedAt: row.updatedAt,
    };
    group.installationIds.push(row.id);
    if (row.enabled) group.enabledCount++;
    if (row.updatedAt > group.updatedAt) group.updatedAt = row.updatedAt;
    groups.set(collection.importId, group);
  }
  return [...groups.values()];
}

export async function getWidgetCollection(ctx: PackageContext, importId: string) {
  const candidates = await ctx.db.query.customWidgetInstallations.findMany({
    columns: { id: true, origin: true },
  });
  const members = candidates.flatMap((row) => {
    const collection = readInstalledWidgetCollection(row.origin);
    if (collection?.importId !== importId) return [];
    return [{ id: row.id, collection }];
  });
  const first = members[0]?.collection;
  if (!first) throw new TRPCError({ code: "NOT_FOUND", message: "Widget collection import not found" });
  const entries = await Promise.all(
    members.map(async ({ id, collection }) => {
      const row = await getInstallation(ctx, id);
      const source = customWidgetPackageSchema.safeParse(readPackageDraft(row.draft));
      let configuration: Record<string, unknown> = { ...collection.options };
      if (source.success) configuration = { ...getCustomWidgetDefaultOptions(source.data.options), ...configuration };
      return {
        id,
        key: collection.key,
        name: row.name,
        draftDigest: packageDigest(row.draft),
        manifest: source.success ? source.data.manifest : null,
        optionDefinitions: source.success ? source.data.options : {},
        requirements: source.success ? source.data.connections : {},
        configuration,
        mapping: collection.mapping,
        bindings: parseBindings(row.bindings),
        enabled: row.enabled,
        activeArtifactId: row.activeArtifactId,
        managementPath: `/manage/custom-widgets/packages/${id}`,
      };
    }),
  );
  const values = new Map<string, Set<string>>();
  for (const entry of entries) {
    for (const [name, slot] of Object.entries(entry.mapping)) {
      const bindings = values.get(slot) ?? new Set<string>();
      const members = Object.entries(entry.bindings)
        .filter(([binding]) => binding === name || binding.startsWith(`${name}:`))
        .map(([binding, id]) => [binding.slice(name.length), id])
        .toSorted(([left], [right]) => (left ?? "").localeCompare(right ?? ""));
      bindings.add(JSON.stringify(members));
      values.set(slot, bindings);
    }
  }
  const bindings: Record<string, string> = {};
  const bindingConflicts: string[] = [];
  for (const [slot, ids] of values) {
    if (ids.size > 1) bindingConflicts.push(slot);
    else {
      const members = JSON.parse([...ids][0] ?? "[]") as [string, string][];
      for (const [suffix, id] of members) bindings[`${slot}${suffix}`] = id;
    }
  }
  return {
    importId,
    digest: first.digest,
    manifest: first.manifest,
    connections: first.connections,
    bindings,
    bindingConflicts,
    entries,
  };
}
