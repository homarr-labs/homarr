import { widgetPackageAdminProcedure } from "./procedure";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { customWidgetPackageSchema, widgetPackageManifestSchema } from "@homarr/custom-widgets/package";
import type { CustomWidgetArtifact } from "@homarr/custom-widgets/package";
import { and, eq } from "@homarr/db";
import { customWidgetInstallations } from "@homarr/db/schema";
import { preserveWidgetCollectionOrigin, readPortableWidgetOrigin } from "./portable-collection-origin";

import { persistPackageArtifact } from "./preview-store";
import { withWidgetInstallationLock } from "./coordination";
import { withWidgetArtifactReferenceLock } from "./artifact-references";
import { getArtifact, getInstallation, packageDigest, readPackageDraft } from "./records";
import {
  authenticatedWidgetWorkshop,
  describeWidgetWorkshopRelease,
  getWidgetWorkshopRelease,
  readWidgetWorkshopOrigin,
  widgetWorkshop,
  withWorkshopError,
} from "./workshop-client";

const admin = widgetPackageAdminProcedure;
const idInput = z.object({ id: z.string().min(1) });
const releaseInput = z.object({ releaseId: z.string().min(1) });

export const packageWorkshopProcedures = {
  workshopReleases: admin
    .meta({
      mcp: {
        enabled: true,
        description:
          "List immutable v3 Workshop release metadata for a submission ID. Requires admin. Does not execute or install package code.",
      },
    })
    .input(z.object({ submissionId: z.string().min(1) }))
    .query(({ input }) =>
      withWorkshopError(() => widgetWorkshop.packages.list(input.submissionId, AbortSignal.timeout(15_000))),
    ),
  workshopRelease: admin
    .meta({
      mcp: {
        enabled: true,
        description:
          "Read and validate an immutable v3 Workshop release source and artifact. Requires admin; choose releaseId from customWidget_package_workshopReleases. Does not execute code.",
      },
    })
    .input(releaseInput)
    .query(({ input }) => getWidgetWorkshopRelease(input.releaseId)),
  installWorkshop: admin
    .input(
      releaseInput.extend({
        name: z.string().trim().min(1).max(128).optional(),
        bindings: z.record(z.string(), z.string()).default({}),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { source, artifact, origin } = await getWidgetWorkshopRelease(input.releaseId);
      if (artifact) await persistPackageArtifact(ctx, source, artifact);
      const id = createId();
      await withWidgetArtifactReferenceLock(async () =>
        ctx.db.insert(customWidgetInstallations).values({
          id,
          name: input.name ?? source.manifest.name,
          draft: JSON.stringify(source),
          origin: JSON.stringify(origin),
          bindings: JSON.stringify(input.bindings),
          enabled: false,
          creatorId: ctx.session.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
      return { id, managementPath: `/manage/custom-widgets/packages/${id}` };
    }),
  checkUpdate: admin
    .meta({
      mcp: {
        enabled: true,
        description:
          "Check a Workshop-linked widget installation for newer releases and local draft changes. Requires admin; preserves source, bindings and active code.",
      },
    })
    .input(idInput)
    .query(async ({ ctx, input }) => {
      const installation = await getInstallation(ctx, input.id);
      const origin = readWidgetWorkshopOrigin(installation.origin);
      if (!origin) return { available: false as const, reason: "local" as const };
      const releases = await withWorkshopError(() =>
        widgetWorkshop.packages.list(origin.submissionId, AbortSignal.timeout(15_000)),
      );
      const latest = releases[0];
      const draft = customWidgetPackageSchema.safeParse(readPackageDraft(installation.draft));
      let activeVersion: string | null = null;
      if (installation.activeArtifactId)
        activeVersion = (await getArtifact(ctx, installation.activeArtifactId)).source.manifest.version;
      return {
        available: Boolean(latest && latest.id !== origin.releaseId),
        origin,
        latest: latest
          ? { id: latest.id, version: latest.version, changelog: latest.changelog, created: latest.created }
          : null,
        hasLocalChanges: !draft.success || packageDigest(draft.data) !== origin.sourceDigest,
        draftDigest: packageDigest(installation.draft),
        activeVersion,
      };
    }),
  stageWorkshopUpdate: admin
    .input(
      idInput.extend({
        releaseId: z.string().min(1),
        replaceLocalDraft: z.literal(true),
        expectedDraftDigest: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return withWidgetInstallationLock(input.id, async () => {
        const installation = await getInstallation(ctx, input.id);
        const origin = readWidgetWorkshopOrigin(installation.origin);
        if (!origin)
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This installation is not linked to Workshop" });
        if (packageDigest(installation.draft) !== input.expectedDraftDigest)
          throw new TRPCError({ code: "CONFLICT", message: "The local draft changed. Review it before replacing it." });
        const incoming = await getWidgetWorkshopRelease(input.releaseId);
        const current = customWidgetPackageSchema.parse(JSON.parse(installation.draft));
        if (
          incoming.origin.submissionId !== origin.submissionId ||
          incoming.source.manifest.id !== current.manifest.id
        ) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This release belongs to a different package" });
        }
        if (incoming.artifact) await persistPackageArtifact(ctx, incoming.source, incoming.artifact);
        const draft = JSON.stringify(incoming.source);
        await withWidgetArtifactReferenceLock(async () =>
          ctx.db
            .update(customWidgetInstallations)
            .set({
              draft,
              origin: JSON.stringify(preserveWidgetCollectionOrigin(installation.origin, incoming.origin)),
              updatedAt: new Date(),
            })
            .where(
              and(eq(customWidgetInstallations.id, input.id), eq(customWidgetInstallations.draft, installation.draft)),
            ),
        );
        if ((await getInstallation(ctx, input.id)).draft !== draft)
          throw new TRPCError({ code: "CONFLICT", message: "The local draft changed. Review it before replacing it." });
        return { id: input.id, managementPath: `/manage/custom-widgets/packages/${input.id}` };
      });
    }),
  publishWorkshop: admin
    .input(
      idInput.extend({
        token: z.string().min(1).max(20_000),
        mode: z.enum(["auto", "new", "update", "fork"]).default("auto"),
        title: z.string().trim().min(3).max(100).optional(),
        description: z.string().max(2048).optional(),
        version: widgetPackageManifestSchema.shape.version.optional(),
        expectedDraftDigest: z.string().min(1).optional(),
        submissionId: z.string().optional(),
        expectedRevision: z.number().int().positive().optional(),
        forkedFrom: z.string().optional(),
        changelog: z.string().max(2_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return withWidgetInstallationLock(input.id, async () => {
        const installation = await getInstallation(ctx, input.id);
        if (input.expectedDraftDigest && packageDigest(installation.draft) !== input.expectedDraftDigest)
          throw new TRPCError({ code: "CONFLICT", message: "The saved draft changed. Reload it before publishing." });
        const source = customWidgetPackageSchema.parse(readPackageDraft(installation.draft));
        const origin = readWidgetWorkshopOrigin(installation.origin);
        const backend = authenticatedWidgetWorkshop(input.token);
        const user = await withWorkshopError(() => backend.refreshAuth());
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to Workshop before publishing." });
        let submissionId: string | undefined;
        let forkedFrom: string | undefined;
        let expectedRevision = input.expectedRevision;
        if (input.mode === "auto") {
          if (!input.expectedDraftDigest)
            throw new TRPCError({ code: "BAD_REQUEST", message: "Review the saved draft before publishing." });
          const portable = readPortableWidgetOrigin(installation.origin);
          if (origin?.author === user.id) {
            const listing = await withWorkshopError(() => backend.get(origin.submissionId));
            submissionId = listing.id;
            expectedRevision = listing.revision;
          } else if (origin) {
            forkedFrom = origin.releaseId;
          } else if (portable?.kind === "fork" && portable.upstream) {
            const upstream = readWidgetWorkshopOrigin(JSON.stringify(portable.upstream));
            forkedFrom = upstream?.releaseId;
          }
          if (forkedFrom) {
            const original = await getWidgetWorkshopRelease(forkedFrom);
            if (original.source.manifest.id === source.manifest.id) source.manifest.id = `widget-${createId()}`;
          }
          source.manifest.author = user.name;
          source.manifest.name = input.title ?? installation.name;
          source.manifest.description = input.description ?? source.manifest.description;
          source.manifest.version = input.version ?? source.manifest.version;
        } else if (input.mode === "update") {
          submissionId = input.submissionId ?? origin?.submissionId;
          if (!submissionId || !expectedRevision)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "An update requires its Workshop submission and current revision",
            });
        } else if (input.mode === "fork") {
          forkedFrom = input.forkedFrom ?? origin?.releaseId;
          if (!forkedFrom)
            throw new TRPCError({ code: "BAD_REQUEST", message: "Choose the original release to publish a fork" });
          const original = await getWidgetWorkshopRelease(forkedFrom);
          if (original.source.manifest.id === source.manifest.id)
            throw new TRPCError({ code: "BAD_REQUEST", message: "A fork must have its own package identity" });
        }
        let artifact: CustomWidgetArtifact | undefined;
        if (installation.activeArtifactId) {
          const active = await getArtifact(ctx, installation.activeArtifactId);
          if (packageDigest(active.source) === packageDigest(source)) artifact = active.artifact;
        }
        const release = await withWorkshopError(() =>
          backend.packages.publish({
            source,
            artifact,
            submissionId,
            expectedRevision,
            forkedFrom,
            changelog: input.changelog,
            title: input.title ?? installation.name,
            description: input.description ?? source.manifest.description,
          }),
        );
        const published = describeWidgetWorkshopRelease(release);
        await ctx.db
          .update(customWidgetInstallations)
          .set({
            origin: JSON.stringify(
              preserveWidgetCollectionOrigin(installation.origin, { ...published.origin, authorName: user.name }),
            ),
            draft: JSON.stringify(source),
            updatedAt: new Date(),
          })
          .where(eq(customWidgetInstallations.id, input.id));
        return {
          releaseId: release.id,
          submissionId: release.submission,
          version: release.version,
          workshopUrl: published.workshopUrl,
        };
      });
    }),
};
