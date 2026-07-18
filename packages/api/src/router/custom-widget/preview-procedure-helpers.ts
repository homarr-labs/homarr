import { createLogger } from "@homarr/core/infrastructure/logs";
import { z } from "zod/v4";

import { appendPreviewJournal } from "./preview-sessions";
import { getPreviewSessionSecrets } from "./preview-sessions";
import type { CustomWidgetPreviewSession } from "./preview-sessions";

const logger = createLogger({ module: "custom-widget-preview" });

export const previewSessionRequestSchema = z.object({
  sessionId: z.string().min(1),
  requestId: z.string().min(1).max(64),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
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
  const source = session.sources.find((candidate) => candidate.id === sourceId);
  if (!source) return null;
  const auth =
    source.auth.type === "none"
      ? undefined
      : {
          type: source.auth.type,
          secrets: getPreviewSessionSecrets(session, source.id),
          headerName:
            source.auth.type === "apiKeyHeader"
              ? source.auth.headerName
              : source.auth.type === "apiKeyQuery"
                ? source.auth.parameterName
                : undefined,
        };
  return { source, auth };
};
