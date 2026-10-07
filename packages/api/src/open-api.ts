import { generateOpenApiDocument } from "trpc-to-openapi";

import { API_KEY_HEADER_NAME } from "@homarr/auth/api-key";
import { defaultHeaderPreferences } from "@homarr/validation/header-preferences";

import { createTRPCRouter } from "./trpc";
import { restResponseDefinitions } from "./rest/responses";
import { restInputDefinitions, restRequestBodies } from "./rest/procedure";
import { mediaUploadPaths } from "./rest/media-upload";
export { createMediaUploadResponseAsync } from "./rest/media-upload";
import { widgetCatalogRouter } from "./rest/widget-catalog";
import { restRouter } from "./rest/router";
import { describeApiDocument } from "./rest/documentation";

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
  for (const item of Object.values(document.paths ?? {})) {
    for (const operation of Object.values(item ?? {})) {
      if (!operation || typeof operation !== "object" || !("operationId" in operation)) continue;
      const body = operation.requestBody;
      const schema = restRequestBodies[operation.operationId];
      if (!schema || !body || !("content" in body)) continue;
      const json = body.content["application/json"];
      if (json) json.schema = schema;
    }
  }
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
  describeApiDocument(document);
  const preferenceBody = document.paths?.["/api/users/preferences"]?.patch?.requestBody;
  if (preferenceBody && "content" in preferenceBody) {
    const json = preferenceBody.content["application/json"];
    if (json)
      json.examples = {
        singlePreference: { summary: "Change only the color scheme", value: { colorScheme: "light" } },
        headerDisplay: { summary: "Change only header visibility", value: { headerPreferences: { visible: false } } },
        searchBehavior: {
          summary: "Change search behavior together",
          value: { openSearchInNewTab: false, ddgBangs: false },
        },
      };
  }
  const settingsBody = document.paths?.["/api/settings"]?.patch?.requestBody;
  if (settingsBody && "content" in settingsBody) {
    const json = settingsBody.content["application/json"];
    if (json)
      json.examples = {
        boardDefault: {
          summary: "Change one board default",
          value: { settingsKey: "board", value: { enableStatusByDefault: false } },
        },
        loginBranding: {
          summary: "Change one nested branding field",
          value: { settingsKey: "branding", value: { authBranding: { showLogo: false } } },
        },
      };
  }
  for (const method of ["get", "patch"] as const) {
    const response = document.paths?.["/api/users/preferences"]?.[method]?.responses?.["200"];
    if (!response || !("content" in response)) continue;
    const json = response.content?.["application/json"];
    if (json)
      json.example = {
        userId: "example-user",
        colorScheme: "light",
        byteUnitSystem: "binary",
        firstDayOfWeek: 0,
        pingIconsEnabled: true,
        enableRightClickOnWidgets: true,
        homeBoardId: null,
        mobileHomeBoardId: null,
        defaultSearchEngineId: null,
        openSearchInNewTab: true,
        ddgBangs: true,
        headerPreferences: defaultHeaderPreferences,
      };
  }
  return document;
};
