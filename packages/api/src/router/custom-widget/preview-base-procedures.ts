import { assertCustomWidgetIntegrationBindings } from "./source-resolver";
import { getCustomWidgetSourceAuthType } from "@homarr/custom-widgets/core";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import {
  collectCustomWidgetRequestReferences,
  customWidgetAuthoringDefinitionSchema,
  customJsxTemplateSchema,
  customWidgetSecretsInputSchema,
  customWidgetTemplateLinesSchema,
  getCustomWidgetConfirmation,
  getCustomWidgetDefaultOptions,
  isCustomWidgetSourceUrlPlaceholder,
  normalizeCustomWidgetAuthoringDefinition,
  validateCustomWidgetOptions,
} from "@homarr/custom-widgets/core";
import type { CustomJsxRequest, CustomWidgetSource } from "@homarr/custom-widgets/core";
import { eq } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";

import { permissionRequiredProcedure } from "../../trpc";
import { parseCustomWidgetAuthoringInput } from "./authoring-validation";
import { getCustomWidgetDefinitionStateFingerprint } from "./definition-update";
import { createPreviewSession, getPreviewSession, revisePreviewSessionTemplate } from "./preview-sessions";
import { hasSameSecretBinding, requiredSecretKinds } from "./secret-policy";
import { parseStoredCustomWidgetDefinition } from "./stored-definition";

const previewCreateInputSchema = z.object({
  definition: customWidgetAuthoringDefinitionSchema,
  secrets: customWidgetSecretsInputSchema.default([]),
  definitionId: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

const previewReviseTemplateInputSchema = z
  .strictObject({
    sessionId: z.string().min(1),
    expectedRevision: z.number().int().nonnegative().optional(),
    template: customJsxTemplateSchema.optional(),
    templateLines: customWidgetTemplateLinesSchema.optional(),
  })
  .superRefine((input, ctx) => {
    if (input.template === undefined && input.templateLines === undefined) {
      ctx.addIssue({ code: "custom", path: ["template"], message: "Provide template or templateLines" });
    }
    if (input.template !== undefined && input.templateLines !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["templateLines"],
        message: "Provide template or templateLines, not both",
      });
    }
  });

const getPreviewEvidenceChecklist = (requests: Record<string, CustomJsxRequest>, sessionId: string) => ({
  queries: Object.entries(requests).flatMap(([requestId, request]) => {
    if (request.kind !== "query") return [];
    return [
      {
        requestId,
        trigger: request.trigger,
        parameterNames: [...collectCustomWidgetRequestReferences(request).params],
        nextStep: `Call customWidget_previewQuery with sessionId '${sessionId}' and requestId '${requestId}'.`,
      },
    ];
  }),
  actions: Object.entries(requests).flatMap(([requestId, request]) => {
    if (request.kind !== "action") return [];
    return [
      {
        requestId,
        method: request.method,
        parameterNames: [...collectCustomWidgetRequestReferences(request).params],
        minimumBoardPermission: request.permission,
        confirmation: getCustomWidgetConfirmation(request),
        invalidates: request.invalidates ?? [],
        nextStep: `Call customWidget_previewAction with sessionId '${sessionId}' and requestId '${requestId}'. Actions are simulated unless live preview actions were explicitly enabled.`,
      },
    ];
  }),
});

const getRequiredSourceConfigurations = (
  sources: Record<string, CustomWidgetSource>,
  requests: Record<string, CustomJsxRequest>,
  secrets: readonly { sourceId: string; kind: string }[],
  sessionId: string,
) =>
  Object.entries(sources).flatMap(([sourceId, source]) => {
    if (source.type === "integration") return [];
    const sourceRequests = Object.values(requests).filter((request) => request.source === sourceId);
    if (sourceRequests.length === 0) return [];
    const configuredSecretKinds = new Set(
      secrets.flatMap((secret) => (secret.sourceId === sourceId ? [secret.kind] : [])),
    );
    const sourceRequiresCredentials = sourceRequests.some((request) => request.auth !== "none");
    const isMissingCredential =
      sourceRequiresCredentials &&
      requiredSecretKinds(getCustomWidgetSourceAuthType(source)).some((kind) => !configuredSecretKinds.has(kind));
    if (!isCustomWidgetSourceUrlPlaceholder(source.baseUrl) && !isMissingCredential) return [];
    return [
      {
        sourceId,
        nextStep: `Call customWidget_configurationRequestUser with previewSessionId '${sessionId}' and sourceId '${sourceId}' before testing preview requests.`,
      },
    ];
  });

