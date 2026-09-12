import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";
import {
  customWidgetDefinitionSchema,
  customWidgetWorkshopOriginSchema,
  hasSameCustomWidgetSourceAuthentication,
  getCustomWidgetIntegrationOptionIds,
  toPortableCustomWidgetDefinition,
} from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
import { parseStoredCustomWidgetDefinition, serializeCustomWidgetDefinition } from "./stored-definition";
import {
  createWorkshopOrigin,
  getWorkshopSubmissionUrl,
  getWorkshopWidget,
  widgetFingerprint,
} from "./workshop-service";
import {
  assertWorkshopReviewedState,
  getWorkshopInstalled,
  replaceWorkshopInstalled,
  workshopInstalledState,
} from "./workshop-storage";

function sameSourceBindings(left: HomarrCustomWidgetV2, right: HomarrCustomWidgetV2) {
  if (Object.keys(left.sources).length !== Object.keys(right.sources).length) return false;
  return Object.entries(left.sources).every(([id, source]) => {
    const incoming = right.sources[id];
    return incoming && hasSameCustomWidgetSourceAuthentication(source, incoming);
  });
}

function withLocalSources(incoming: HomarrCustomWidgetV2, current: HomarrCustomWidgetV2) {
  const integrationOptions = getCustomWidgetIntegrationOptionIds(incoming);
  const portable = toPortableCustomWidgetDefinition(incoming);
  return customWidgetDefinitionSchema.parse({
    ...portable,
    options: Object.fromEntries(
      Object.entries(portable.options).map(([id, option]) => {
        const local = current.options[id];
        if (!local || !integrationOptions.has(id)) return [id, option];
        if (
          local.control !== "integration" ||
          option.control !== "integration" ||
          JSON.stringify(local.integrationKinds?.toSorted() ?? []) !==
            JSON.stringify(option.integrationKinds?.toSorted() ?? [])
        ) {
          return [id, option];
        }
        return [id, { ...option, default: local.default }];
      }),
    ),
    sources: Object.fromEntries(
      Object.entries(incoming.sources).map(([id, source]) => {
        const local = current.sources[id];
        if (!local) return [id, source];
        return [id, { ...source, baseUrl: local.baseUrl, networkScope: local.networkScope }];
      }),
    ),
  });
}

const fingerprint = z.string().regex(/^[a-f0-9]{64}$/u);
const idInput = z.object({ id: z.string().min(1).max(128) });
const reviewedInput = idInput.extend({ expectedFingerprint: fingerprint, expectedState: fingerprint });
const previousPackageSchema = z.object({
  widget: customWidgetDefinitionSchema,
  origin: customWidgetWorkshopOriginSchema,
});

