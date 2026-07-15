import { createLogger } from "@homarr/core/infrastructure/logs";
import { z } from "zod/v4";

import { appendPreviewJournal } from "./preview-sessions";

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
