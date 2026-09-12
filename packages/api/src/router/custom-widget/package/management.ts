import { getWidgetConnectionRequirement, isWidgetConnectionCompatible } from "@homarr/custom-widgets/package";
import { widgetPackageAdminProcedure } from "./procedure";
import { TRPCError } from "@trpc/server";
import { nativeScaffoldProcedures } from "./native-scaffold";
import { packageCollectionProcedures } from "./collection-procedures";
import { packagePortableCollectionProcedures } from "./portable-collection-procedures";
import { packagePreviewProcedures } from "./preview-procedures";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { eq, inArray } from "@homarr/db";
import { customWidgetArtifacts, customWidgetInstallations, items } from "@homarr/db/schema";
import { customWidgetPackageSchema } from "@homarr/custom-widgets/package";

import { createTRPCRouter } from "../../../trpc";
import { activateWidgetPackage, rollbackWidgetPackage } from "./activation";
import {
  getArtifact,
  getInstallation,
  getPackagePlacements,
  packageDigest,
  parseBindings,
  parsePackagePlacement,
  readPackageDraft,
} from "./records";
import { getBoundConnection, packageConnectionProcedures } from "./connections";
import { diagnoseWidgetConnection } from "./http";
import { packageGrantProcedures } from "./permissions";
import { getOrBuildWidgetArtifact, packageTransferProcedures } from "./transfer";
import { withWidgetInstallationLock } from "./coordination";
import { publishWidgetPackageChange } from "./events";
import { packageWorkshopProcedures } from "./workshop";
import { getWidgetWorkshopUrl, readWidgetWorkshopOrigin } from "./workshop-client";
import { setWidgetPackageEnabled } from "./enabled";
import { packageWebhookProcedures } from "./webhook-procedures";
import { packageArtifactReviewProcedures } from "./artifact-review";
import { packageConversionProcedures } from "./conversion";
import { withWidgetArtifactReferenceLock } from "./artifact-references";
import { packageArtifactCleanupProcedures } from "./artifact-cleanup";

const admin = widgetPackageAdminProcedure;
const idInput = z.object({ id: z.string().min(1) });
const trustedInput = idInput.extend({ trusted: z.literal(true) });
// Source syntax may be incomplete in a saved draft; execution validates the complete package.
const draftInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(128),
  source: z.record(z.string(), z.unknown()),
});