export const workshopUpdateProcedures = {
  workshopRollbackReview: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(idInput)
    .query(async ({ ctx, input }) => {
      const { row, widget } = await getWorkshopInstalled(ctx.db, input.id, false);
      return {
        rollbackAvailable: Boolean(row.previousPackage),
        expectedFingerprint: widgetFingerprint(widget),
        expectedState: workshopInstalledState(row),
      };
    }),

  workshopUpdateReview: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Compare an installed widget with its latest Workshop revision without changing it. Requires admin access. Returns content and state fingerprints for workshopUpdateInstall.",
      },
    })
    .input(idInput)
    .query(async ({ ctx, input }) => {
      const { row, origin, widget } = await getWorkshopInstalled(ctx.db, input.id);
      const upstream = await getWorkshopWidget(origin.submissionId);
      return {
        origin,
        url: getWorkshopSubmissionUrl(origin.submissionId),
        revision: upstream.submission.revision,
        current: widget,
        upstream: upstream.widget,
        incoming: withLocalSources(upstream.widget, widget),
        expectedFingerprint: widgetFingerprint(widget),
        expectedState: workshopInstalledState(row),
        upstreamFingerprint: widgetFingerprint(upstream.widget),
        locallyModified: widgetFingerprint(widget, true) !== origin.installedFingerprint,
        sourceBindingChanged: !sameSourceBindings(widget, upstream.widget),
        rollbackAvailable: Boolean(row.previousPackage),
        changelog: upstream.submission.changelog,
      };
    }),

  workshopUpdateInstall: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Install a reviewed Workshop update. Preserves local source URLs and credentials. Requires admin access, review content/state fingerprints, upstream fingerprint, and revision from workshopUpdateReview. Locally modified widgets require installing a separate copy.",
      },
    })
    .input(reviewedInput.extend({ upstreamFingerprint: fingerprint, revision: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { row, origin, widget } = await getWorkshopInstalled(ctx.db, input.id);
      assertWorkshopReviewedState(row, input.expectedState);
      if (
        widgetFingerprint(widget) !== input.expectedFingerprint ||
        widgetFingerprint(widget, true) !== origin.installedFingerprint
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Widget has local changes. Keep it or install the update as a separate copy.",
        });
      }
      const upstream = await getWorkshopWidget(origin.submissionId);
      if (
        upstream.submission.revision !== input.revision ||
        widgetFingerprint(upstream.widget) !== input.upstreamFingerprint
      ) {
        throw new TRPCError({ code: "CONFLICT", message: "Workshop revision changed. Review it again." });
      }
      if (upstream.submission.revision <= origin.revision) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No newer Workshop revision is available" });
      }
      if (!sameSourceBindings(widget, upstream.widget)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Source authentication changed. Install as a separate copy to configure sources.",
        });
      }
      const configured = withLocalSources({ ...upstream.widget, name: widget.name }, widget);
      await replaceWorkshopInstalled(ctx.db, row, {
        ...serializeCustomWidgetDefinition(configured),
        workshopOrigin: JSON.stringify(createWorkshopOrigin(upstream.submission, upstream.widget, configured)),
        previousPackage: JSON.stringify({ widget, origin }),
      });
      return { id: row.id };
    }),

  workshopRollback: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(reviewedInput)
    .mutation(async ({ ctx, input }) => {
      const { row, widget, origin } = await getWorkshopInstalled(ctx.db, input.id, false);
      assertWorkshopReviewedState(row, input.expectedState);
      if (widgetFingerprint(widget) !== input.expectedFingerprint) throw new TRPCError({ code: "CONFLICT" });
      if (!row.previousPackage) throw new TRPCError({ code: "NOT_FOUND" });
      const previous = previousPackageSchema.parse(JSON.parse(row.previousPackage));
      // Local credentials are never rolled back. Refuse rebinding them to a
      // removed source or changed authentication destination.
      if (
        !sameSourceBindings(previous.widget, widget) ||
        previous.origin.endpoint !== origin.endpoint ||
        previous.origin.submissionId !== origin.submissionId
      ) {
        throw new TRPCError({ code: "CONFLICT", message: "Source bindings changed since installation" });
      }
      const restored = withLocalSources(previous.widget, widget);
      await replaceWorkshopInstalled(ctx.db, row, {
        ...serializeCustomWidgetDefinition(restored),
        workshopOrigin: JSON.stringify({ ...previous.origin, installedFingerprint: widgetFingerprint(restored, true) }),
        previousPackage: null,
      });
      return { id: row.id };
    }),

  workshopLink: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(idInput.extend({ submissionId: z.string().min(1).max(128), expectedRevision: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const current = parseStoredCustomWidgetDefinition(row);
      const upstream = await getWorkshopWidget(input.submissionId);
      if (
        upstream.submission.revision !== input.expectedRevision ||
        widgetFingerprint(toPortableCustomWidgetDefinition(current)) !== widgetFingerprint(upstream.widget)
      ) {
        throw new TRPCError({ code: "CONFLICT", message: "Published content does not match the saved widget" });
      }
      await replaceWorkshopInstalled(ctx.db, row, {
        workshopOrigin: JSON.stringify(createWorkshopOrigin(upstream.submission, upstream.widget, current)),
        previousPackage: null,
      });
      return { id: row.id };
    }),
};
