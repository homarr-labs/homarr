import { assertCustomWidgetIntegrationBindings } from "./source-resolver";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { customWidgetCreateSchema, normalizeCustomWidgetAuthoringDefinition } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
import { parseCustomWidgetAuthoringInput } from "./authoring-validation";
import { insertCustomWidgetDefinition } from "./definition-insert";
import { updateCustomWidgetDefinition } from "./definition-update";
import { assertCurrentPreviewEvidence, parsePreviewDefinition } from "./preview-persistence";
import { getPreviewEvidence, getPreviewSession, getPreviewSessionSecrets } from "./preview-sessions";
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
          "Requires administrator permission. Create a Custom JSX widget without reusing a preview. Prefer customWidget_createFromPreview after full preview validation and query checks so the definition is not streamed again.",
      },
    })
    .input(customWidgetCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { secrets, ...candidate } = input;
      const definition = parseCustomWidgetAuthoringInput(() => normalizeCustomWidgetAuthoringDefinition(candidate));
      await assertCustomWidgetIntegrationBindings(ctx, definition.sources);
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
          "Requires administrator permission. Persist an exact tested new-widget preview from customWidget_previewCreate or customWidget_previewReviseTemplate. Edit previews must use customWidget_updateFromPreview. Every query and action in the final preview revision must have current evidence.",
      },
    })
    .input(z.object({ previewSessionId: z.string().min(1), targetBoardId: z.string().min(1).optional() }))
    .mutation(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.previewSessionId, ctx.session.user.id);
      if (session.definitionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This edit preview must update its existing custom widget with customWidget_updateFromPreview",
        });
      }
      const evidence = await getPreviewEvidence(session.id, ctx.session.user.id);
      assertCurrentPreviewEvidence(session, evidence, "creating");
      const definition = parsePreviewDefinition(session);
      const secrets = getPersistedPreviewSecrets(session);
      await assertCustomWidgetIntegrationBindings(ctx, definition.sources);
      assertSecretSources(definition.sources, secrets);
      const id = await insertCustomWidgetDefinition(ctx.db, definition, ctx.session.user.id, secrets);
      logger.info("Created custom widget definition from tested preview", {
        id,
        name: definition.name,
        previewSessionId: session.id,
      });
      return getCreatedCustomWidgetResult(id, input.targetBoardId);
    }),

  updateFromPreview: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Requires administrator permission. Update the existing Custom JSX widget associated with an edit preview, using that exact tested preview revision without creating a duplicate. Every query and action in the final preview revision must have current evidence.",
      },
    })
    .input(z.object({ previewSessionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.previewSessionId, ctx.session.user.id);
      if (!session.definitionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This preview is not associated with an existing custom widget definition",
        });
      }
      if (!session.definitionStateFingerprint) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This edit preview predates safe update persistence. Create a new preview and retry.",
        });
      }
      const evidence = await getPreviewEvidence(session.id, ctx.session.user.id);
      assertCurrentPreviewEvidence(session, evidence, "updating");
      const definition = parsePreviewDefinition(session);
      const secrets = getPersistedPreviewSecrets(session);
      await assertCustomWidgetIntegrationBindings(ctx, definition.sources);
      assertSecretSources(definition.sources, secrets);
      await updateCustomWidgetDefinition(ctx.db, {
        id: session.definitionId,
        definition,
        secrets,
        expectedStateFingerprint: session.definitionStateFingerprint,
      });
      logger.info("Updated custom widget definition from tested preview", {
        id: session.definitionId,
        name: definition.name,
        previewSessionId: session.id,
      });
      return {
        id: session.definitionId,
        managementPath: `/manage/custom-widgets/edit/${session.definitionId}`,
      };
    }),
};

function getPersistedPreviewSecrets(session: Awaited<ReturnType<typeof getPreviewSession>>) {
  return Object.keys(session.sources).flatMap((sourceId) =>
    getPreviewSessionSecrets(session, sourceId).map((secret) => ({ sourceId, ...secret })),
  );
}
