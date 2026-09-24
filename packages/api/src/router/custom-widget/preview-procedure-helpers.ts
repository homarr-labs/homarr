import { resolveCustomWidgetSource } from "./source-resolver";
import { createLogger } from "@homarr/core/infrastructure/logs";
import {
  getCustomWidgetRequiredSecretKinds,
  getCustomWidgetSourceAuthType,
  isCustomWidgetSourceUrlPlaceholder,
} from "@homarr/custom-widgets/core";
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

export async function getPreviewRequestSource(
  ctx: Parameters<typeof resolveCustomWidgetSource>[0],
  session: CustomWidgetPreviewSession,
  request: CustomJsxRequest,
) {
  const source = session.sources[request.source];
  if (!source) return null;
  return resolveCustomWidgetSource(ctx, source, request, () => getPreviewSessionSecrets(session, request.source));
}

export function getPreviewRequestSourceConfigurationFailure(
  session: CustomWidgetPreviewSession,
  request: CustomJsxRequest & { id: string },
) {
  const source = session.sources[request.source];
  if (!source || source.type === "integration") return null;
  let error: string | null = null;
  if (isCustomWidgetSourceUrlPlaceholder(source.baseUrl)) {
    error = `Preview source '${request.source}' URL is a placeholder; complete secure source configuration before testing requests`;
  } else if (request.auth !== "none") {
    const configuredKinds = new Set(getPreviewSessionSecrets(session, request.source).map(({ kind }) => kind));
    const missingKinds = getCustomWidgetRequiredSecretKinds(getCustomWidgetSourceAuthType(source)).filter(
      (kind) => !configuredKinds.has(kind),
    );
    if (missingKinds.length > 0) {
      error = `Preview source '${request.source}' credentials are missing; complete secure source configuration before testing requests`;
    }
  }
  if (error === null) return null;
  return {
    sessionId: session.id,
    requestId: request.id,
    sourceId: request.source,
    ok: false as const,
    status: 0,
    statusText: "Configuration required",
    data: null,
    error,
    requiredNextTool: "customWidget_configurationRequestUser" as const,
  };
}

export function resolvePreviewRequestParams(
  request: CustomJsxRequest,
  options: Record<string, unknown>,
  suppliedParams: Record<string, string | number | boolean>,
) {
  return resolveCustomWidgetRequestValues(request, options, suppliedParams);
}
