import { z } from "zod/v4";

import { createBooleanSchema, createEnv } from "@homarr/core/infrastructure/env";
import { normalizeHttpUrl } from "@homarr/workshop/schema";

const publicHttpUrl = (variableName: string) =>
  z.string().transform((value, context) => {
    try {
      return normalizeHttpUrl(value, variableName);
    } catch (error) {
      context.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : `${variableName} is invalid`,
      });
      return z.NEVER;
    }
  });

export const env = createEnv({
  server: {
    KUBERNETES_SERVICE_ACCOUNT_NAME: z.string().optional(),
    DEMO_MODE: createBooleanSchema(false),
    DEMO_READ_ONLY: createBooleanSchema(true),
    HOMARR_WEBSITE_URL: publicHttpUrl("HOMARR_WEBSITE_URL").default("https://homarr.dev"),
    CUSTOM_WIDGET_PACKAGE_PATH: z.string().min(1).optional(),
    CUSTOM_WIDGET_MAX_SERVER_PROCESSES: z.coerce.number().int().min(1).max(128).default(16),
    WORKSHOP_API_URL: publicHttpUrl("WORKSHOP_API_URL").optional(),
    WORKSHOP_WEB_URL: publicHttpUrl("WORKSHOP_WEB_URL").optional(),
  },
  runtimeEnv: {
    KUBERNETES_SERVICE_ACCOUNT_NAME: process.env.KUBERNETES_SERVICE_ACCOUNT_NAME,
    DEMO_MODE: process.env.DEMO_MODE,
    DEMO_READ_ONLY: process.env.DEMO_READ_ONLY,
    HOMARR_WEBSITE_URL: process.env.HOMARR_WEBSITE_URL,
    CUSTOM_WIDGET_PACKAGE_PATH: process.env.CUSTOM_WIDGET_PACKAGE_PATH,
    CUSTOM_WIDGET_MAX_SERVER_PROCESSES: process.env.CUSTOM_WIDGET_MAX_SERVER_PROCESSES,
    WORKSHOP_API_URL: process.env.WORKSHOP_API_URL,
    WORKSHOP_WEB_URL: process.env.WORKSHOP_WEB_URL,
  },
});
