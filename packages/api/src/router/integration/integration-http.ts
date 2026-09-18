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
import { CustomWidgetDomainError } from "@homarr/custom-widgets/server";
import type { CustomWidgetAuthConfig, CustomWidgetHttpRequest } from "@homarr/custom-widgets/server";
import type { Database } from "@homarr/db";
import { eq, inArray } from "@homarr/db";
import { groupMembers, integrations, integrationGroupPermissions, integrationUserPermissions } from "@homarr/db/schema";
import { isHttpIntegrationKind } from "@homarr/definitions";
import { getIntegrationHttpAuthenticationAsync } from "@homarr/integrations/factory";

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
  // Arbitrary reads can expose credentials or mutate state; bounded native
  // integration operations have a different permission contract.
  if (!integration || !constructIntegrationPermissions(integration, ctx.session).hasFullAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Arbitrary integration requests require full integration access",
    });
  }
  if (!isHttpIntegrationKind(integration.kind)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This integration does not support arbitrary HTTP requests" });
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

export async function getIntegrationHttpConnection(integration: HttpIntegration, authenticate = true) {
  try {
    const secrets = integration.secrets.map(({ kind, value }) => ({ kind, value: decryptSecret(value) }));
    const baseUrl = new URL(integration.url);
    return {
      baseUrl: baseUrl.href,
      networkScope: "loopback" as const,
      pathPrefix: baseUrl.pathname,
      redactSecrets: secrets,
      cacheVersion: getIntegrationHttpCacheVersion(integration),
      resolveConnectionAsync: async () => {
        try {
          let headers: Record<string, string> = {};
          let derivedSecrets: string[] = [];
          if (authenticate) {
            const authentication = await getIntegrationHttpAuthenticationAsync({
              ...integration,
              externalUrl: null,
              decryptedSecrets: secrets,
            });
            headers = authentication.headers;
            derivedSecrets = [...(authentication.redactValues ?? [])];
            for (const [name, value] of Object.entries(headers)) {
              if (name.toLowerCase() === "authorization") {
                derivedSecrets.push(value, value.slice(value.indexOf(" ") + 1));
              }
            }
          }
          const auth: CustomWidgetAuthConfig = {
            type: "integration",
            headers,
            secrets: [...secrets, ...derivedSecrets.map((value) => ({ kind: "authentication", value }))],
          };
          let tls: CustomWidgetHttpRequest["tls"];
          if (baseUrl.protocol === "https:") {
            const [ca, hostnames] = await Promise.all([
              getAllTrustedCertificatesAsync(),
              getTrustedCertificateHostnamesAsync(),
            ]);
            tls = { ca, checkServerIdentity: createCustomCheckServerIdentity(hostnames) };
          }
          return { baseUrl: baseUrl.href, auth, tls, pathPrefix: baseUrl.pathname, redactSecrets: auth.secrets };
        } catch {
          throw new CustomWidgetDomainError({
            code: "BAD_GATEWAY",
            message: "Integration connection could not be resolved",
          });
        }
      },
    };
  } catch {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Integration connection could not be resolved" });
  }
}
