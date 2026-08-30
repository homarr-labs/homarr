import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import {
  customWidgetCreateSchema,
  customWidgetDefinitionSchema,
  normalizeCustomWidgetAuthoringDefinition,
} from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
import { parseCustomWidgetAuthoringInput } from "./authoring-validation";
import { insertCustomWidgetDefinition } from "./definition-insert";
import { getPreviewJournal, getPreviewSession, getPreviewSessionSecrets } from "./preview-sessions";
import { assertSecretSources } from "./secret-policy";

const logger = createLogger({ module: "custom-widget" });

const getCreatedCustomWidgetResult = (id: string, targetBoardId?: string) => ({
  id,
  managementPath: `/manage/custom-widgets/edit/${id}`,
  nextAction: {
    type: "place-custom-widget" as const,
    widgetKind: "customApi" as const,
    options: { definitionId: id },
    ...(targetBoardId ? { targetBoardId } : {}),
    whenTargetIsKnown: "Call configure_widget now with the requested board and these exact widget options.",
    whenTargetIsUnknown:
      "Call ask_user now with 'Place on a board' and 'Leave unplaced'. Never ask this choice in prose.",
  },
});

export const creationProcedures = {
  create: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Create a Custom JSX widget without reusing a preview. Prefer customWidget_createFromPreview after full preview validation and query checks so the definition is not streamed again.",
      },
    })
    .input(customWidgetCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { secrets, ...candidate } = input;
      const definition = parseCustomWidgetAuthoringInput(() => normalizeCustomWidgetAuthoringDefinition(candidate));
      assertSecretSources(definition.sources, secrets);
      const id = await insertCustomWidgetDefinition(ctx.db, definition, ctx.session.user.id, secrets);
      logger.info("Created custom widget definition", { id, name: definition.name });
      return getCreatedCustomWidgetResult(id);
    }),

  createFromPreview: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Persist the exact tested definition from a customWidget_previewCreate or customWidget_previewReviseTemplate session. Prefer this over resending a large widget to customWidget_create. Every query and action in the final preview revision must have current evidence.",
      },
    })
    .input(z.object({ previewSessionId: z.string().min(1), targetBoardId: z.string().min(1).optional() }))
    .mutation(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.previewSessionId, ctx.session.user.id);
      const journal = await getPreviewJournal(session.id, ctx.session.user.id);
      const unverifiedQueryIds = Object.entries(session.requests).flatMap(([requestId, request]) => {
        if (request.kind !== "query") return [];
        const verified = journal.some(
          (entry) =>
            entry.kind === "query" &&
            entry.requestId === requestId &&
            entry.sessionRevision === session.revision &&
            entry.status !== null &&
            entry.status >= 200 &&
            entry.status < 300,
        );
        return verified ? [] : [requestId];
      });
      if (unverifiedQueryIds.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Test every final preview query successfully before creating the widget: ${unverifiedQueryIds.join(", ")}`,
        });
      }
      const unverifiedActionIds = Object.entries(session.requests).flatMap(([requestId, request]) => {
        if (request.kind !== "action") return [];
        const verified = journal.some((entry) => {
          if (
            entry.kind !== "action" ||
            entry.requestId !== requestId ||
            entry.sessionRevision !== session.revision
          ) {
            return false;
          }
          if (entry.simulated) return true;
          return entry.status !== null && entry.status >= 200 && entry.status < 300;
        });
        return verified ? [] : [requestId];
      });
      if (unverifiedActionIds.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Test every final preview action before creating the widget: ${unverifiedActionIds.join(", ")}`,
        });
      }

      const definition = parseCustomWidgetAuthoringInput(() =>
        customWidgetDefinitionSchema.parse({
          $schema: "homarr-custom-widget-v2",
          name: session.name,
          description: session.description,
          iconUrl: session.iconUrl,
          sources: session.sources,
          requests: session.requests,
          options: session.optionDefinitions,
          template: session.template,
        }),
      );
      const secrets = Object.keys(session.sources).flatMap((sourceId) =>
        getPreviewSessionSecrets(session, sourceId).map((secret) => ({ sourceId, ...secret })),
      );
      assertSecretSources(definition.sources, secrets);
      const id = await insertCustomWidgetDefinition(ctx.db, definition, ctx.session.user.id, secrets);
      logger.info("Created custom widget definition from tested preview", {
        id,
        name: definition.name,
        previewSessionId: session.id,
      });
      return getCreatedCustomWidgetResult(id, input.targetBoardId);
    }),
};
