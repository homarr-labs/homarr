import { TRPCError } from "@trpc/server";

import { and, eq, ne, notLike, or, handleTransactionsAsync } from "@homarr/db";
import { customWidgetInstallations, customWidgetStorage, items } from "@homarr/db/schema";
import type { CustomWidgetArtifact, CustomWidgetPackage } from "@homarr/custom-widgets/package";
import { assertWidgetArtifactIntegrity } from "@homarr/custom-widgets/package/server";

import { getArtifact, getInstallation, getPackagePlacements, parsePackagePlacement } from "./records";
import { persistPackageArtifact } from "./preview-store";
import { publishWidgetPackageChange } from "./events";
import { withWidgetInstallationLock } from "./coordination";
import { prepareWidgetMigration } from "./migrations";
import { getWidgetPackageSupervisor } from "./invocations";
import type { PackageContext } from "./types";
import { isWebhookStorage } from "./webhook-records";

export async function activateWidgetPackage(
  ctx: PackageContext,
  id: string,
  source: CustomWidgetPackage,
  artifact: CustomWidgetArtifact,
  expectedDraft: string,
) {
  return withWidgetInstallationLock(id, (signal) => activateLocked(ctx, id, source, artifact, expectedDraft, signal));
}

async function activateLocked(
  ctx: PackageContext,
  id: string,
  source: CustomWidgetPackage,
  artifact: CustomWidgetArtifact,
  expectedDraft: string,
  signal: AbortSignal,
) {
  assertWidgetArtifactIntegrity(artifact, source);
  const installation = await getInstallation(ctx, id);
  if (installation.draft !== expectedDraft)
    throw new TRPCError({ code: "CONFLICT", message: "Draft changed while the package was building" });
  getWidgetPackageSupervisor().resetFailures(artifact.digest);
  await getWidgetPackageSupervisor().preflight({ artifact });
  const placements = await getPackagePlacements(ctx, id);
  if (installation.activeArtifactId === artifact.digest) {
    signal.throwIfAborted();
    await ctx.db
      .update(customWidgetInstallations)
      .set({ enabled: true, updatedAt: new Date() })
      .where(eq(customWidgetInstallations.id, id));
    await publishWidgetPackageChange({
      installationId: id,
      itemIds: placements.map(({ id: itemId }) => itemId),
      kind: "activation",
    });
    return { id, artifactDigest: artifact.digest, affectedPlacements: placements.length };
  }
  if (
    installation.activeArtifactId &&
    (await getArtifact(ctx, installation.activeArtifactId)).source.manifest.id !== source.manifest.id
  ) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Fork the package to change its identity" });
  }
  const storage = await ctx.db.query.customWidgetStorage.findMany({
    where: and(
      eq(customWidgetStorage.installationId, id),
      or(ne(customWidgetStorage.scope, "system"), notLike(customWidgetStorage.key, "webhook:%")),
    ),
  });
  const migrated = await prepareWidgetMigration(ctx, installation, source, artifact, placements, storage, signal);
  const snapshot = JSON.stringify({
    bindings: installation.bindings,
    storage: storage.filter((row) => !isWebhookStorage(row)),
    placements: placements.map(({ id: itemId, options }) => ({ id: itemId, options })),
  });
  await persistPackageArtifact(ctx, source, artifact);
  const changes = {
    activeArtifactId: artifact.digest,
    previousArtifactId: installation.activeArtifactId,
    previousSnapshot: snapshot,
    enabled: true,
    updatedAt: new Date(),
  };
  signal.throwIfAborted();
  await handleTransactionsAsync(ctx.db, {
    async handleAsync(database, schema) {
      await database.transaction(async (transaction) => {
        for (const placement of migrated.placements)
          await transaction
            .update(schema.items)
            .set({ options: placement.options })
            .where(eq(schema.items.id, placement.id));
        if (migrated.storage !== storage) {
          await transaction
            .delete(schema.customWidgetStorage)
            .where(
              and(
                eq(schema.customWidgetStorage.installationId, id),
                or(
                  ne(schema.customWidgetStorage.scope, "system"),
                  notLike(schema.customWidgetStorage.key, "webhook:%"),
                ),
              ),
            );
          if (migrated.storage.length) await transaction.insert(schema.customWidgetStorage).values(migrated.storage);
        }
        await transaction
          .update(schema.customWidgetInstallations)
          .set(changes)
          .where(eq(schema.customWidgetInstallations.id, id));
      });
    },
    handleSync(database) {
      database.transaction((transaction) => {
        for (const placement of migrated.placements)
          transaction.update(items).set({ options: placement.options }).where(eq(items.id, placement.id)).run();
        if (migrated.storage !== storage) {
          transaction
            .delete(customWidgetStorage)
            .where(
              and(
                eq(customWidgetStorage.installationId, id),
                or(ne(customWidgetStorage.scope, "system"), notLike(customWidgetStorage.key, "webhook:%")),
              ),
            )
            .run();
          if (migrated.storage.length) transaction.insert(customWidgetStorage).values(migrated.storage).run();
        }
        transaction.update(customWidgetInstallations).set(changes).where(eq(customWidgetInstallations.id, id)).run();
      });
    },
  });
  await publishWidgetPackageChange({
    installationId: id,
    itemIds: placements.map(({ id: itemId }) => itemId),
    kind: "activation",
  });
  return { id, artifactDigest: artifact.digest, affectedPlacements: placements.length };
}

