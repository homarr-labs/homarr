import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";
import {
  applyCustomWidgetSourceSetup,
  customWidgetDefinitionSchema,
  customWidgetSecretsInputSchema,
  getCustomWidgetSourceSetups,
} from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
import { parseCustomWidgetAuthoringInput } from "./authoring-validation";
import { getCustomWidgetDefinitionStateFingerprint, updateCustomWidgetDefinition } from "./definition-update";
import { assertSecretSources, hasSameSecretBinding } from "./secret-policy";
import { assertCustomWidgetIntegrationBindings } from "./source-resolver";
import { parseStoredCustomWidgetDefinition } from "./stored-definition";
import { getWorkshopWidget, sourceOverridesSchema } from "./workshop-procedures";
import {
  getWorkshopContentHash,
  getWorkshopInstalledHash,
  getWorkshopPermissionsHash,
  parseWorkshopOrigin,
  preserveWorkshopSourceBindings,
  serializeWorkshopOrigin,
} from "./workshop-origin";

const updateInput = z.object({
  id: z.string().min(1).max(100),
  sources: sourceOverridesSchema.default({}),
});

async function getWorkshopUpdate(db: Database, input: z.infer<typeof updateInput>) {
  const stored = await db.query.customWidgetDefinitions.findFirst({
    where: eq(customWidgetDefinitions.id, input.id),
    with: { secrets: true },
  });
  if (!stored) throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget not found" });
  const origin = parseWorkshopOrigin(stored.workshop);
  if (!origin) throw new TRPCError({ code: "BAD_REQUEST", message: "This widget was not installed from the Workshop" });

  const { submission, widget: upstream } = await getWorkshopWidget(origin.submissionId);
  const current = parseStoredCustomWidgetDefinition(stored);
  const unknownSource = Object.keys(input.sources).find((id) => !upstream.sources[id]);
  if (unknownSource) throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown widget source '${unknownSource}'` });
  const preserved = preserveWorkshopSourceBindings(current, upstream);
  const widget = parseCustomWidgetAuthoringInput(() =>
    customWidgetDefinitionSchema.parse({
      ...preserved,
      sources: applyCustomWidgetSourceSetup(preserved.sources, input.sources),
    }),
  );
  const stateFingerprint = getCustomWidgetDefinitionStateFingerprint(stored, stored.secrets);
  // Bind approval to the exact publisher content and local definition/credential state.
  // Source overrides are explicit administrator configuration, never publisher-controlled bindings.
  const reviewToken = getWorkshopContentHash({ stateFingerprint, upstream, revision: submission.revision });
  const permissionsChanged =
    getWorkshopPermissionsHash(upstream) !== origin.permissionsHash ||
    getWorkshopPermissionsHash(current) !== getWorkshopPermissionsHash(widget);
  const preservedSecrets = stored.secrets.filter(({ sourceId }) => {
    const previous = current.sources[sourceId];
    const next = widget.sources[sourceId];
    return previous && next && hasSameSecretBinding(previous, next);
  });
  return {
    stored,
    stateFingerprint,
    upstream,
    submission,
    review: {
      available: submission.revision > origin.revision,
      installedRevision: origin.revision,
      revision: submission.revision,
      submissionId: submission.id,
      changelog: submission.changelog,
      outdated: submission.outdated,
      reportCount: submission.reportCount,
      locallyModified: getWorkshopInstalledHash(current) !== origin.installedHash,
      permissionsChanged,
      reviewToken,
      widget,
      sourceSetup: getCustomWidgetSourceSetups(
        widget.sources,
        preservedSecrets.map(({ sourceId, kind }) => ({ sourceId, kind, hasValue: true })),
      ),
    },
  };
}

export const workshopUpdateProcedures = {
  workshopCheckUpdate: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Review the latest revision of an installed Workshop widget. Requires admin. Get id from customWidget_list. Returns exact revision reviewToken, changed permissions, local edit status and source setup without credentials. No code is changed.",
      },
    })
    .input(updateInput)
    .query(async ({ ctx, input }) => (await getWorkshopUpdate(ctx.db, input)).review),

  workshopUpdate: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        effect: "destructive",
        description:
          "Update an installed Workshop widget in place, retaining its name, placements and compatible configuration/credentials. Requires admin and reviewToken from customWidget_workshopCheckUpdate. Explicitly approve changed permissions and replacing local edits only after user confirmation. Until approved the installed revision keeps running. Changed publisher/local content requires a fresh review.",
      },
    })
    .input(
      updateInput.extend({
        reviewToken: z.string().length(64),
        approvePermissions: z.boolean().default(false),
        overwriteLocalChanges: z.boolean().default(false),
        secrets: customWidgetSecretsInputSchema.default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const update = await getWorkshopUpdate(ctx.db, input);
      const { review } = update;
      if (!review.available)
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No newer Workshop revision is available" });
      if (review.reviewToken !== input.reviewToken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Workshop content or local configuration changed. Review the update again.",
        });
      }
      if (review.locallyModified && !input.overwriteLocalChanges) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Confirm replacing local edits before updating this widget",
        });
      }
      if (review.permissionsChanged && !input.approvePermissions) return { status: "approval-required" as const };
      await assertCustomWidgetIntegrationBindings(ctx, review.widget.sources);
      assertSecretSources(review.widget.sources, input.secrets);
      await updateCustomWidgetDefinition(ctx.db, {
        id: input.id,
        definition: review.widget,
        secrets: input.secrets,
        expectedStateFingerprint: update.stateFingerprint,
        workshop: serializeWorkshopOrigin(update.submission, update.upstream, review.widget),
        // SQLite stores seconds. A distinct version makes existing placements normalize
        // newly invalid options even when installation and update occur in the same second.
        updatedAt: new Date(Math.max(Date.now(), update.stored.updatedAt.getTime() + 1000)),
      });
      return { status: "updated" as const, id: input.id, revision: review.revision };
    }),
};
