import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { customWidgetAdminProcedure } from "./feature-flags";
import {
  getPreviewRequestSource,
  previewSessionRequestSchema,
  recordPreviewJournal,
} from "./preview-procedure-helpers";
import { executeCustomWidgetRequest, invalidateCustomWidgetResponseCache } from "./request-executor";
import { renderRequestBody, renderRequestTarget, resolveCustomWidgetRequestValues } from "./request-manifest";
import { acquireCustomWidgetRequestLimit } from "./request-limits";
import { getPreviewSession } from "./preview-sessions";

export const previewActionProcedures = {
  previewAction: customWidgetAdminProcedure
    .meta({
      mcp: { enabled: true, description: "Simulate or run one named action in a custom widget preview session." },
    })
    .input(previewSessionRequestSchema.extend({ confirmed: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.sessionId, ctx.session.user.id);
      const definition = session.requests[input.requestId];
      if (definition?.kind !== "action")
        throw new TRPCError({ code: "NOT_FOUND", message: "Preview action was not found" });
      const request = { id: input.requestId, ...definition };
      const resolved = getPreviewRequestSource(session, request.source);
      if (!resolved) throw new TRPCError({ code: "NOT_FOUND", message: "Preview source was not found" });
      const params = resolveCustomWidgetRequestValues(request, session.options, input.params);
      const targetUrl = renderRequestTarget(resolved.source.baseUrl, request, params);
      const body = renderRequestBody(request, params);
      if (!session.liveActions) {
        await recordPreviewJournal(session, {
          requestId: request.id,
          kind: "action",
          method: request.method,
          path: request.path,
          status: null,
          durationMs: 0,
          simulated: true,
        });
        return { ok: true, status: 0, statusText: "Simulated", data: null, simulated: true as const };
      }
      if ((request.confirmation || request.method === "DELETE") && input.confirmed !== true) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This action requires confirmation" });
      }
      const startedAt = Date.now();
      const response = await executeCustomWidgetRequest(
        {
          baseUrl: resolved.source.baseUrl,
          targetUrl,
          method: request.method,
          body,
          staticHeaders: request.headers,
          auth: request.auth === "none" ? undefined : resolved.auth,
          networkScope: resolved.source.networkScope,
          kind: "action",
        },
        {
          acquireRequestLimit: () =>
            acquireCustomWidgetRequestLimit({
              category: request.method === "DELETE" ? "delete" : "action",
              userId: ctx.session.user.id,
              itemId: `preview:${session.id}`,
              definitionId: session.definitionId ?? `preview:${session.id}`,
            }),
        },
      );
      if (response.ok && request.invalidates?.length) {
        await invalidateCustomWidgetResponseCache(
          request.invalidates.map((requestId) => `custom-jsx:preview:${session.id}:${requestId}:`),
        );
      }
      await recordPreviewJournal(session, {
        requestId: request.id,
        kind: "action",
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
        simulated: false as const,
      };
    }),
};
