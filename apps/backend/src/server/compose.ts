import { createPublicHostRuntime } from "./runtime-composition/runtime";
import { createLdapClient } from "@homarr/auth/nitro/verifiers";
import type {
  ProductionSessionIssuerConfiguration,
  ProductionSessionLdapResources,
} from "@homarr/auth/nitro/production-sessions";
import { createId } from "@homarr/common/id";
import { authenticatedRpcReadAccess } from "./runtime-composition/authenticated-rpc";
import type { HostAuthenticationInput } from "./runtime-composition/contracts";
import type { StartupConfiguration } from "./startup-configuration";

export function composeApplication(
  configuration: StartupConfiguration,
  startupSignal: AbortSignal,
  render: Parameters<typeof createPublicHostRuntime>[0]["render"],
) {
  let authentication: HostAuthenticationInput = { kind: "public-only" };
  if (configuration.authentication.kind === "authenticated-read") {
    const input = configuration.authentication;
    const now = Date.now;
    let ldap: ProductionSessionLdapResources = null;
    if (input.ldap) {
      const descriptor = input.ldap;
      ldap = {
        configuration: descriptor.configuration,
        createClient: () => createLdapClient(descriptor.uri),
        createId,
      };
    }
    let oidc: ProductionSessionIssuerConfiguration["oidc"] = null;
    if (input.issuer.oidc) oidc = { ...input.issuer.oidc, fetch };
    authentication = {
      kind: "authenticated-read",
      version: input.build.version,
      createId,
      oidcGroupsLocalManagement: input.issuer.oidc?.groupsLocalManagement ?? false,
      maximumResponseBytes: input.maximumResponseBytes,
      construction: {
        issuer: { ...input.issuer, origin: { ...input.issuer.origin, now }, oidc },
        sql: {
          maximumSnapshotRows: input.maximumSnapshotRows,
          maximumAbsoluteClockSkewMs: input.maximumAbsoluteClockSkewMs,
          sessionMaxAgeMs: input.issuer.maxAgeSeconds * 1000,
          now,
        },
        ldap,
        apiKeys: input.apiKeys,
        requestDeadlineMs: input.requestDeadlineMs,
        demo: input.demo,
        readAccess: authenticatedRpcReadAccess,
      },
    };
  }
  return createPublicHostRuntime({
    configuration: configuration.host,
    startupSignal,
    authentication,
    cultureOptions: () => configuration.culture,
    render,
    reportError(_error, requestId) {
      console.error("Application operation failed", requestId);
    },
  });
}
