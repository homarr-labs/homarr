import { openapi, OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { SmartCoercionHandlerPlugin } from "@orpc/json-schema";
import { DecoratedProcedure, onError, Procedure } from "@orpc/server";
import type { AnyProcedure } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { z } from "zod/v4";

import { API_KEY_HEADER_NAME } from "@homarr/auth/api-key";

import { appRouter } from "./router/app";
import { boardRouter } from "./router/board";
import { ensureRootCertificateProcedure, getCertificateProcedure } from "./router/certificates/certificate-router";
import { integrationRequestProcedure } from "./router/integration/integration-request";
import { integrationTestStoredConnectionProcedure } from "./router/integration/integration-test-stored-connection";
import { infoRouter } from "./router/info";
import { inviteRouter } from "./router/invite";
import { serverSettingsRouter } from "./router/serverSettings";
import { userRouter } from "./router/user";

export { normalizeRecursiveJsonSchemasForScalar } from "./open-api-scalar";

interface RestMetadata {
  openapi?: {
    enabled?: boolean;
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    path: `/${string}`;
    summary?: string;
    description?: string;
    tags?: string[];
    protect?: boolean;
    deprecated?: boolean;
  };
}

interface RestRouter {
  [key: string]: AnyProcedure | RestRouter;
}

const restErrors = {
  BAD_REQUEST: {},
  UNAUTHORIZED: {},
  FORBIDDEN: {},
  NOT_FOUND: {},
  CONFLICT: {},
  INTERNAL_SERVER_ERROR: {},
};

/** REST is an explicit public contract; RPC-only procedures never become REST endpoints. */
function createRestRouter(router: Record<string, unknown>, path: string[] = []): RestRouter {
  const result: RestRouter = {};
  for (const [key, value] of Object.entries(router)) {
    const procedurePath = [...path, key];
    if (value instanceof Procedure) {
      const metadata = (value["~orpc"].meta as RestMetadata).openapi;
      if (!metadata || metadata.enabled === false) continue;

      const security: Record<string, string[]>[] = [];
      if (metadata.protect) security.push({ apikey: [] });
      result[key] = new DecoratedProcedure(value["~orpc"]).errors(restErrors).meta(
        openapi({
          method: metadata.method,
          path: metadata.path,
          operationId: procedurePath.join("-"),
          summary: metadata.summary,
          description: metadata.description,
          tags: metadata.tags,
          spec: (operation) => ({ ...operation, security, deprecated: metadata.deprecated }),
        }),
      );
      continue;
    }
    if (value && typeof value === "object") {
      const nested = createRestRouter(value as Record<string, unknown>, procedurePath);
      if (Object.keys(nested).length > 0) result[key] = nested;
    }
  }
  return result;
}

export const openApiRouter = createRestRouter({
  appRouter,
  boardRouter,
  infoRouter,
  inviteRouter,
  serverSettingsRouter,
  userRouter,
  certificates: {
    getCertificate: getCertificateProcedure,
    ensureRootCertificate: ensureRootCertificateProcedure,
  },
  integration: {
    request: integrationRequestProcedure,
    testConnection: integrationTestStoredConnectionProcedure,
  },
});

const generator = new OpenAPIGenerator({ converters: [new ZodToJsonSchemaConverter()] });

export function createOpenApiHandler(observeError?: (error: unknown, path: readonly string[]) => void) {
  return new OpenAPIHandler(openApiRouter, {
    plugins: [new SmartCoercionHandlerPlugin({ converters: [new ZodToJsonSchemaConverter()] })],
    interceptors: [onError((error, { path }) => observeError?.(error, path))],
    clientInterceptors: [
      ({ next, ...options }) => {
        const schemas = options.procedure["~orpc"].inputSchemas;
        // An empty HTTP query represents no arguments for a void procedure.
        if (schemas?.length && schemas.every((schema) => schema instanceof z.ZodVoid)) {
          return next({ ...options, input: undefined });
        }
        return next();
      },
    ],
  });
}

export const openApiDocument = async (base: string) => {
  const document = await generator.generate(openApiRouter, {
    version: "3.1.0",
    base: {
      info: {
        title: "Homarr API documentation",
        version: "1.1.0",
      },
      servers: [{ url: base }],
      externalDocs: { url: "https://homarr.dev" },
      components: {
        securitySchemes: {
          apikey: {
            type: "apiKey",
            name: API_KEY_HEADER_NAME,
            description: "API key which can be obtained in the Homarr administration dashboard",
            in: "header",
          },
        },
      },
    },
  });
  // These reads support anonymous public resources and API-key-scoped private resources.
  for (const path of ["/api/boards", "/api/apps/{id}"] as const) {
    const operation = document.paths?.[path]?.get;
    if (operation) operation.security = [{}, { apikey: [] }];
  }
  // Exactly one selector is valid; generated samples otherwise fill all three.
  const integrationBody = document.paths?.["/api/integrations/request"]?.post?.requestBody;
  if (integrationBody && "content" in integrationBody) {
    const json = integrationBody.content["application/json"];
    if (json) json.example = { integrationKind: "sonarr", method: "GET", path: "/api/v3/system/status" };
  }
  const preferenceBody = document.paths?.["/api/users/preferences"]?.patch?.requestBody;
  if (preferenceBody && "content" in preferenceBody) {
    const json = preferenceBody.content["application/json"];
    if (json) {
      json.example = { colorScheme: "light" };
    }
  }
  document.tags = (
    [
      ["boards", "Build dashboards"],
      ["apps", "Manage apps"],
      ["users", "Manage users and preferences"],
      ["settings", "Configure the instance"],
      ["integrations", "Connect integrations"],
      ["invites", "Manage invitations"],
      ["certificates", "Manage trusted certificates"],
      ["info", "Inspect Homarr"],
    ] as const
  ).map(([name, title]) => ({ name, "x-displayName": title }));
  return document;
};