interface RollbackSnapshot {
  bindings: string;
  storage: Array<typeof customWidgetStorage.$inferSelect>;
  placements: Array<{ id: string; options: string }>;
}

export async function rollbackWidgetPackage(ctx: PackageContext, id: string) {
  return withWidgetInstallationLock(id, (signal) => rollbackLocked(ctx, id, signal));
}

async function rollbackLocked(ctx: PackageContext, id: string, signal: AbortSignal) {
  const installation = await getInstallation(ctx, id);
  if (!installation.previousArtifactId || !installation.previousSnapshot) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No previous activation is available" });
  }
  const snapshot = JSON.parse(installation.previousSnapshot) as RollbackSnapshot;
  const previous = await getArtifact(ctx, installation.previousArtifactId);
  assertWidgetArtifactIntegrity(previous.artifact, previous.source);
  await getWidgetPackageSupervisor().preflight({ artifact: previous.artifact });
  const placements = await getPackagePlacements(ctx, id);
  const currentPlacements = new Set(placements.map((placement) => placement.id));
  snapshot.placements = snapshot.placements.filter((placement) => currentPlacements.has(placement.id));
  const snapshots = new Map(snapshot.placements.map((placement) => [placement.id, placement.options]));
  const targets = placements.map((placement) => {
    const options = snapshots.get(placement.id) ?? placement.options;
    const packageOptions = parsePackagePlacement(options);
    if (!packageOptions)
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A rollback placement needs repair" });
    return { ...placement, options, packageOptions };
  });
  // Check restored bindings and placements added after activation against the previous release.
  const compatible = await prepareWidgetMigration(
    ctx,
    { ...installation, activeArtifactId: null, bindings: snapshot.bindings },
    previous.source,
    previous.artifact,
    targets,
    [],
    signal,
  );
  snapshot.placements = compatible.placements;
  // Capability revocation is never undone by restoring a package's managed data.
  const rows = snapshot.storage
    .filter((row) => !isWebhookStorage(row))
    .map((row) => ({ ...row, updatedAt: new Date(row.updatedAt) }));
  const changes = {
    activeArtifactId: installation.previousArtifactId,
    previousArtifactId: null,
    previousSnapshot: null,
    bindings: snapshot.bindings,
    enabled: true,
    updatedAt: new Date(),
  };
  signal.throwIfAborted();
  await handleTransactionsAsync(ctx.db, {
    async handleAsync(database, schema) {
      await database.transaction(async (transaction) => {
        await transaction
          .update(schema.customWidgetInstallations)
          .set(changes)
          .where(eq(schema.customWidgetInstallations.id, id));
        await transaction
          .delete(schema.customWidgetStorage)
          .where(
            and(
              eq(schema.customWidgetStorage.installationId, id),
              or(ne(schema.customWidgetStorage.scope, "system"), notLike(schema.customWidgetStorage.key, "webhook:%")),
            ),
          );
        if (rows.length) await transaction.insert(schema.customWidgetStorage).values(rows);
        for (const placement of snapshot.placements)
          await transaction
            .update(schema.items)
            .set({ options: placement.options })
            .where(eq(schema.items.id, placement.id));
      });
    },
    handleSync(database) {
      database.transaction((transaction) => {
        transaction.update(customWidgetInstallations).set(changes).where(eq(customWidgetInstallations.id, id)).run();
        transaction
          .delete(customWidgetStorage)
          .where(
            and(
              eq(customWidgetStorage.installationId, id),
              or(ne(customWidgetStorage.scope, "system"), notLike(customWidgetStorage.key, "webhook:%")),
            ),
          )
          .run();
        if (rows.length) transaction.insert(customWidgetStorage).values(rows).run();
        for (const placement of snapshot.placements)
          transaction.update(items).set({ options: placement.options }).where(eq(items.id, placement.id)).run();
      });
    },
  });
  await publishWidgetPackageChange({ installationId: id, itemIds: [...currentPlacements], kind: "activation" });
  return { id, artifactDigest: installation.previousArtifactId };
}
