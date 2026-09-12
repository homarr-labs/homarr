import { TRPCError } from "@trpc/server";

import { createId } from "@homarr/common";
import { handleTransactionsAsync } from "@homarr/db";
import { customWidgetInstallations } from "@homarr/db/schema";
import type {
  CustomWidgetCollection,
  WidgetCollectionContents,
  WidgetCollectionManifest,
} from "@homarr/custom-widgets/package";
import { isWidgetConnectionCompatible } from "@homarr/custom-widgets/package";
import { createWidgetCollectionArchive, validateWidgetCollectionArchive } from "@homarr/custom-widgets/package/server";

import { withWidgetArtifactReferenceLock } from "./artifact-references";
import { getBoundConnection } from "./connections";
import { withWidgetInstallationLock } from "./coordination";
import { readPortableWidgetOrigin } from "./portable-collection-origin";
import { getWidgetCollection } from "./portable-collection-records";
import { persistPackageArtifact } from "./preview-store";
import { getArtifact, getInstallation, parseBindings } from "./records";
import type { PackageContext } from "./types";

export function parseWidgetCollection(input: unknown) {
  try {
    return validateWidgetCollectionArchive(input);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Invalid collection archive",
    });
  }
}

export async function validateCollectionBindings(
  ctx: PackageContext,
  collection: Pick<CustomWidgetCollection, "connections">,
  bindings: Record<string, string>,
) {
  for (const [name] of Object.entries(bindings)) {
    const requirement = collection.connections[name];
    if (!requirement) throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown collection connection '${name}'` });
    try {
      const connection = await getBoundConnection(ctx, bindings, name);
      if (!isWidgetConnectionCompatible(requirement, connection.configuration))
        throw new Error(`requires a compatible ${requirement.kind} connection`);
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Collection connection '${name}': ${error instanceof Error ? error.message : "invalid binding"}`,
      });
    }
  }
}

export function mapCollectionBindings(mapping: Record<string, string>, bindings: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(mapping).flatMap(([name, slot]) => {
      const id = bindings[slot];
      if (!id) return [];
      return [[name, id]];
    }),
  );
}

export async function importWidgetCollection(ctx: PackageContext, input: unknown, bindings: Record<string, string>) {
  const collection = parseWidgetCollection(input);
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
  await validateCollectionBindings(ctx, collection, bindings);
  // Check every member before persisting anything. Immutable cache rows can survive a failed DB transaction;
  // installation rows become visible together, and no package code or dependency installation runs here.
  for (const entry of collection.widgets)
    await persistPackageArtifact(ctx, entry.archive.source, entry.archive.artifact);
  const importId = createId();
  const now = new Date();
  const installations = collection.widgets.map((entry) => ({
    id: createId(),
    name: entry.name ?? entry.archive.source.manifest.name,
    draft: JSON.stringify(entry.archive.source),
    bindings: JSON.stringify(mapCollectionBindings(entry.connections, bindings)),
    enabled: false,
    creatorId: ctx.session?.user.id,
    origin: JSON.stringify({
      ...entry.origin,
      collection: {
        importId,
        digest: collection.digest,
        manifest: collection.manifest,
        connections: collection.connections,
        key: entry.key,
        mapping: entry.connections,
        options: entry.options,
      },
    }),
    createdAt: now,
    updatedAt: now,
  }));
  await withWidgetArtifactReferenceLock(async (signal) => {
    await handleTransactionsAsync(ctx.db, {
      async handleAsync(database, schema) {
        await database.transaction(async (tx) => {
          for (const row of installations) await tx.insert(schema.customWidgetInstallations).values(row);
          signal.throwIfAborted();
        });
      },
      handleSync(database) {
        database.transaction((tx) => {
          for (const row of installations) tx.insert(customWidgetInstallations).values(row).run();
          signal.throwIfAborted();
        });
      },
    });
  });
  return getWidgetCollection(ctx, importId);
}

export async function withCollectionInstallationLocks<T>(
  ids: string[],
  operation: (signal: AbortSignal) => Promise<T>,
) {
  const ordered = [...new Set(ids)].toSorted();
  const acquire = (index: number, signal?: AbortSignal): Promise<T> => {
    const id = ordered[index];
    if (!id) {
      if (!signal) throw new Error("A collection requires at least one installation");
      return operation(signal);
    }
    return withWidgetInstallationLock(id, (nextSignal) => acquire(index + 1, nextSignal), signal);
  };
  return acquire(0);
}

export async function exportWidgetCollection(ctx: PackageContext, manifest: WidgetCollectionManifest, ids: string[]) {
  return withCollectionInstallationLocks(ids, async (signal) => {
    const connections: CustomWidgetCollection["connections"] = {};
    const shared = new Map<string, string>();
    const widgets: WidgetCollectionContents["widgets"] = [];
    for (const [index, id] of ids.entries()) {
      const row = await getInstallation(ctx, id);
      if (!row.activeArtifactId)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Widget '${row.name}' must have an activated artifact before collection export`,
        });
      const { source, artifact } = await getArtifact(ctx, row.activeArtifactId);
      const bindings = parseBindings(row.bindings);
      const mapping: Record<string, string> = {};
      for (const [name, requirement] of Object.entries(source.connections)) {
        const identity = `${requirement.kind}:${requirement.serviceType ?? ""}:${bindings[name] ?? `${id}:${name}`}`;
        let slot = shared.get(identity);
        if (!slot) {
          slot = `connection${shared.size + 1}`;
          shared.set(identity, slot);
          connections[slot] = { ...requirement };
        } else {
          const sharedRequirement = connections[slot];
          if (!requirement.optional && sharedRequirement) sharedRequirement.optional = false;
        }
        mapping[name] = slot;
      }
      widgets.push({
        key: `widget${index + 1}`,
        archive: { format: "homarr-widget-archive-v3", source, artifact },
        connections: mapping,
        origin: readPortableWidgetOrigin(row.origin),
      });
    }
    signal.throwIfAborted();
    return createWidgetCollectionArchive({ format: "homarr-widget-collection-v1", manifest, connections, widgets });
  });
}
