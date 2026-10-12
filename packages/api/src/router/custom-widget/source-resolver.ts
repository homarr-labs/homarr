import { TRPCError } from "@trpc/server";

import { splitToChunksWithNItems } from "@homarr/common";
import type { CustomJsxRequest, CustomWidgetSource } from "@homarr/custom-widgets/core";
import { getCustomWidgetSourceAuthType } from "@homarr/custom-widgets/core";
import type { CustomWidgetHttpRequest } from "@homarr/custom-widgets/server";

import type { IntegrationHttpContext } from "../integration/integration-http";
import {
  getIntegrationForHttpRequest,
  getIntegrationHttpCacheVersion,
  getIntegrationHttpConnection,
} from "../integration/integration-http";

export async function assertCustomWidgetIntegrationBindings(
  ctx: IntegrationHttpContext,
  sources: Record<string, CustomWidgetSource>,
) {
  const integrationSources = Object.values(sources).filter(
    (source): source is Extract<CustomWidgetSource, { type: "integration" }> =>
      source.type === "integration" && Boolean(source.integrationId),
  );
  for (const chunk of splitToChunksWithNItems(integrationSources, 4)) {
    const results = await Promise.allSettled(chunk.map((source) => resolveIntegration(ctx, source)));
    // Keep the first source's validation error even when a later lookup finishes first.
    for (const result of results) {
      if (result.status === "rejected") throw result.reason;
    }
  }
}

async function resolveIntegration(
  ctx: IntegrationHttpContext,
  source: Extract<CustomWidgetSource, { type: "integration" }>,
) {
  if (!source.integrationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an existing integration for this widget source",
    });
  }
  const integration = await getIntegrationForHttpRequest(ctx, source.integrationId);
  if (integration.kind !== source.integrationKind) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The selected integration is unavailable or has a different type",
    });
  }
  return integration;
}

export async function getCustomWidgetIntegrationCacheVersion(
  ctx: IntegrationHttpContext,
  source: Extract<CustomWidgetSource, { type: "integration" }>,
) {
  return getIntegrationHttpCacheVersion(await resolveIntegration(ctx, source));
}

export async function resolveCustomWidgetSource(
  ctx: IntegrationHttpContext,
  source: CustomWidgetSource,
  request: Pick<CustomJsxRequest, "kind" | "method" | "auth">,
  getSecrets: () => Array<{ kind: string; value: string }>,
): Promise<
  Pick<
    CustomWidgetHttpRequest,
    "baseUrl" | "networkScope" | "auth" | "tls" | "pathPrefix" | "redactSecrets" | "resolveConnectionAsync"
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
  const integration = await resolveIntegration(ctx, source);
  return getIntegrationHttpConnection(integration, request.auth !== "none");
}
