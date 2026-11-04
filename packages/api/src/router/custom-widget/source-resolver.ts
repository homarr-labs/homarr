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

type IntegrationSource = Extract<CustomWidgetSource, { type: "integration" }>;

export async function assertCustomWidgetIntegrationBindings(
  ctx: IntegrationHttpContext,
  sources: Record<string, CustomWidgetSource>,
) {
  const integrationSources = Object.values(sources).filter(
    (source): source is IntegrationSource => source.type === "integration" && Boolean(source.integrationId),
  );
  const resolveIntegration = createIntegrationResolver(ctx);
  for (const chunk of splitToChunksWithNItems(integrationSources, 4)) {
    const results = await Promise.allSettled(chunk.map(resolveIntegration));
    // Keep the first source's validation error even when a later lookup finishes first.
    for (const result of results) {
      if (result.status === "rejected") throw result.reason;
    }
  }
}

function createIntegrationResolver(ctx: IntegrationHttpContext) {
  const pending = new Map<string, ReturnType<typeof getIntegrationForHttpRequest>>();
  return async (source: IntegrationSource) => {
    if (!source.integrationId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Select an existing integration for this widget source",
      });
    }
    let lookup = pending.get(source.integrationId);
    if (!lookup) {
      lookup = getIntegrationForHttpRequest(ctx, source.integrationId);
      pending.set(source.integrationId, lookup);
    }
    const integration = await lookup;
    if (integration.kind !== source.integrationKind) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "The selected integration is unavailable or has a different type",
      });
    }
    return integration;
  };
}

type SourceConnection = Pick<
  CustomWidgetHttpRequest,
  "baseUrl" | "auth" | "tls" | "pathPrefix" | "redactSecrets" | "resolveConnectionAsync"
> & {
  cacheVersion: string;
};

// Keep permission and credential snapshots within one invocation. Every later
// widget request creates a fresh resolver and rechecks integration access.
export function createCustomWidgetSourceResolver(ctx: IntegrationHttpContext) {
  const resolveIntegration = createIntegrationResolver(ctx);
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
        return { baseUrl: source.baseUrl, auth, redactSecrets: auth?.secrets, cacheVersion: "" };
      }
      const integration = await resolveIntegration(source);
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
  ctx: IntegrationHttpContext,
  ...args: Parameters<ReturnType<typeof createCustomWidgetSourceResolver>["resolveSource"]>
) {
  return createCustomWidgetSourceResolver(ctx).resolveSource(...args);
}
