import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod/v4";

import { asc, eq } from "@homarr/db";
import { customWidgetArtifacts } from "@homarr/db/schema";
import { customWidgetPackageSchema } from "@homarr/custom-widgets/package";
import { hashWidgetArtifactContent } from "@homarr/custom-widgets/package/server";

import { hasWidgetArtifactLease, widgetArtifactGraceMs, withWidgetArtifactReferenceLock } from "./artifact-references";
import { getWidgetPackageDirectory } from "./paths";
import { widgetPackageAdminProcedure } from "./procedure";
import type { PackageContext } from "./types";

const cleanupInput = z.object({
  dryRun: z.boolean().default(true),
  maximumArtifacts: z.number().int().min(1).max(500).default(100),
  maximumDirectories: z.number().int().min(1).max(100).default(20),
});

export const packageArtifactCleanupProcedures = {
  cleanupArtifacts: widgetPackageAdminProcedure
    .input(cleanupInput)
    .mutation(({ ctx, input }) => cleanupWidgetArtifacts(ctx, input)),
};

/** Explicit bounded maintenance; keep immutable archives needed by disabled and never-activated drafts too. */
export async function cleanupWidgetArtifacts(ctx: PackageContext, input: z.infer<typeof cleanupInput>) {
  return withWidgetArtifactReferenceLock(async (signal) => {
    const cutoff = Date.now() - widgetArtifactGraceMs;
    const installations = await ctx.db.query.customWidgetInstallations.findMany({
      columns: { activeArtifactId: true, previousArtifactId: true, draft: true },
    });
    const retainedIds = new Set<string>();
    const retainedSources = new Set<string>();
    for (const installation of installations) {
      if (installation.activeArtifactId) retainedIds.add(installation.activeArtifactId);
      if (installation.previousArtifactId) retainedIds.add(installation.previousArtifactId);
      const digest = sourceDigest(installation.draft);
      if (digest) retainedSources.add(digest);
    }
    const candidates: string[] = [];
    const diskIds = new Set(retainedIds);
    const diskSources = new Set(retainedSources);
    let offset = 0;
    let scanned = 0;
    let unknownSource = false;
    // Small pages avoid loading every package's potentially large source into memory together.
    while (true) {
      signal.throwIfAborted();
      const rows = await ctx.db.query.customWidgetArtifacts.findMany({
        columns: { id: true, source: true, createdAt: true },
        orderBy: asc(customWidgetArtifacts.id),
        limit: 10,
        offset,
      });
      if (rows.length === 0) break;
      offset += rows.length;
      scanned += rows.length;
      for (const row of rows) {
        const digest = sourceDigest(row.source);
        if (!digest) unknownSource = true;
        const retained =
          !digest ||
          retainedIds.has(row.id) ||
          retainedSources.has(digest) ||
          row.createdAt.getTime() >= cutoff ||
          (await hasWidgetArtifactLease(row.id));
        if (!retained && candidates.length < input.maximumArtifacts) candidates.push(row.id);
        else {
          diskIds.add(row.id);
          if (digest) diskSources.add(digest);
        }
      }
    }
    // Scan before deletion so offset pagination cannot skip shifted records.
    if (!input.dryRun)
      for (const id of candidates) {
        signal.throwIfAborted();
        await ctx.db.delete(customWidgetArtifacts).where(eq(customWidgetArtifacts.id, id));
      }
    const directories: string[] = [];
    for (const [kind, retained] of [
      ["runtime", diskIds],
      ["dependencies", diskSources],
    ] as const) {
      if (kind === "dependencies" && unknownSource) continue;
      // These directories are mutable runtime data, never deployment inputs.
      const parent = join(/* turbopackIgnore: true */ getWidgetPackageDirectory(), kind);
      for (const entry of await listDirectories(parent)) {
        if (directories.length >= input.maximumDirectories) break;
        if (!entry.isDirectory() || !/^[a-f0-9]{64}$/u.test(entry.name) || retained.has(entry.name)) continue;
        const path = join(/* turbopackIgnore: true */ parent, entry.name);
        const metadata = await stat(/* turbopackIgnore: true */ path);
        if (metadata.mtimeMs >= cutoff) continue;
        signal.throwIfAborted();
        directories.push(`${kind}/${entry.name}`);
        if (!input.dryRun) await rm(path, { recursive: true, force: true });
      }
    }
    return {
      dryRun: input.dryRun,
      graceDays: 7,
      scannedArtifacts: scanned,
      artifactIds: candidates,
      directories,
      limited: candidates.length >= input.maximumArtifacts || directories.length >= input.maximumDirectories,
    };
  });
}

function sourceDigest(raw: string) {
  try {
    const source = customWidgetPackageSchema.safeParse(JSON.parse(raw));
    if (source.success) return hashWidgetArtifactContent(source.data);
  } catch {
    // Damaged artifact rows are retained for recovery, never assumed to be disposable.
  }
  return null;
}

async function listDirectories(directory: string) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}
