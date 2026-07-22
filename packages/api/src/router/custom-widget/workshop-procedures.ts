import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import {
  applyCustomWidgetSourceSetup,
  CUSTOM_WIDGET_SCHEMA,
  customWidgetDefinitionSchema,
  customWidgetIdentifierSchema,
  customWidgetSecretsInputSchema,
  getCustomWidgetSecretRequirements,
  getCustomWidgetSourceSetups,
} from "@homarr/custom-widgets/core";
import { WorkshopBackend } from "@homarr/workshop/backend";
import { validateWorkshopWidget, WORKSHOP_API_URL } from "@homarr/workshop/schema";

import { permissionRequiredProcedure } from "../../trpc";
import { insertCustomWidgetDefinition } from "./definition-insert";
import { assertSecretSources } from "./secret-policy";

const manageProcedure = permissionRequiredProcedure.requiresPermission("custom-widget-manage");
const workshop = new WorkshopBackend(process.env.WORKSHOP_API_URL ?? WORKSHOP_API_URL);

async function getWorkshopWidget(submissionId: string) {
  try {
    const submission = await workshop.get(submissionId);
    if (submission.type !== "customWidget" || submission.widgetSchema !== CUSTOM_WIDGET_SCHEMA) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Workshop submission is not a compatible Custom JSX widget",
      });
    }
    const validation = validateWorkshopWidget(submission.content);
    if (!validation.success) {
      throw new TRPCError({ code: "BAD_REQUEST", message: validation.error });
    }
    return { submission, widget: validation.data };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: error instanceof Error ? error.message : "Workshop is unavailable",
      cause: error,
    });
  }
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
  workshopSearch: manageProcedure
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
            .filter((item) => item.widgetSchema === CUSTOM_WIDGET_SCHEMA)
            .map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              authorName: item.authorName,
              score: item.score,
              revision: item.revision,
              outdated: item.outdated,
              reportCount: item.reportCount,
            })),
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: error instanceof Error ? error.message : "Workshop is unavailable",
          cause: error,
        });
      }
    }),

  workshopGet: manageProcedure
    .meta({ mcp: { enabled: true, description: "Get and validate one Workshop Custom JSX widget." } })
    .input(z.object({ submissionId: z.string().min(1) }))
    .query(async ({ input }) => {
      const { submission, widget } = await getWorkshopWidget(input.submissionId);
      return {
        submission: {
          id: submission.id,
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
        hasActions: Object.values(widget.requests).some((request) => request.kind === "action"),
        methods: [...new Set(Object.values(widget.requests).map((request) => request.method))],
        permissions: [...new Set(Object.values(widget.requests).map((request) => request.permission))],
      };
    }),

  workshopInstall: manageProcedure
    .meta({ mcp: { enabled: true, description: "Install one validated Workshop Custom JSX widget." } })
    .input(
      z.object({
        submissionId: z.string().min(1),
        name: z.string().trim().min(1).max(128).optional(),
        sources: sourceOverridesSchema.default({}),
        secrets: customWidgetSecretsInputSchema.default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.secrets.length > 0 && !ctx.session.user.permissions.includes("custom-widget-secret-write")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Writing Workshop widget credentials requires dedicated permission",
        });
      }
      const { widget } = await getWorkshopWidget(input.submissionId);
      const unknownSource = Object.keys(input.sources).find((sourceId) => !widget.sources[sourceId]);
      if (unknownSource) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown Workshop widget source '${unknownSource}'` });
      }
      const configured = customWidgetDefinitionSchema.parse({
        ...widget,
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
      const id = await insertCustomWidgetDefinition(ctx.db, configured, ctx.session.user.id, input.secrets);
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
