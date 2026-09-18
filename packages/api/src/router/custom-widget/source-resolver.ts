import { TRPCError } from "@trpc/server";

import type { CustomJsxRequest, CustomWidgetSource } from "@homarr/custom-widgets/core";
import { getCustomWidgetSourceAuthType } from "@homarr/custom-widgets/core";
import type { CustomWidgetHttpRequest } from "@homarr/custom-widgets/server";
import { isHttpIntegrationKind } from "@homarr/definitions";

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
  for (const source of Object.values(sources)) {
    if (source.type !== "integration" || !source.integrationId) continue;
    await resolveIntegration(ctx, source);
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
  if (!isHttpIntegrationKind(integration.kind) || integration.kind !== source.integrationKind) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The selected integration is unavailable or has a different type",
    });
  }
  return integration;
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

export async function getCustomWidgetIntegrationCacheVersions(
  ctx: IntegrationHttpContext,
  sources: Record<string, CustomWidgetSource>,
) {
  return Promise.all(
    Object.entries(sources).flatMap(([sourceId, source]) => {
      if (source.type !== "integration") return [];
      return [
        resolveIntegration(ctx, source)
          .then((integration) => `${sourceId}:${getIntegrationHttpCacheVersion(integration)}`)
          .catch(() => `${sourceId}:unavailable`),
      ];
    }),
  );
}
