import {
  getWidgetConnectionBindingNames,
  isWidgetConnectionCompatible,
  mergeWidgetConnectionBindings,
} from "@homarr/custom-widgets/package";
import { TRPCError } from "@trpc/server";
import { parse, stringify } from "superjson";
import { z } from "zod/v4";

import { isRecord } from "@homarr/common";
import { getCustomWidgetDefaultOptions, validateCustomWidgetOptions } from "@homarr/custom-widgets/core";
import type { CustomWidgetArtifact, CustomWidgetPackage } from "@homarr/custom-widgets/package";
import type { customWidgetStorage } from "@homarr/db/schema";

import { getBoundConnection } from "./connections";
import { getWidgetPackageSupervisor } from "./invocations";
import { getArtifact, parseBindings } from "./records";
import type { getPackagePlacements } from "./records";
import type { PackageContext, PackageInstallation } from "./types";

type StorageRow = typeof customWidgetStorage.$inferSelect;

export async function prepareWidgetMigration(
  ctx: PackageContext,
  installation: PackageInstallation,
  source: CustomWidgetPackage,
  artifact: CustomWidgetArtifact,
  placements: Awaited<ReturnType<typeof getPackagePlacements>>,
  storage: StorageRow[],
  signal?: AbortSignal,
) {
  const previous = installation.activeArtifactId ? await getArtifact(ctx, installation.activeArtifactId) : null;
  const configurationChanged =
    previous && previous.source.manifest.configurationVersion !== source.manifest.configurationVersion;
  const storageChanged = previous && previous.source.manifest.storageVersion !== source.manifest.storageVersion;
  const bindings = parseBindings(installation.bindings);
  const changes = [];
  for (const placement of placements) {
    // Materialize existing defaults so a release cannot change a placement's saved choices implicitly.
    let configuration: Record<string, unknown> = {
      ...getCustomWidgetDefaultOptions(source.options),
      ...getCustomWidgetDefaultOptions(previous?.source.options ?? {}),
      ...placement.packageOptions.configuration,
    };
    if (configurationChanged && source.manifest.migrations?.configuration) {
      configuration = z.record(z.string(), z.unknown()).parse(
        await getWidgetPackageSupervisor().invoke({
          artifact,
          instanceId: placement.id,
          boardId: placement.boardId,
          userId: ctx.session?.user.id,
          signal,
          handler: source.manifest.migrations.configuration,
          input: {
            fromVersion: previous.source.manifest.configurationVersion,
            toVersion: source.manifest.configurationVersion,
            configuration,
          },
        }),
      );
    }
    const issues = validateCustomWidgetOptions(source.options, configuration);
    if (issues.length)
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Placement ${placement.id}: ${issues[0]?.message}` });
    const mergedBindings = mergeWidgetConnectionBindings(
      source.connections,
      bindings,
      placement.packageOptions.connectionBindings,
    );
    for (const [name, requirement] of Object.entries(source.connections)) {
      const names = getWidgetConnectionBindingNames(name, requirement, mergedBindings);
      if (!names.length && !requirement.optional)
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Connection '${name}' needs setup` });
      for (const bindingName of names) {
        const connection = await getBoundConnection(ctx, mergedBindings, bindingName);
        if (!isWidgetConnectionCompatible(requirement, connection.configuration))
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Connection '${name}' requires ${requirement.serviceType ?? requirement.kind}`,
          });
      }
    }
    const raw: unknown = parse(placement.options);
    if (!isRecord(raw)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Placement options are invalid" });
    changes.push({ id: placement.id, options: stringify({ ...raw, configuration }) });
  }
  const managedStorage = storage.filter((row) => row.scope !== "system");
  let migratedStorage = storage;
  if (storageChanged && managedStorage.length) {
    const handler = source.manifest.migrations?.storage;
    if (!handler)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "A storage migration is required for the new storage version",
      });
    const result = z.array(z.object({ id: z.string(), value: z.unknown() })).parse(
      await getWidgetPackageSupervisor().invoke({
        artifact,
        instanceId: installation.id,
        boardId: "migration",
        userId: ctx.session?.user.id,
        handler,
        signal,
        input: {
          fromVersion: previous.source.manifest.storageVersion,
          toVersion: source.manifest.storageVersion,
          records: managedStorage.map(({ id, scope, ownerKey, key, value }) => ({
            id,
            scope,
            ownerKey,
            key,
            value: JSON.parse(value) as unknown,
          })),
        },
      }),
    );
    const byId = new Map(managedStorage.map((row) => [row.id, row]));
    const seen = new Set<string>();
    migratedStorage = result
      .map(({ id, value }) => {
        const row = byId.get(id);
        if (!row || seen.has(id))
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Storage migration returned an unknown or duplicate record",
          });
        seen.add(id);
        const serialized = JSON.stringify(value);
        if (serialized === undefined || Buffer.byteLength(serialized) > 1_048_576)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Migrated storage exceeds 1 MiB per record" });
        return { ...row, value: serialized, updatedAt: new Date() };
      })
      .concat(storage.filter((row) => row.scope === "system"));
  }
  return { placements: changes, storage: migratedStorage };
}
