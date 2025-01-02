import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const e2eEnv = createEnv({
  shared: {
    E2E_AZURE_OIDC_CLIENT_ID: z.string().nonempty(),
    E2E_AZURE_OIDC_CLIENT_SECRET: z.string().nonempty(),
    E2E_AZURE_OIDC_TENANT_ID: z.string().nonempty(),
    E2E_AZURE_OIDC_PASSWORD: z.string().nonempty(),
    E2E_AZURE_OIDC_EMAIL: z.string().nonempty(),
    E2E_AZURE_OIDC_NAME: z.string().nonempty(),
  },
  runtimeEnv: {
    E2E_AZURE_OIDC_CLIENT_ID: process.env.E2E_AZURE_OIDC_CLIENT_ID,
    E2E_AZURE_OIDC_CLIENT_SECRET: process.env.E2E_AZURE_OIDC_CLIENT_SECRET,
    E2E_AZURE_OIDC_TENANT_ID: process.env.E2E_AZURE_OIDC_TENANT_ID,
    E2E_AZURE_OIDC_PASSWORD: process.env.E2E_AZURE_OIDC_PASSWORD,
    E2E_AZURE_OIDC_EMAIL: process.env.E2E_AZURE_OIDC_EMAIL,
    E2E_AZURE_OIDC_NAME: process.env.E2E_AZURE_OIDC_NAME,
  },
  isServer: true,
});
