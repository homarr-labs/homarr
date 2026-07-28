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
    UNSAFE_ENABLE_MOCK_INTEGRATION: createBooleanSchema(false),
    DEMO_MODE: createBooleanSchema(false),
    DEMO_READ_ONLY: createBooleanSchema(true),
    CUSTOM_WIDGETS_ENABLED: createBooleanSchema(true),
    WORKSHOP_ENABLED: createBooleanSchema(true),
    HOMARR_WEBSITE_URL: publicHttpUrl("HOMARR_WEBSITE_URL").default("https://homarr.dev"),
    WORKSHOP_API_URL: publicHttpUrl("WORKSHOP_API_URL").optional(),
    WORKSHOP_WEB_URL: publicHttpUrl("WORKSHOP_WEB_URL").optional(),
  },
  experimental__runtimeEnv: process.env,
});
