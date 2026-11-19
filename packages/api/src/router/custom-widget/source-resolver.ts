import { ApiError } from "../../procedure";

import { splitToChunksWithNItems } from "@homarr/common";
import type { CustomJsxRequest, CustomWidgetSource } from "@homarr/custom-widgets/core";
import { getCustomWidgetSourceAuthType } from "@homarr/custom-widgets/core";
import type { CustomWidgetHttpRequest } from "@homarr/custom-widgets/server";
import { assertJsonBudget, CustomWidgetDomainError, MAX_RESPONSE_BODY_BYTES } from "@homarr/custom-widgets/server";
import { z } from "zod/v4";

import { callFederatedProcedure, getFederationOrigin } from "../../federation/client";

import type { IntegrationHttpContext } from "../integration/integration-http";
import {
  getIntegrationForHttpRequest,
  getIntegrationHttpCacheVersion,
  getIntegrationHttpConnection,
} from "../integration/integration-http";

type IntegrationSource = Extract<CustomWidgetSource, { type: "integration" }>;

export async function assertCustomWidgetIntegrationBindings(
  context: IntegrationHttpContext,
  sources: Record<string, CustomWidgetSource>,
) {
  const integrationSources = Object.values(sources).filter(
    (source): source is IntegrationSource => source.type === "integration" && Boolean(source.integrationId),
  );
  const resolveIntegration = createIntegrationResolver(context);
  for (const chunk of splitToChunksWithNItems(integrationSources, 4)) {
    const results = await Promise.allSettled(chunk.map(resolveIntegration));
    // Keep the first source's validation error even when a later lookup finishes first.
    for (const result of results) {
      if (result.status === "rejected") throw result.reason;
    }
  }
}

function createIntegrationResolver(context: IntegrationHttpContext) {
  const pending = new Map<string, ReturnType<typeof getIntegrationForHttpRequest>>();
  return async (source: IntegrationSource) => {
    if (!source.integrationId) {
      throw new ApiError({
        code: "PRECONDITION_FAILED",
        message: "Select an existing integration for this widget source",
      });
    }
    let lookup = pending.get(source.integrationId);
    if (!lookup) {
      lookup = getIntegrationForHttpRequest(context, source.integrationId);
      pending.set(source.integrationId, lookup);
    }
    const integration = await lookup;
    if (integration.kind !== source.integrationKind) {
      throw new ApiError({
        code: "PRECONDITION_FAILED",
        message: "The selected integration is unavailable or has a different type",
      });
    }
    return integration;
  };
}

type SourceConnection = Pick<
  CustomWidgetHttpRequest,
  "baseUrl" | "auth" | "tls" | "pathPrefix" | "redactSecrets" | "resolveConnectionAsync" | "executeDelegatedRequest"
> & {
  cacheVersion: string;
};

// Keep permission and credential snapshots within one invocation. Every later
// widget request creates a fresh resolver and rechecks integration access.
export function createCustomWidgetSourceResolver(context: IntegrationHttpContext) {
  const resolveIntegration = createIntegrationResolver(context);
  const connections = new Map<string, ReturnType<typeof getIntegrationHttpConnection>>();
  return {
    async getIntegrationCacheVersion(source: IntegrationSource) {
      return getIntegrationHttpCacheVersion(await resolveIntegration(source));
    },
    async resolveSource(
      source: CustomWidgetSource,
      request: Pick<CustomJsxRequest, "kind" | "method" | "auth">,
      getSecrets: () => Array<{ kind: string; value: string }>,
    ): Promise<SourceConnection> {
      if (source.type !== "integration") {
        const authType = getCustomWidgetSourceAuthType(source);
        let auth: CustomWidgetHttpRequest["auth"];
        if (request.auth !== "none" && authType !== "none") {
          auth = { type: authType, secrets: getSecrets() };
          if (typeof source.auth === "object") {
            if (source.auth.type === "headers") auth.headerSlots = source.auth.headers;
            else auth.headerName = source.auth.name;
          }
        }
        let redactSecrets: CustomWidgetHttpRequest["redactSecrets"];
        if (auth?.type === "headers") redactSecrets = auth.secrets;
        return { baseUrl: source.baseUrl, auth, redactSecrets, cacheVersion: "" };
      }
      const integration = await resolveIntegration(source);
      const origin = await getFederationOrigin(context, integration.id);
      if (origin) {
        return {
          // Render only a relative operation; the private URL is resolved on the source.
          baseUrl: "https://federated.invalid/",
          cacheVersion: getIntegrationHttpCacheVersion(integration),
          executeDelegatedRequest: async (operation, signal) => {
            try {
              const response = await callFederatedProcedure(
                context,
                origin.connectionId,
                ["federation", "executeSource"],
                {
                  integrationId: origin.remoteIntegrationId,
                  operation: { ...operation, authenticate: request.auth !== "none" },
                },
                { signal },
              );
              const parsed = delegatedResponseSchema.parse(response);
              assertJsonBudget(parsed.data);
              if (new TextEncoder().encode(JSON.stringify(parsed.data)).byteLength > MAX_RESPONSE_BODY_BYTES) {
                throw new CustomWidgetDomainError({
                  code: "PAYLOAD_TOO_LARGE",
                  message: "Response exceeds the 1 MiB limit",
                });
              }
              return parsed;
            } catch (error) {
              if (error instanceof CustomWidgetDomainError) throw error;
              if (typeof error === "object" && error !== null && "code" in error && error.code === "FORBIDDEN") {
                throw new CustomWidgetDomainError({
                  code: "FORBIDDEN",
                  message: "Worker access to the integration was denied",
                });
              }
              throw new CustomWidgetDomainError({ code: "BAD_GATEWAY", message: "Integration worker request failed" });
            }
          },
        };
      }

      const key = `${integration.id}:${request.auth}`;
      let connection = connections.get(key);
      if (!connection) {
        connection = getIntegrationHttpConnection(integration, request.auth !== "none");
        connections.set(key, connection);
      }
      return connection;
    },
  };
}

export async function resolveCustomWidgetSource(
  context: IntegrationHttpContext,
  ...args: Parameters<ReturnType<typeof createCustomWidgetSourceResolver>["resolveSource"]>
) {
  return createCustomWidgetSourceResolver(context).resolveSource(...args);
}

const delegatedResponseSchema = z.object({
  ok: z.boolean(),
  status: z.number().int().min(100).max(599),
  statusText: z.string().max(512),
  data: z.json(),
});
