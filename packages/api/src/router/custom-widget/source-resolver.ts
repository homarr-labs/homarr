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

export async function assertCustomWidgetIntegrationBindings(
  context: IntegrationHttpContext,
  sources: Record<string, CustomWidgetSource>,
) {
  const integrationSources = Object.values(sources).filter(
    (source): source is Extract<CustomWidgetSource, { type: "integration" }> =>
      source.type === "integration" && Boolean(source.integrationId),
  );
  for (const chunk of splitToChunksWithNItems(integrationSources, 4)) {
    const results = await Promise.allSettled(chunk.map((source) => resolveIntegration(context, source)));
    // Keep the first source's validation error even when a later lookup finishes first.
    for (const result of results) {
      if (result.status === "rejected") throw result.reason;
    }
  }
}

async function resolveIntegration(
  context: IntegrationHttpContext,
  source: Extract<CustomWidgetSource, { type: "integration" }>,
) {
  if (!source.integrationId) {
    throw new ApiError({
      code: "PRECONDITION_FAILED",
      message: "Select an existing integration for this widget source",
    });
  }
  const integration = await getIntegrationForHttpRequest(context, source.integrationId);
  if (integration.kind !== source.integrationKind) {
    throw new ApiError({
      code: "PRECONDITION_FAILED",
      message: "The selected integration is unavailable or has a different type",
    });
  }
  return integration;
}

export async function getCustomWidgetIntegrationCacheVersion(
  context: IntegrationHttpContext,
  source: Extract<CustomWidgetSource, { type: "integration" }>,
) {
  return getIntegrationHttpCacheVersion(await resolveIntegration(context, source));
}

export async function resolveCustomWidgetSource(
  context: IntegrationHttpContext,
  source: CustomWidgetSource,
  request: Pick<CustomJsxRequest, "kind" | "method" | "auth">,
  getSecrets: () => Array<{ kind: string; value: string }>,
): Promise<
  Pick<
    CustomWidgetHttpRequest,
    | "baseUrl"
    | "networkScope"
    | "auth"
    | "tls"
    | "pathPrefix"
    | "redactSecrets"
    | "resolveConnectionAsync"
    | "executeDelegatedRequest"
  > & {
    cacheVersion: string;
  }
> {
  if (source.type !== "integration") {
    const authType = getCustomWidgetSourceAuthType(source);
    let auth: CustomWidgetHttpRequest["auth"];
    if (request.auth !== "none" && authType !== "none") {
      auth = { type: authType, secrets: getSecrets() };
      if (typeof source.auth === "object") auth.headerName = source.auth.name;
    }
    return { baseUrl: source.baseUrl, networkScope: source.networkScope, auth, cacheVersion: "" };
  }
  const integration = await resolveIntegration(context, source);
  const origin = await getFederationOrigin(context, integration.id);
  if (origin) {
    return {
      // Render only a relative operation; the private URL is resolved on the source.
      baseUrl: "https://federated.invalid/",
      networkScope: "loopback",
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
  return getIntegrationHttpConnection(integration, request.auth !== "none");
}

const delegatedResponseSchema = z.object({
  ok: z.boolean(),
  status: z.number().int().min(100).max(599),
  statusText: z.string().max(512),
  data: z.json(),
});
