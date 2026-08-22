import { createBooleanSchema, createEnv } from "@homarr/core/infrastructure/env";
import { z } from "zod/v4";

export const baseUrlSchema = z.url({ protocol: /^https?$/ }).refine((value) => {
  const url = new URL(value);
  return !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
}, "BASE_URL must be an HTTP(S) origin without credentials, a path, query parameters, or a fragment");

export const env = createEnv({
  server: {
    BASE_URL: baseUrlSchema.optional(),
    UNSAFE_ENABLE_MOCK_INTEGRATION: createBooleanSchema(false),
    DEMO_MODE: createBooleanSchema(false),
    DEMO_READ_ONLY: createBooleanSchema(true),
  },
  experimental__runtimeEnv: process.env,
});
