import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { eq } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";
import {
  customWidgetAuthTypes,
  customWidgetDisplayTypes,
  customWidgetMethods,
  customWidgetSecretKinds,
  customJsxDisplayConfigV2Schema,
  displayConfigSchema,
  extractActionButtonDisplay,
  extractDisplayDataWithFallback,
} from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
import { recordPreviewJournal } from "./preview-procedure-helpers";
import { executeCustomWidgetRequest } from "./request-executor";
import { acquireCustomWidgetRequestLimit } from "./request-limits";
import { createPreviewSession, getPreviewSession } from "./preview-sessions";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");

const logger = createLogger({ module: "custom-widget" });

export const previewBaseProcedures = {
  preview: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Test a custom-widget draft through Homarr's hardened preview executor. Admin only. GET only; actions remain simulated. REQUIRED: url, method GET, authType, displayType, displayConfig. OPTIONAL: definitionId reuses that saved widget's stored credentials; omit secrets whenever possible. Returns sanitized response data, HTTP status, and a short-lived preview session for named query testing.",
      },
    })
    .input(
      z.object({
        url: z.string().url(),
        method: z.enum(customWidgetMethods),
        authType: z.enum(customWidgetAuthTypes),
        headerName: z.string().optional(),
        requestBody: z.string().optional(),
        displayType: z.enum(customWidgetDisplayTypes),
        displayConfig: displayConfigSchema,
        secrets: z.array(z.object({ kind: z.enum(customWidgetSecretKinds), value: z.string() })).default([]),
        definitionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const secrets = [...input.secrets];

      if (input.definitionId) {
        const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.definitionId),
          with: { secrets: true },
        });
        if (existing) {
          for (const dbSecret of existing.secrets) {
            if (!secrets.some((s) => s.kind === dbSecret.kind)) {
              secrets.push({ kind: dbSecret.kind, value: decryptSecret(dbSecret.value) });
            }
          }
        }
      }

      const v2Config = customJsxDisplayConfigV2Schema.safeParse(input.displayConfig);
      const previewSession = v2Config.success
        ? await createPreviewSession({
            userId: ctx.session.user.id,
            baseUrl: input.url,
            authType: input.authType,
            headerName: input.headerName,
            secrets,
            networkScope: v2Config.data.networkScope,
            requests: v2Config.data.requests,
            definitionId: input.definitionId,
          })
        : null;
      const storedPreviewSession = previewSession
        ? await getPreviewSession(previewSession.id, ctx.session.user.id)
        : null;

      if (input.method !== "GET") {
        return {
          success: true as const,
          simulated: true as const,
          responseInfo: null,
          rawResponse: null,
          displayData: input.displayType === "actionButton" ? extractActionButtonDisplay(input.displayConfig) : null,
          previewSession,
        };
      }

      const release = await acquireCustomWidgetRequestLimit({
        category: "query",
        userId: ctx.session.user.id,
        itemId: `preview:${ctx.session.user.id}`,
        definitionId: input.definitionId ?? `preview:${ctx.session.user.id}`,
      });
      const startedAt = Date.now();
      try {
        const response = await executeCustomWidgetRequest({
          baseUrl: input.url,
          method: input.method,
          body: undefined,
          auth: { type: input.authType, secrets, headerName: input.headerName },
          networkScope: v2Config.success ? v2Config.data.networkScope : "private",
          kind: "query",
        });
        if (storedPreviewSession) {
          await recordPreviewJournal(storedPreviewSession, {
            requestId: "base",
            kind: "query",
            method: "GET",
            pathTemplate: new URL(input.url).pathname,
            status: response.status,
            durationMs: Date.now() - startedAt,
            simulated: false,
          });
        }
        const responseInfo = { status: response.status, statusText: response.statusText };
        if (!response.ok) {
          return {
            success: false as const,
            error: `HTTP ${response.status}: ${response.statusText}`,
            responseInfo,
            rawResponse: typeof response.data === "string" ? response.data : JSON.stringify(response.data, null, 2),
            previewSession,
          };
        }

        const displayData = extractDisplayDataWithFallback(response.data, input.displayType, input.displayConfig);

        return {
          success: true as const,
          responseInfo,
          rawResponse: typeof response.data === "string" ? response.data : JSON.stringify(response.data, null, 2),
          displayData,
          previewSession,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error("Custom widget preview failed", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return {
          success: false as const,
          error: error instanceof Error ? error.message : "Failed to fetch data",
          responseInfo: null,
          rawResponse: null,
          previewSession,
        };
      } finally {
        await release();
      }
    }),
};
