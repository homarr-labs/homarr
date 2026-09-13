import { generateOpenApiDocument } from "trpc-to-openapi";

import { API_KEY_HEADER_NAME } from "@homarr/auth/api-key";

import { apiKeysRouter } from "./router/apiKeys";
import { appRouter } from "./router/app";
import { boardRouter } from "./router/board";
import { configRouter } from "./router/config/config-router";
import { groupRouter } from "./router/group";
import { infoRouter } from "./router/info";
import { integrationRouter } from "./router/integration/integration-router";
import { inviteRouter } from "./router/invite";
import { searchEngineRouter } from "./router/search-engine/search-engine-router";
import { serverSettingsRouter } from "./router/serverSettings";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export const openApiRouter = createTRPCRouter({
  apiKeysRouter,
  appRouter,
  boardRouter,
  configRouter,
  groupRouter,
  infoRouter,
  integrationRouter,
  inviteRouter,
  searchEngineRouter,
  serverSettingsRouter,
  userRouter,
});

export const openApiDocument = (base: string) =>
  generateOpenApiDocument(openApiRouter, {
    title: "Homarr API documentation",
    version: "1.2.0",
    baseUrl: base,
    docsUrl: "https://homarr.dev",
    securitySchemes: {
      apikey: {
        type: "apiKey",
        name: API_KEY_HEADER_NAME,
        description: "API key which can be obtained in the Homarr administration dashboard",
        in: "header",
      },
    },
  });
