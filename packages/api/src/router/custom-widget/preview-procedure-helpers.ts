import { createLogger } from "@homarr/core/infrastructure/logs";
import type { CustomJsxRequest } from "@homarr/custom-widgets/core";
import { z } from "zod/v4";

import { appendPreviewJournal } from "./preview-sessions";
import { getPreviewSessionSecrets } from "./preview-sessions";
import type { CustomWidgetPreviewSession } from "./preview-sessions";
import { resolveCustomWidgetRequestValues } from "./request-manifest";

const logger = createLogger({ module: "custom-widget-preview" });

export const previewSessionRequestSchema = z.object({
  sessionId: z.string().min(1).describe("The previewSession.id returned by customWidget_previewCreate."),
  requestId: z
    .string()
    .min(1)
    .max(64)
    .describe("One query requestId from customWidget_previewCreate.queries. Test every returned query."),
  params: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .default({})
    .describe("Invocation parameters required by a manual query. Load queries use an empty object."),
});

export const recordPreviewJournal = async (...args: Parameters<typeof appendPreviewJournal>) => {
  try {
    await appendPreviewJournal(...args);
  } catch (error) {
    logger.warn("Failed to append custom widget preview journal", {
      sessionId: args[0].id,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
};

export const getPreviewRequestSource = (session: CustomWidgetPreviewSession, sourceId: string) => {
  const source = session.sources[sourceId];
  if (!source) return null;
  const authType = typeof source.auth === "string" ? source.auth : source.auth.type;
  const auth =
    authType === "none"
      ? undefined
      : {
          type: authType,
          secrets: getPreviewSessionSecrets(session, sourceId),
          headerName:
            typeof source.auth === "object" && source.auth.type === "apiKeyHeader"
              ? source.auth.name
              : typeof source.auth === "object" && source.auth.type === "apiKeyQuery"
                ? source.auth.name
                : undefined,
        };
  return { source, auth };
};

export function resolvePreviewRequestParams(
  request: CustomJsxRequest,
  options: Record<string, unknown>,
  suppliedParams: Record<string, string | number | boolean>,
) {
  return resolveCustomWidgetRequestValues(request, options, suppliedParams);
}
