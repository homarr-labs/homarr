import { widgetPackageAdminProcedure } from "./procedure";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { eq } from "@homarr/db";
import { customWidgetArtifacts, customWidgetInstallations } from "@homarr/db/schema";
import { customWidgetArchiveSchema, customWidgetPackageSchema } from "@homarr/custom-widgets/package";
import { assertWidgetArtifactIntegrity, compileCustomWidgetPackage } from "@homarr/custom-widgets/package/server";
import type { CustomWidgetPackage } from "@homarr/custom-widgets/package";

import { getWidgetPackageDirectory } from "./paths";
import { persistPackageArtifact } from "./preview-store";
import { getArtifact, getInstallation, packageDigest } from "./records";
import type { PackageContext } from "./types";
import { withWidgetInstallationLock } from "./coordination";
import { leaseWidgetArtifact, reserveWidgetBuild, withWidgetArtifactReferenceLock } from "./artifact-references";

const admin = widgetPackageAdminProcedure;

export async function getOrBuildWidgetArtifact(ctx: PackageContext, source: CustomWidgetPackage) {
  const cachedArtifact = await withWidgetArtifactReferenceLock(async () => {
    const cached = await ctx.db.query.customWidgetArtifacts.findFirst({
      where: eq(customWidgetArtifacts.source, JSON.stringify(source)),
    });
    if (cached) {
      const { artifact } = await getArtifact(ctx, cached.id);
      assertWidgetArtifactIntegrity(artifact, source);
      await leaseWidgetArtifact(artifact.digest);
      return artifact;
    }
    await reserveWidgetBuild(source);
    return null;
  });
  if (cachedArtifact) return cachedArtifact;
  return compileCustomWidgetPackage(source, {
    rootDirectory: getWidgetPackageDirectory(),
    allowDependencyInstall: true,
  });
}

export const packageTransferProcedures = {
  import: admin.input(z.object({ archive: customWidgetArchiveSchema })).mutation(async ({ ctx, input }) => {
    assertWidgetArtifactIntegrity(input.archive.artifact, input.archive.source);
    const { source, artifact } = input.archive;
    await persistPackageArtifact(ctx, source, artifact);
    const id = createId();
    await ctx.db.insert(customWidgetInstallations).values({
      id,
      name: source.manifest.name,
      draft: JSON.stringify(source),
      bindings: "{}",
      enabled: false,
      creatorId: ctx.session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id, managementPath: `/manage/custom-widgets/packages/${id}` };
  }),
  stageUpdate: admin
    .input(z.object({ id: z.string(), archive: customWidgetArchiveSchema, replaceLocalDraft: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      return withWidgetInstallationLock(input.id, async () => {
        const installation = await getInstallation(ctx, input.id);
        if (!installation.activeArtifactId)
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Activate the installation first" });
        const installed = await getArtifact(ctx, installation.activeArtifactId);
        if (installed.source.manifest.id !== input.archive.source.manifest.id)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The update belongs to a different package. Import it alongside this installation.",
          });
        assertWidgetArtifactIntegrity(input.archive.artifact, input.archive.source);
        await persistPackageArtifact(ctx, input.archive.source, input.archive.artifact);
        await ctx.db
          .update(customWidgetInstallations)
          .set({ draft: JSON.stringify(input.archive.source), updatedAt: new Date() })
          .where(eq(customWidgetInstallations.id, input.id));
        return { id: input.id, managementPath: `/manage/custom-widgets/packages/${input.id}` };
      });
    }),
  fork: admin
    .input(z.object({ id: z.string(), name: z.string().trim().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const installation = await getInstallation(ctx, input.id);
      const source = customWidgetPackageSchema.parse(JSON.parse(installation.draft));
      const id = createId();
      const forked = {
        ...source,
        manifest: { ...source.manifest, id: `local.${id}`, name: input.name, version: "1.0.0" },
      };
      await ctx.db.insert(customWidgetInstallations).values({
        id,
        name: input.name,
        draft: JSON.stringify(forked),
        bindings: installation.bindings,
        origin: JSON.stringify({
          forkedFrom: source.manifest.id,
          artifact: installation.activeArtifactId,
          origin: installation.origin,
        }),
        enabled: false,
        creatorId: ctx.session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { id, managementPath: `/manage/custom-widgets/packages/${id}` };
    }),
  draftChanges: admin.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const installation = await getInstallation(ctx, input.id);
    const draft = customWidgetPackageSchema.safeParse(JSON.parse(installation.draft));
    if (!draft.success) return { valid: false as const, issues: draft.error.issues };
    const source = draft.data;
    const previous = installation.activeArtifactId
      ? (await getArtifact(ctx, installation.activeArtifactId)).source
      : null;
    const names = new Set([...Object.keys(previous?.files ?? {}), ...Object.keys(source.files)]);
    return {
      valid: true as const,
      files: [...names]
        .filter((name) => previous?.files[name] !== source.files[name])
        .map((name) => ({ name, before: previous?.files[name] ?? null, after: source.files[name] ?? null })),
      dependenciesChanged: packageDigest(previous?.dependencies) !== packageDigest(source.dependencies),
      connectionsChanged: packageDigest(previous?.connections) !== packageDigest(source.connections),
      configurationChanged: packageDigest(previous?.options) !== packageDigest(source.options),
      fromVersion: previous?.manifest.version,
      toVersion: source.manifest.version,
    };
  }),
};