export const customWidgetPackageRouter = createTRPCRouter({
  ...packageArtifactReviewProcedures,
  ...packageArtifactCleanupProcedures,
  ...packageConversionProcedures,
  ...packageWebhookProcedures,
  ...packagePreviewProcedures,
  ...packageCollectionProcedures,
  ...packagePortableCollectionProcedures,
  ...nativeScaffoldProcedures,
  ...packageTransferProcedures,
  ...packageWorkshopProcedures,
  list: admin
    .meta({
      mcp: {
        enabled: true,
        description: "List installed trusted widget packages and activation state. Does not execute code.",
      },
    })
    .query(async ({ ctx }) => {
      const [rows, placements] = await Promise.all([
        ctx.db.query.customWidgetInstallations.findMany({ columns: { previousSnapshot: false } }),
        ctx.db.query.items.findMany({ where: eq(items.kind, "customApi"), columns: { options: true } }),
      ]);
      const counts = new Map<string, number>();
      for (const placement of placements) {
        const options = parsePackagePlacement(placement.options);
        if (options) counts.set(options.definitionId, (counts.get(options.definitionId) ?? 0) + 1);
      }
      const artifactIds = rows.flatMap((row) => (row.activeArtifactId ? [row.activeArtifactId] : []));
      const artifacts =
        artifactIds.length > 0
          ? await ctx.db.query.customWidgetArtifacts.findMany({
              where: inArray(customWidgetArtifacts.id, artifactIds),
              columns: { id: true, version: true },
            })
          : [];
      const versions = new Map(artifacts.map((artifact) => [artifact.id, artifact.version]));
      return rows.map(({ draft, ...row }) => {
        const source = customWidgetPackageSchema.safeParse(readPackageDraft(draft));
        const origin = readWidgetWorkshopOrigin(row.origin);
        return {
          ...row,
          bindings: parseBindings(row.bindings),
          placementCount: counts.get(row.id) ?? 0,
          activeVersion: versions.get(row.activeArtifactId ?? "") ?? null,
          draftVersion: source.data?.manifest.version ?? null,
          description: source.data?.manifest.description ?? "",
          author: origin?.authorName || source.data?.manifest.author || "",
          workshop: origin,
          workshopUrl: origin ? getWidgetWorkshopUrl(origin.submissionId) : null,
        };
      });
    }),
  get: admin
    .meta({
      mcp: {
        enabled: true,
        description:
          "Read a trusted widget installation source draft, local binding IDs and placement IDs. Requires admin; obtain id from customWidget_package_list. Does not execute code.",
      },
    })
    .input(idInput)
    .query(async ({ ctx, input }) => {
      const row = await getInstallation(ctx, input.id);
      const { previousSnapshot: _snapshot, draft: _draft, ...installation } = row;
      return {
        ...installation,
        workshop: readWidgetWorkshopOrigin(row.origin),
        source: readPackageDraft(row.draft),
        draftDigest: packageDigest(row.draft),
        bindings: parseBindings(row.bindings),
        placements: (await getPackagePlacements(ctx, row.id)).map(({ id, boardId }) => ({ id, boardId })),
      };
    }),
  saveDraft: admin
    .meta({
      mcp: {
        enabled: true,
        description: "Save the current trusted widget source draft without compiling or activating it. Requires admin.",
      },
    })
    .input(draftInput)
    .mutation(async ({ ctx, input }) => {
      const id = input.id ?? createId();
      const draft = JSON.stringify(input.source);
      if (Buffer.byteLength(draft) > 25_000_000)
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Widget package draft exceeds 25 MB" });
      if (input.id) {
        await withWidgetInstallationLock(id, async () => {
          await getInstallation(ctx, id);
          await withWidgetArtifactReferenceLock(async () =>
            ctx.db
              .update(customWidgetInstallations)
              .set({ name: input.name, draft, updatedAt: new Date() })
              .where(eq(customWidgetInstallations.id, id)),
          );
        });
      } else {
        await withWidgetArtifactReferenceLock(async () =>
          ctx.db.insert(customWidgetInstallations).values({
            id,
            name: input.name,
            draft,
            bindings: "{}",
            enabled: false,
            creatorId: ctx.session.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        );
      }
      return { id, managementPath: `/manage/custom-widgets/packages/${id}`, draftDigest: packageDigest(draft) };
    }),
  activate: admin
    .meta({
      mcp: {
        enabled: true,
        description:
          "Compile and activate the saved widget package on every placement. Requires admin and trusted:true for Homarr-level code execution; preserves one rollback snapshot.",
      },
    })
    .input(
      trustedInput.extend({
        expectedDraftDigest: z
          .string()
          .regex(/^[a-f0-9]{64}$/u)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const installation = await getInstallation(ctx, input.id);
      if (input.expectedDraftDigest && packageDigest(installation.draft) !== input.expectedDraftDigest)
        throw new TRPCError({ code: "CONFLICT", message: "The saved source changed. Review it before activating." });
      const source = customWidgetPackageSchema.parse(JSON.parse(installation.draft));
      const artifact = await getOrBuildWidgetArtifact(ctx, source);
      return activateWidgetPackage(ctx, input.id, source, artifact, installation.draft);
    }),
  rollback: admin
    .input(idInput.extend({ discardNewerWidgetData: z.literal(true) }))
    .mutation(({ ctx, input }) => rollbackWidgetPackage(ctx, input.id)),
  setEnabled: admin
    .meta({
      mcp: {
        enabled: true,
        description:
          "Enable or disable an already activated trusted widget installation. Requires admin; disabling stops its active handlers and placements.",
      },
    })
    .input(idInput.extend({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await setWidgetPackageEnabled(ctx, input.id, input.enabled);
    }),
  setBindings: admin
    .input(idInput.extend({ bindings: z.record(z.string(), z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return withWidgetInstallationLock(input.id, async () => {
        const installation = await getInstallation(ctx, input.id);
        const draft = customWidgetPackageSchema.safeParse(JSON.parse(installation.draft));
        for (const [name] of Object.entries(input.bindings)) {
          const connection = await getBoundConnection(ctx, input.bindings, name);
          const requirement = draft.success ? getWidgetConnectionRequirement(draft.data.connections, name) : undefined;
          if (requirement && !isWidgetConnectionCompatible(requirement, connection.configuration))
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Connection '${name}' requires ${requirement.serviceType ?? requirement.kind}`,
            });
        }
        await ctx.db
          .update(customWidgetInstallations)
          .set({ bindings: JSON.stringify(input.bindings), updatedAt: new Date() })
          .where(eq(customWidgetInstallations.id, input.id));
        await publishWidgetPackageChange({
          installationId: input.id,
          itemIds: (await getPackagePlacements(ctx, input.id)).map(({ id }) => id),
          kind: "bindings",
        });
      });
    }),
  export: admin.input(idInput).query(async ({ ctx, input }) => {
    const row = await getInstallation(ctx, input.id);
    if (!row.activeArtifactId) return { source: JSON.parse(row.draft) as unknown };
    const { source, artifact } = await getArtifact(ctx, row.activeArtifactId);
    return { format: "homarr-widget-archive-v3" as const, source, artifact };
  }),
  diagnoseConnection: admin.input(idInput).mutation(({ ctx, input }) => diagnoseWidgetConnection(ctx, input.id)),
  ...packageConnectionProcedures,
  ...packageGrantProcedures,
});
