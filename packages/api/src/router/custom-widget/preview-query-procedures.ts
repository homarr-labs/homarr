import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { permissionRequiredProcedure } from "../../trpc";
import {
  getPreviewRequestSource,
  previewSessionRequestSchema,
  recordPreviewJournal,
} from "./preview-procedure-helpers";
import { executeCustomWidgetRequest } from "./request-executor";
import { hashRuntimeParams, renderRequestBody, renderRequestTarget } from "./request-manifest";
import { acquireCustomWidgetRequestLimit } from "./request-limits";
import { getPreviewJournal, getPreviewSession, setPreviewSessionLiveActions } from "./preview-sessions";

const manageProcedure = permissionRequiredProcedure.requiresPermission("custom-widget-manage");

export const previewQueryProcedures = {
  previewQuery: manageProcedure
    .meta({
      mcp: {
        enabled: true,
        description: "Run one named query from a short-lived custom widget preview session.",
      },
    })
    .input(previewSessionRequestSchema)
    .query(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.sessionId, ctx.session.user.id);
      const request = session.requests.find(
        (candidate) => candidate.id === input.requestId && candidate.kind === "query",
      );
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Preview query was not found" });
      const resolved = getPreviewRequestSource(session, request.sourceId);
      if (!resolved) throw new TRPCError({ code: "NOT_FOUND", message: "Preview source was not found" });
      const targetUrl = renderRequestTarget(resolved.source.baseUrl, request, input.params);
      const body = renderRequestBody(request.bodyTemplate, input.params);
      const release = await acquireCustomWidgetRequestLimit({
        category: "query",
        userId: ctx.session.user.id,
        itemId: `preview:${session.id}`,
        definitionId: session.definitionId ?? `preview:${session.id}`,
      });
      const startedAt = Date.now();
      try {
        const response = await executeCustomWidgetRequest({
          baseUrl: resolved.source.baseUrl,
          targetUrl,
          method: request.method,
          body,
          staticHeaders: request.staticHeaders,
          auth: request.auth === "none" ? undefined : resolved.auth,
          networkScope: resolved.source.networkScope,
          kind: "query",
          cacheKey: `custom-jsx:preview:${session.id}:${request.id}:${hashRuntimeParams(input.params)}`,
          cacheTtlSeconds: request.cacheTtlSeconds,
        });
        await recordPreviewJournal(session, {
          requestId: request.id,
          kind: "query",
          method: request.method,
          pathTemplate: request.pathTemplate,
          status: response.status,
          durationMs: Date.now() - startedAt,
          simulated: false,
        });
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        };
      } finally {
        await release();
      }
    }),

  setPreviewLiveActions: manageProcedure
    .input(z.object({ sessionId: z.string().min(1), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) =>
      setPreviewSessionLiveActions(input.sessionId, ctx.session.user.id, input.enabled),
    ),

  previewJournal: manageProcedure
    .meta({
      mcp: {
        enabled: true,
        description: "Read the redacted request journal for a custom widget preview session.",
      },
    })
    .input(z.object({ sessionId: z.string().min(1) }))
    .query(async ({ ctx, input }) => getPreviewJournal(input.sessionId, ctx.session.user.id)),
};
