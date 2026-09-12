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
import { getIntegrationHttpAuthenticationAsync } from "@homarr/integrations/factory";
import type { IntegrationHttpAuthentication } from "@homarr/integrations/factory";

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

export async function getIntegrationHttpConnection(integration: HttpIntegration, authenticate = true) {
  try {
    const secrets = integration.secrets.map(({ kind, value }) => ({ kind, value: decryptSecret(value) }));
    let baseUrl = integration.url;
    if (integration.kind === "ical") baseUrl = secrets.find(({ kind }) => kind === "url")?.value ?? "";
    return {
      baseUrl,
      networkScope: "loopback" as const,
      pathPrefix: new URL(baseUrl).pathname,
      redactSecrets: secrets,
      cacheVersion: getIntegrationHttpCacheVersion(integration),
      resolveConnectionAsync: async () => {
        try {
          let authentication: IntegrationHttpAuthentication = {};
          if (authenticate) {
            authentication = await getIntegrationHttpAuthenticationAsync({
              ...integration,
              externalUrl: null,
              decryptedSecrets: secrets,
            });
          }
          const auth = toWidgetAuth(authentication, secrets);
          const url = new URL(authentication.baseUrl ?? baseUrl);
          let tls: CustomWidgetHttpRequest["tls"];
          if (url.protocol === "https:") {
            const [ca, hostnames] = await Promise.all([
              getAllTrustedCertificatesAsync(),
              getTrustedCertificateHostnamesAsync(),
            ]);
            tls = { ca, checkServerIdentity: createCustomCheckServerIdentity(hostnames) };
          }
          return { baseUrl: url.href, auth, tls, pathPrefix: url.pathname, redactSecrets: auth.secrets };
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

function toWidgetAuth(
  authentication: IntegrationHttpAuthentication,
  secrets: CustomWidgetAuthConfig["secrets"],
): CustomWidgetAuthConfig {
  const authSecrets = [...secrets, ...(authentication.redactValues ?? []).map((value) => ({ kind: "session", value }))];
  const refresh = authentication.refreshAsync;
  return {
    ...authentication,
    type: "integration",
    secrets: authSecrets,
    refreshAsync:
      refresh &&
      (async () => {
        try {
          return toWidgetAuth(await refresh(), secrets);
        } catch {
          throw new CustomWidgetDomainError({
            code: "BAD_GATEWAY",
            message: "Integration session could not be refreshed",
          });
        }
      }),
  };
}
