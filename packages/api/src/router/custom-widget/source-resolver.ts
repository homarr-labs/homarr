import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";

import type { Session } from "@homarr/auth";
import { decryptSecret } from "@homarr/common/server";
import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/core/infrastructure/certificates";
import { createCustomCheckServerIdentity } from "@homarr/core/infrastructure/http";
import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import { integrations } from "@homarr/db/schema";
import type { CustomJsxRequest, CustomWidgetSource } from "@homarr/custom-widgets/core";
import { getCustomWidgetSourceAuthType } from "@homarr/custom-widgets/core";
import type { CustomWidgetHttpRequest } from "@homarr/custom-widgets/server";
import { getCustomWidgetIntegrationConnection } from "@homarr/integrations/custom-widget-source";

import { throwIfActionForbiddenAsync } from "../integration/integration-access";

interface SourceContext {
  db: Database;
  session: Session | null;
}

export async function assertCustomWidgetIntegrationBindings(
  ctx: SourceContext,
  sources: Record<string, CustomWidgetSource>,
) {
  for (const source of Object.values(sources)) {
    if (source.type !== "integration" || !source.integrationId) continue;
    await resolveIntegration(ctx, source, "full");
  }
}

async function resolveIntegration(
  ctx: SourceContext,
  source: Extract<CustomWidgetSource, { type: "integration" }>,
  permission: "use" | "interact" | "full",
) {
  if (!source.integrationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an existing integration for this widget source",
    });
  }
  await throwIfActionForbiddenAsync(ctx, eq(integrations.id, source.integrationId), permission);
  const integration = await ctx.db.query.integrations.findFirst({
    where: eq(integrations.id, source.integrationId),
    with: { secrets: true },
  });
  if (!integration || integration.kind !== source.integrationKind) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The selected integration is unavailable or has a different type",
    });
  }
  return integration;
}

export async function resolveCustomWidgetSource(
  ctx: SourceContext,
  source: CustomWidgetSource,
  request: Pick<CustomJsxRequest, "kind" | "method" | "auth">,
  getSecrets: () => Array<{ kind: string; value: string }>,
): Promise<
  Pick<CustomWidgetHttpRequest, "baseUrl" | "networkScope" | "auth" | "tls" | "pathPrefix"> & { cacheVersion: string }
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
  let permission = "use" as "use" | "interact" | "full";
  if (request.kind === "action" || request.method !== "GET") permission = "interact";
  if (request.method === "DELETE") permission = "full";
  const integration = await resolveIntegration(ctx, source, permission);
  const connection = getCustomWidgetIntegrationConnection({
    ...integration,
    externalUrl: null,
    decryptedSecrets: integration.secrets.map(({ kind, value }) => ({ kind, value: decryptSecret(value) })),
  });
  let tls: CustomWidgetHttpRequest["tls"];
  if (new URL(connection.baseUrl).protocol === "https:") {
    const [ca, hostnames] = await Promise.all([
      getAllTrustedCertificatesAsync(),
      getTrustedCertificateHostnamesAsync(),
    ]);
    tls = { ca, checkServerIdentity: createCustomCheckServerIdentity(hostnames) };
  }
  return {
    ...connection,
    auth: request.auth === "none" ? undefined : connection.auth,
    networkScope: "loopback",
    pathPrefix: new URL(connection.baseUrl).pathname,
    tls,
    cacheVersion: createHash("sha256")
      .update(JSON.stringify([integration.id, integration.kind, integration.url, integration.secrets]))
      .digest("hex")
      .slice(0, 16),
  };
}
