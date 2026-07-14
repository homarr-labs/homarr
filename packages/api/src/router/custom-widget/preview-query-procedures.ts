import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { permissionRequiredProcedure } from "../../trpc";
import { previewSessionRequestSchema, recordPreviewJournal } from "./preview-procedure-helpers";
import { executeCustomWidgetRequest } from "./request-executor";
import { hashRuntimeParams, renderRequestTarget } from "./request-manifest";
import { acquireCustomWidgetRequestLimit } from "./request-limits";
import {
  getPreviewJournal,
  getPreviewSession,
  getPreviewSessionSecrets,
  setPreviewSessionLiveActions,
} from "./preview-sessions";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");

export const previewQueryProcedures = {
  previewQuery: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Run one named GET query from a short-lived custom-widget preview session. REQUIRED: sessionId from customWidget_preview, requestId declared as a query, and typed params. Uses the hardened executor and returns sanitized response data for another validate/update iteration.",
      },
    })
    .input(previewSessionRequestSchema)
    .query(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.sessionId, ctx.session.user.id);
      const request = session.requests.find(
        (candidate) => candidate.id === input.requestId && candidate.kind === "query",
      );
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Preview query was not found" });
      const targetUrl = renderRequestTarget(session.baseUrl, request, input.params);
      const release = await acquireCustomWidgetRequestLimit({
        category: "query",
        userId: ctx.session.user.id,
        itemId: `preview:${session.id}`,
        definitionId: session.definitionId ?? `preview:${session.id}`,
      });
      const startedAt = Date.now();
      try {
        const response = await executeCustomWidgetRequest({
          baseUrl: session.baseUrl,
          targetUrl,
          method: "GET",
          staticHeaders: request.staticHeaders,
          auth:
            request.auth === "none"
              ? undefined
              : {
                  type: session.authType,
                  secrets: getPreviewSessionSecrets(session),
                  headerName: session.headerName,
                },
          networkScope: session.networkScope,
          kind: "query",
          cacheKey: `custom-jsx:preview:${session.id}:${request.id}:${hashRuntimeParams(input.params)}`,
          cacheTtlSeconds: request.cacheTtlSeconds,
        });
        await recordPreviewJournal(session, {
          requestId: request.id,
          kind: "query",
          method: "GET",
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

  setPreviewLiveActions: adminProcedure
    .input(z.object({ sessionId: z.string().min(1), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) =>
      setPreviewSessionLiveActions(input.sessionId, ctx.session.user.id, input.enabled),
    ),

  previewJournal: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Read the redacted request journal for a custom-widget preview session. REQUIRED: sessionId. Use it to inspect statuses and durations; credentials and parameter values are never returned.",
      },
    })
    .input(z.object({ sessionId: z.string().min(1) }))
    .query(async ({ ctx, input }) => getPreviewJournal(input.sessionId, ctx.session.user.id)),
};
