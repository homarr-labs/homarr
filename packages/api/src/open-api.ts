import { generateOpenApiDocument } from "trpc-to-openapi";

import { API_KEY_HEADER_NAME } from "@homarr/auth/api-key";
import { defaultHeaderPreferences } from "@homarr/validation/header-preferences";
import { z } from "zod/v4";

import { describeApiDocument } from "./open-api-documentation";

import { apiKeysRouter } from "./router/apiKeys";
import { appRouter } from "./router/app";
import { boardRouter } from "./router/board";
import { configRouter } from "./router/config/config-router";
import { groupRouter } from "./router/group";
import { ensureRootCertificateProcedure, getCertificateProcedure } from "./router/certificates/certificate-router";
import { infoRouter } from "./router/info";
import { integrationRouter } from "./router/integration/integration-router";
import { inviteRouter } from "./router/invite";
import { searchEngineRouter } from "./router/search-engine/search-engine-router";
import { serverSettingsUpdateSchema, serverSettingsRouter } from "./router/serverSettings";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export { normalizeRecursiveJsonSchemasForScalar } from "./open-api-scalar";

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
  certificates: createTRPCRouter({
    getCertificate: getCertificateProcedure,
    ensureRootCertificate: ensureRootCertificateProcedure,
  }),
});

export const openApiDocument = (base: string) => {
  const document = generateOpenApiDocument(openApiRouter, {
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
    if (json) {
      const schema = z.toJSONSchema(userRouter["_def"].record.updatePreferences["_def"].inputs[0] as z.ZodType, {
        io: "input",
      });
      delete schema.$schema;
      json.schema = schema as typeof json.schema;
    }
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
    if (json) {
      const schema = z.toJSONSchema(serverSettingsUpdateSchema, { io: "input" });
      delete schema.$schema;
      json.schema = schema as typeof json.schema;
    }
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
