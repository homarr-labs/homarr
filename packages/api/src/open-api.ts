import { generateOpenApiDocument } from "trpc-to-openapi";

import { API_KEY_HEADER_NAME } from "@homarr/auth/api-key";

import { appRouter } from "./router/app";
import { boardRouter } from "./router/board";
import { integrationRequestProcedure } from "./router/integration/integration-request";
import { infoRouter } from "./router/info";
import { inviteRouter } from "./router/invite";
import { serverSettingsRouter } from "./router/serverSettings";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export const openApiRouter = createTRPCRouter({
  appRouter,
  boardRouter,
  infoRouter,
  inviteRouter,
  serverSettingsRouter,
  userRouter,
  integration: createTRPCRouter({ request: integrationRequestProcedure }),
});

export const openApiDocument = (base: string) => {
  const document = generateOpenApiDocument(openApiRouter, {
    title: "Homarr API documentation",
    version: "1.1.0",
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
  // These reads support anonymous public resources and API-key-scoped private resources.
  // The generator's boolean `protect` cannot express optional authentication.
  for (const path of ["/api/boards", "/api/apps/{id}"]) {
    const operation = document.paths?.[path]?.get;
    if (operation) operation.security = [{}, { apikey: [] }];
  }
  // Exactly one selector is valid; generated samples otherwise fill all three.
  const integrationBody = document.paths?.["/api/integrations/request"]?.post?.requestBody;
  if (integrationBody && "content" in integrationBody) {
    const json = integrationBody.content["application/json"];
    if (json) json.example = { integrationKind: "sonarr", method: "GET", path: "/api/v3/system/status" };
  }
  return document;
};