const previewCreateProcedure = permissionRequiredProcedure
  .requiresPermission("admin")
  .meta({
    mcp: {
      enabled: true,
      description:
        "Fully validate a complete Custom JSX definition and create a short-lived preview in one call. Pass definition directly as an object, never serialized JSON. Prefer templateLines for multiline JSX. The result lists every query and action that needs evidence before saving.",
    },
  })
  .input(previewCreateInputSchema)
  .mutation(async ({ ctx, input }) => {
    const definition = parseCustomWidgetAuthoringInput(() =>
      normalizeCustomWidgetAuthoringDefinition(input.definition),
    );
    await assertCustomWidgetIntegrationBindings(ctx, definition.sources);
    const options = input.options ?? getCustomWidgetDefaultOptions(definition.options);
    const optionIssues = validateCustomWidgetOptions(definition.options, options);
    if (optionIssues.length > 0) {
      const issue = optionIssues[0];
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: issue ? `${issue.path}: ${issue.message}` : "Preview options are invalid",
      });
    }

    const secrets = [...input.secrets];
    let definitionStateFingerprint: string | undefined;
    let persistenceTool: "customWidget_createFromPreview" | "customWidget_updateFromPreview" =
      "customWidget_createFromPreview";
    if (input.definitionId) {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.definitionId),
        with: { secrets: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
      definitionStateFingerprint = getCustomWidgetDefinitionStateFingerprint(existing, existing.secrets);
      persistenceTool = "customWidget_updateFromPreview";
      const existingDefinition = parseStoredCustomWidgetDefinition(existing);
      for (const [sourceId, existingSource] of Object.entries(existingDefinition.sources)) {
        const submittedSource = definition.sources[sourceId];
        const hasStoredSecrets = existing.secrets.some((secret) => secret.sourceId === sourceId);
        if (!submittedSource || !hasStoredSecrets || hasSameSecretBinding(existingSource, submittedSource)) continue;

        const authType = getCustomWidgetSourceAuthType(submittedSource);
        const missingReplacement = requiredSecretKinds(authType).some(
          (kind) => !secrets.some((secret) => secret.sourceId === sourceId && secret.kind === kind),
        );
        if (missingReplacement) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Source security settings changed; re-enter its credentials to preview this definition",
          });
        }
      }
      for (const secret of existing.secrets) {
        const existingSource = existingDefinition.sources[secret.sourceId];
        const submittedSource = definition.sources[secret.sourceId];
        if (
          existingSource &&
          submittedSource &&
          hasSameSecretBinding(existingSource, submittedSource) &&
          !secrets.some((candidate) => candidate.sourceId === secret.sourceId && candidate.kind === secret.kind)
        ) {
          secrets.push({ sourceId: secret.sourceId, kind: secret.kind, value: decryptSecret(secret.encryptedValue) });
        }
      }
    }

    const invalid = secrets.find((secret) => {
      const source = definition.sources[secret.sourceId];
      const authType = getCustomWidgetSourceAuthType(source);
      const kinds =
        authType === "basic"
          ? ["username", "password"]
          : source && authType && ["bearer", "apiKeyHeader", "apiKeyQuery"].includes(authType)
            ? ["apiKey"]
            : [];
      return !source || !kinds.includes(secret.kind);
    });
    if (invalid) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown secret source '${invalid.sourceId}'` });
    }

    const previewSession = await createPreviewSession({
      userId: ctx.session.user.id,
      sources: definition.sources,
      requests: definition.requests,
      name: definition.name,
      description: definition.description,
      iconUrl: definition.iconUrl,
      template: definition.template,
      optionDefinitions: definition.options,
      options,
      secrets,
      definitionId: input.definitionId,
      definitionStateFingerprint,
    });
    const previewPath = `/manage/custom-widgets/preview/${previewSession.id}`;
    return {
      success: true as const,
      previewSession: {
        id: previewSession.id,
        revision: previewSession.revision,
        expiresAt: previewSession.expiresAt,
        liveActions: previewSession.liveActions,
      },
      previewPath,
      previewUrl: new URL(previewPath, ctx.baseUrl ?? "http://localhost").toString(),
      persistenceTool,
      sourceConfigurations: getRequiredSourceConfigurations(
        definition.sources,
        definition.requests,
        secrets,
        previewSession.id,
      ),
      ...getPreviewEvidenceChecklist(definition.requests, previewSession.id),
    };
  });

export const previewBaseProcedures = {
  previewCreate: previewCreateProcedure,
  previewReviseTemplate: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Replace only the JSX template in an existing preview after a response-driven correction. The inherited sources, requests, options, and secrets are fully revalidated without resending them. Prior evidence becomes stale, so rerun every returned query and action before persistence.",
      },
    })
    .input(previewReviseTemplateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const template = input.template ?? input.templateLines?.join("\n");
      if (template === undefined) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Provide template or templateLines" });
      }
      const revised = await revisePreviewSessionTemplate(
        input.sessionId,
        ctx.session.user.id,
        template,
        input.expectedRevision,
      );
      const session = await getPreviewSession(revised.id, ctx.session.user.id);
      let persistenceTool: "customWidget_createFromPreview" | "customWidget_updateFromPreview" =
        "customWidget_createFromPreview";
      if (session.definitionId) persistenceTool = "customWidget_updateFromPreview";
      const previewPath = `/manage/custom-widgets/preview/${session.id}`;
      return {
        success: true as const,
        evidenceReset: true as const,
        previewSession: {
          id: session.id,
          revision: session.revision,
          expiresAt: session.expiresAt,
          liveActions: session.liveActions,
        },
        previewPath,
        previewUrl: new URL(previewPath, ctx.baseUrl ?? "http://localhost").toString(),
        persistenceTool,
        ...getPreviewEvidenceChecklist(session.requests, session.id),
      };
    }),
  previewGet: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.sessionId, ctx.session.user.id);
      return {
        id: session.id,
        revision: session.revision,
        name: session.name,
        description: session.description,
        iconUrl: session.iconUrl,
        expiresAt: session.expiresAt,
        template: session.template,
        optionDefinitions: session.optionDefinitions,
        options: session.options,
        requests: Object.entries(session.requests).map(([id, request]) => ({
          id,
          kind: request.kind,
          method: request.method,
          minimumBoardPermission: request.permission,
          trigger: request.trigger,
          confirmation: getCustomWidgetConfirmation(request),
          invalidates: request.invalidates,
        })),
        liveActions: session.liveActions,
      };
    }),
};
