import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import {
  applyCustomWidgetSourceSetup,
  customWidgetDefinitionSchema,
  customWidgetIdentifierSchema,
  customWidgetSecretsInputSchema,
  getCustomWidgetSecretRequirements,
  getCustomWidgetSourceSetups,
  toPortableCustomWidgetDefinition,
} from "@homarr/custom-widgets/core";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { isSupportedWorkshopWidgetSchema } from "@homarr/workshop/schema";
import { workshop, getWorkshopSubmissionUrl, getWorkshopWidget, createWorkshopOrigin } from "./workshop-service";
import { permissionRequiredProcedure } from "../../trpc";
import { insertCustomWidgetDefinition } from "./definition-insert";
import { assertSecretSources } from "./secret-policy";
import { configureWorkshopIntegrations } from "./workshop-integration-setup";

const logger = createLogger({ module: "custom-widget:workshop" });

function throwWorkshopUnavailable(
  message: string,
  event: "workshop_widget_lookup_failed" | "workshop_widget_search_failed",
): never {
  logger.error(message, {
    event,
    errorName: "WorkshopBackendError",
  });
  throw new TRPCError({
    code: "BAD_GATEWAY",
    message: "Workshop is unavailable",
  });
}

const workshopSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(200),
  sort: z.enum(["top", "newest", "recent", "discussed"]).default("top"),
  limit: z.number().int().min(1).max(20).default(10),
});

const sourceOverridesSchema = z.record(
  customWidgetIdentifierSchema,
  z.strictObject({
    baseUrl: z.string(),
    networkScope: z.enum(["public", "private", "loopback"]).optional(),
  }),
);

export const workshopProcedures = {
  workshopSearch: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({ mcp: { enabled: true, description: "Search Workshop for Custom JSX widgets." } })
    .input(workshopSearchInputSchema)
    .query(async ({ input }) => {
      try {
        const result = await workshop.list({
          page: 1,
          perPage: input.limit,
          search: input.query,
          sort: input.sort,
          type: "customWidget",
          includeOutdated: true,
        });
        return {
          items: result.items
            .filter((item) => isSupportedWorkshopWidgetSchema(item.widgetSchema))
            .map((item) => ({
              id: item.id,
              url: getWorkshopSubmissionUrl(item.id),
              title: item.title,
              description: item.description,
              authorName: item.authorName,
              score: item.score,
              revision: item.revision,
              outdated: item.outdated,
              reportCount: item.reportCount,
            })),
        };
      } catch {
        throwWorkshopUnavailable("Workshop widget search failed", "workshop_widget_search_failed");
      }
    }),

  workshopGet: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({ mcp: { enabled: true, description: "Get and validate one Workshop Custom JSX widget." } })
    .input(z.object({ submissionId: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      const { submission, widget } = await getWorkshopWidget(input.submissionId);
      const native = Object.values(widget.extensions?.native ?? {});
      return {
        submission: {
          id: submission.id,
          url: getWorkshopSubmissionUrl(submission.id),
          title: submission.title,
          description: submission.description,
          authorName: submission.authorName,
          revision: submission.revision,
          score: submission.score,
          outdated: submission.outdated,
          reportCount: submission.reportCount,
        },
        widget,
        sourceSetup: getCustomWidgetSourceSetups(widget.sources),
        hasActions: [...Object.values(widget.requests), ...native].some((request) => request.kind === "action"),
        methods: [...new Set(Object.values(widget.requests).map((request) => request.method))],
        permissions: [...new Set([...Object.values(widget.requests), ...native].map((request) => request.permission))],
        nativeCapabilities: native.map(({ capability, kind, permission }) => ({ capability, kind, permission })),
      };
    }),

  workshopInstall: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({ mcp: { enabled: true, description: "Install one validated Workshop Custom JSX widget." } })
    .input(
      z.object({
        submissionId: z.string().min(1).max(128),
        expectedRevision: z.number().int().positive().optional(),
        name: z.string().trim().min(1).max(128).optional(),
        sources: sourceOverridesSchema.default({}),
        integrations: z
          .record(customWidgetIdentifierSchema, z.string().min(1).max(128))
          .refine((values) => Object.keys(values).length <= 64)
          .default({}),
        secrets: customWidgetSecretsInputSchema.default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { widget, submission } = await getWorkshopWidget(input.submissionId);
      if (input.expectedRevision !== undefined && submission.revision !== input.expectedRevision) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Workshop revision changed. Review the current revision before installing.",
        });
      }
      const unknownSource = Object.keys(input.sources).find((sourceId) => !widget.sources[sourceId]);
      if (unknownSource) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown Workshop widget source '${unknownSource}'` });
      }
      const portable = toPortableCustomWidgetDefinition(widget);
      const configured = customWidgetDefinitionSchema.parse({
        ...portable,
        options: await configureWorkshopIntegrations(ctx.db, portable, input.integrations),
        name: input.name ?? widget.name,
        sources: applyCustomWidgetSourceSetup(
          widget.sources,
          Object.fromEntries(
            Object.entries(input.sources).map(([sourceId, source]) => [
              sourceId,
              {
                baseUrl: source.baseUrl,
                networkScope: source.networkScope ?? widget.sources[sourceId]?.networkScope ?? "public",
              },
            ]),
          ),
        ),
      });
      assertSecretSources(configured.sources, input.secrets);
      const id = await insertCustomWidgetDefinition(
        ctx.db,
        configured,
        ctx.session.user.id,
        input.secrets,
        undefined,
        createWorkshopOrigin(submission, widget, configured),
      );
      const configuredSecrets = new Set(input.secrets.map((secret) => `${secret.sourceId}:${secret.kind}`));
      return {
        status: "installed" as const,
        definitionId: id,
        sourceSetup: getCustomWidgetSourceSetups(configured.sources, input.secrets),
        missingCredentials: getCustomWidgetSecretRequirements(configured.sources)
          .filter((requirement) => !configuredSecrets.has(`${requirement.sourceId}:${requirement.kind}`))
          .map(({ sourceId, kind }) => ({ sourceId, kind })),
      };
    }),
};
