import { authenticatedProcedure, sourceProcedure, sourceProjectionMeta } from "../../procedure";
import type { SourceProcedureDescriptor, SourceProjectionMetadata } from "../../procedure";

export const integrationManagementProjectionMetadata = {
  "integration.testConnection": {
    openapi: {
      method: "GET",
      path: "/api/integrations/{id}/test-connection",
      tags: ["integrations"],
      protect: true,
      summary: "Test a saved integration using stored credentials",
      description:
        "Requires full integration access. Runs the native connection check without changing saved configuration. Upstream authentication may establish a session. Success is a connection check, not widget or service acceptance. Failures expose only a safe category, not upstream errors or credentials.",
    },
  },
  "integration.getKinds": {
    mcp: {
      enabled: true,
      description:
        "List integration kinds and required secret fields. Saved integrations can be used with integration_request and Custom Widget sources when permissions.hasFullAccess is true, except iCalendar feeds (iCal) and the TrueNAS WebSocket API, which are not generic HTTP APIs. qBittorrent generic HTTP requires an API key and qBittorrent 5.2.0 or newer. Reuse saved credentials instead of asking for secrets again.",
    },
  },
  "integration.all": {
    mcp: {
      enabled: true,
      description:
        "List accessible configured integrations with id, name, kind, url, and permissions. Use id as integrationId. Native read tools require permissions.hasUseAccess; native action tools require permissions.hasInteractAccess. Custom Widget integration sources and arbitrary HTTP requests require permissions.hasFullAccess, including GET. False means the API key owner lacks that permission level; never bypass it.",
    },
  },
  "integration.search": {
    mcp: {
      enabled: true,
      description:
        "Search integrations by name. REQUIRED: query (search string). OPTIONAL: limit (number, default 10). Returns matching integrations with id (use as integrationId), name, kind, url, and permissions",
    },
  },
  "integration.byId": {
    mcp: {
      enabled: true,
      description:
        "Get integration details by ID, including secrets metadata and linked app. REQUIRED: id (integration ID string)",
    },
  },
  "integration.create": {
    mcp: {
      enabled: true,
      description:
        "Create a new integration (connection to an external service). REQUIRED fields: name, url (http/https), kind, secrets, attemptSearchEngineCreation. The 'secrets' field is REQUIRED and must be a non-empty array — call integration_getKinds first to see which secret kinds each integration type needs. Example for Radarr: secrets=[{kind:'apiKey', value:'your-radarr-api-key'}]. Example for Proxmox: secrets=[{kind:'tokenId', value:'...'}, {kind:'personalAccessToken', value:'...'}, {kind:'realm', value:'pam'}]. The connection is tested before saving — if secrets are wrong, an error is returned. Set attemptSearchEngineCreation to false unless explicitly requested. The 'app' field is optional — pass {id:'...'} to link to an existing app, or omit it. Returns integration details and appId, which is null when no app is linked or created.",
    },
  },
  "integration.delete": {
    mcp: { enabled: true, description: "Delete an integration by ID. REQUIRED: id (integration ID string)" },
  },
} satisfies Partial<Record<SourceProcedureDescriptor["path"], SourceProjectionMetadata>>;

export function integrationManagementProcedure(
  descriptor: SourceProcedureDescriptor & { readonly access: { readonly kind: "protected" } },
) {
  const builder = authenticatedProcedure(descriptor);
  const metadata = Object.entries(integrationManagementProjectionMetadata).find(
    ([path]) => path === descriptor.path,
  )?.[1];
  return metadata ? builder.meta(sourceProjectionMeta(metadata)) : builder;
}

export function integrationManagementPublicProcedure(
  descriptor: SourceProcedureDescriptor & { readonly access: { readonly kind: "public" } },
) {
  const builder = sourceProcedure(descriptor);
  const metadata = Object.entries(integrationManagementProjectionMetadata).find(
    ([path]) => path === descriptor.path,
  )?.[1];
  return metadata ? builder.meta(sourceProjectionMeta(metadata)) : builder;
}
