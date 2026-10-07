import { generateOpenApiDocument } from "trpc-to-openapi";

import { API_KEY_HEADER_NAME } from "@homarr/auth/api-key";

import { createTRPCRouter } from "./trpc";
import { restResponseDefinitions } from "./rest/responses";
import { restInputDefinitions } from "./rest/procedure";
import { mediaUploadPaths } from "./rest/media-upload";
export { createMediaUploadResponseAsync } from "./rest/media-upload";
import { widgetCatalogRouter } from "./rest/widget-catalog";
import { restRouter } from "./rest/router";

export { normalizeRecursiveJsonSchemasForScalar } from "./open-api-scalar";

export const openApiRouter = createTRPCRouter({ widgetCatalog: widgetCatalogRouter, rest: restRouter });

export const openApiDocument = (base: string) => {
  const document = generateOpenApiDocument(openApiRouter, {
    title: "Homarr API documentation",
    version: "1.2.0",
    baseUrl: base,
    docsUrl: "https://homarr.dev",
    paths: mediaUploadPaths,
    defs: { ...restResponseDefinitions, ...restInputDefinitions } as Parameters<
      typeof generateOpenApiDocument
    >[1]["defs"],
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
