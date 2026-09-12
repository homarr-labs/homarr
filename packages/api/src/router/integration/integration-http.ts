import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";

import type { Session } from "@homarr/auth";
import { constructIntegrationPermissions } from "@homarr/auth/shared";
import { decryptSecret } from "@homarr/common/server";
import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/core/infrastructure/certificates";
import { createCustomCheckServerIdentity } from "@homarr/core/infrastructure/http";
import type { CustomWidgetHttpRequest } from "@homarr/custom-widgets/server";
import type { Database } from "@homarr/db";
import { eq, inArray } from "@homarr/db";
import { groupMembers, integrations, integrationGroupPermissions, integrationUserPermissions } from "@homarr/db/schema";
import { IntegrationHttpAuthError, resolveIntegrationHttpAuth } from "@homarr/integrations/http-auth";

export interface IntegrationHttpContext {
  db: Database;
  session: Session | null;
}

export async function getIntegrationForHttpRequest(ctx: IntegrationHttpContext, integrationId: string) {
  const userId = ctx.session?.user.id ?? "";
  const groups = await ctx.db.query.groupMembers.findMany({ where: eq(groupMembers.userId, userId) });
  const integration = await ctx.db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
    with: {
      secrets: true,
      userPermissions: { where: eq(integrationUserPermissions.userId, userId) },
      groupPermissions: {
        where: inArray(integrationGroupPermissions.groupId, groups.map(({ groupId }) => groupId).concat("")),
      },
    },
  });
  // An arbitrary read can expose service credentials or perform a mutation. Native
  // integration use/interact permissions authorize only Homarr's bounded operations.
  if (!integration || !constructIntegrationPermissions(integration, ctx.session).hasFullAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Arbitrary integration requests require full integration access",
    });
  }
  return integration;
}

type HttpIntegration = Awaited<ReturnType<typeof getIntegrationForHttpRequest>>;

export function getIntegrationHttpCacheVersion(integration: HttpIntegration) {
  return createHash("sha256")
    .update(JSON.stringify([integration.id, integration.kind, integration.url, integration.secrets]))
    .digest("hex")
    .slice(0, 16);
}

export async function getIntegrationHttpConnection(integration: HttpIntegration) {
  try {
    const secrets = integration.secrets.map(({ kind, value }) => ({ kind, value: decryptSecret(value) }));
    const auth = resolveIntegrationHttpAuth(integration.kind, secrets);
    const url = new URL(integration.url);
    let tls: CustomWidgetHttpRequest["tls"];
    if (url.protocol === "https:") {
      const [ca, hostnames] = await Promise.all([
        getAllTrustedCertificatesAsync(),
        getTrustedCertificateHostnamesAsync(),
      ]);
      tls = { ca, checkServerIdentity: createCustomCheckServerIdentity(hostnames) };
    }
    return {
      baseUrl: integration.url,
      auth,
      tls,
      networkScope: "loopback" as const,
      pathPrefix: url.pathname,
      redactSecrets: secrets,
      cacheVersion: getIntegrationHttpCacheVersion(integration),
    };
  } catch (error) {
    if (error instanceof IntegrationHttpAuthError) {
      throw new TRPCError({ code: error.code, message: error.message });
    }
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Integration connection could not be resolved" });
  }
}
