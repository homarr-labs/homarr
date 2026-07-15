import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { permissionRequiredProcedure } from "../../trpc";
import { previewSessionRequestSchema, recordPreviewJournal } from "./preview-procedure-helpers";
import { executeCustomWidgetRequest } from "./request-executor";
import { renderRequestBody, renderRequestTarget } from "./request-manifest";
import { acquireCustomWidgetRequestLimit } from "./request-limits";
import { getPreviewSession, getPreviewSessionSecrets } from "./preview-sessions";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");

export const previewActionProcedures = {
  simulatePreviewAction: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Validate and simulate one named custom-widget action without sending a network request. REQUIRED: sessionId from customWidget_preview, action requestId, and typed params. Confirms parameter substitution and records a simulated journal entry. Returns requiredPermission as the action's minimum board permission (view, modify, or full), not as an execution result. This MCP tool never enables or executes live actions.",
      },
    })
    .input(previewSessionRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.sessionId, ctx.session.user.id);
      const request = session.requests.find(
        (candidate) => candidate.id === input.requestId && candidate.kind === "action",
      );
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Preview action was not found" });
      renderRequestTarget(session.baseUrl, request, input.params);
      renderRequestBody(request.bodyTemplate, input.params);
      await recordPreviewJournal(session, {
        requestId: request.id,
        kind: "action",
        method: request.method,
        pathTemplate: request.pathTemplate,
        status: null,
        durationMs: 0,
        simulated: true,
      });
      return {
        ok: true,
        simulated: true as const,
        requestId: request.id,
        method: request.method,
        requiredPermission: request.minimumBoardPermission,
      };
    }),
  previewAction: adminProcedure
    .input(previewSessionRequestSchema.extend({ confirmed: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.sessionId, ctx.session.user.id);
      const request = session.requests.find(
        (candidate) => candidate.id === input.requestId && candidate.kind === "action",
      );
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Preview action was not found" });
      const targetUrl = renderRequestTarget(session.baseUrl, request, input.params);
      const body = renderRequestBody(request.bodyTemplate, input.params);
      if (!session.liveActions) {
        await recordPreviewJournal(session, {
          requestId: request.id,
          kind: "action",
          method: request.method,
          pathTemplate: request.pathTemplate,
          status: null,
          durationMs: 0,
          simulated: true,
        });
        return { ok: true, status: 0, statusText: "Simulated", data: null, simulated: true as const };
      }
      if (request.method === "DELETE" && input.confirmed !== true) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "DELETE actions require confirmation" });
      }
      const release = await acquireCustomWidgetRequestLimit({
        category: request.method === "DELETE" ? "delete" : "action",
        userId: ctx.session.user.id,
        itemId: `preview:${session.id}`,
        definitionId: session.definitionId ?? `preview:${session.id}`,
      });
      const startedAt = Date.now();
      try {
        const response = await executeCustomWidgetRequest({
          baseUrl: session.baseUrl,
          targetUrl,
          method: request.method,
          body,
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
          kind: "action",
        });
        await recordPreviewJournal(session, {
          requestId: request.id,
          kind: "action",
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
          simulated: false as const,
        };
      } finally {
        await release();
      }
    }),
};
