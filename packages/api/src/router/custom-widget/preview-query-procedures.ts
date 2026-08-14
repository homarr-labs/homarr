import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { permissionRequiredProcedure } from "../../trpc";
import {
  getPreviewRequestSource,
  previewSessionRequestSchema,
  recordPreviewJournal,
  resolvePreviewRequestParams,
} from "./preview-procedure-helpers";
import { executeCustomWidgetRequest, invalidateCustomWidgetResponseCache } from "./request-executor";
import { hashRuntimeParams, renderRequestBody, renderRequestTarget } from "./request-manifest";
import { acquireCustomWidgetRequestLimit } from "./request-limits";
import { getPreviewJournal, getPreviewSession, setPreviewSessionLiveActions } from "./preview-sessions";

export const previewQueryProcedures = {
  previewRefresh: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ sessionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.sessionId, ctx.session.user.id);
      invalidateCustomWidgetResponseCache([`custom-jsx:preview:${session.id}:`]);
    }),

  previewQuery: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description: "Run one named query from a short-lived custom widget preview session.",
      },
    })
    .input(previewSessionRequestSchema)
    .query(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.sessionId, ctx.session.user.id);
      const definition = session.requests[input.requestId];
      if (definition?.kind !== "query")
        throw new TRPCError({ code: "NOT_FOUND", message: "Preview query was not found" });
      const request = { id: input.requestId, ...definition };
      const resolved = getPreviewRequestSource(session, request.source);
      if (!resolved) throw new TRPCError({ code: "NOT_FOUND", message: "Preview source was not found" });
      const params = resolvePreviewRequestParams(request, session.options, input.params);
      const targetUrl = renderRequestTarget(resolved.source.baseUrl, request, params);
      const body = renderRequestBody(request, params);
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
          staticHeaders: request.headers,
          auth: request.auth === "none" ? undefined : resolved.auth,
          networkScope: resolved.source.networkScope,
          kind: "query",
          cacheKey: `custom-jsx:preview:${session.id}:${request.id}:${hashRuntimeParams(params)}`,
          cacheTtlSeconds: request.cacheSeconds,
        });
        await recordPreviewJournal(session, {
          requestId: request.id,
          kind: "query",
          method: request.method,
          path: request.path,
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

  setPreviewLiveActions: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ sessionId: z.string().min(1), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) =>
      setPreviewSessionLiveActions(input.sessionId, ctx.session.user.id, input.enabled),
    ),

  previewJournal: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description: "Read the redacted request journal for a custom widget preview session.",
      },
    })
    .input(z.object({ sessionId: z.string().min(1) }))
    .query(async ({ ctx, input }) => getPreviewJournal(input.sessionId, ctx.session.user.id)),
};
