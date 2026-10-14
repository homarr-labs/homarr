import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { ORPCError } from "@orpc/server";

import { constructIntegrationPermissions, hasQueryAccessToIntegrationsAsync } from "@homarr/auth/nitro/policy";
import type { IntegrationAccessEvidence, ResourceGrants } from "@homarr/auth/nitro/policy";
import { assertCustomWidgetPathScope, CustomWidgetDomainError } from "@homarr/custom-widgets/server";
import type { CustomWidgetAuthConfig, CustomWidgetHttpRequest } from "@homarr/custom-widgets/server";
import type { Integration, IntegrationSecret } from "@homarr/db/schema";
import { getIntegrationHttpUnavailableReason, getIntegrationKindsByCategory } from "@homarr/definitions";
import type { IntegrationKind, IntegrationPermission } from "@homarr/definitions";
import { withIntegrationRuntimeAsync } from "@homarr/integrations/runtime";
import type { IntegrationRuntimeRequest } from "@homarr/integrations/runtime";
import { z } from "zod/v4";
import type { integrationCreateSchema } from "@homarr/validation/integration";

import type { AuthenticatedBackendContext, BackendPrincipal } from "../../context";
import { authenticatedProcedure } from "../../procedure";
import type { SourceProcedureDescriptor } from "../../procedure";
import { createIntegrationAccessHelpers, withManagementSnapshot } from "../-integration-management/access";
import { resolveConnectionSecretsAsync } from "../-integration-management/connection";
import type { ConnectionForm } from "../-integration-management/connection";
import type { IntegrationManagementSnapshot } from "../-integration-management/resources";
import { mapTestConnectionError } from "../../../router/integration/map-test-connection-error";
import type { MappedError } from "../../../router/integration/map-test-connection-error";
import type { IntegrationOperationsResources } from "./resources";

export const mediaRequestSearchKinds = getIntegrationKindsByCategory("mediaSearch");
export const nativeSearchKinds = getIntegrationKindsByCategory("search");
export const mediaRequestKinds = ["jellyseerr", "overseerr", "seerr"] as const;

type HttpIntegration = Integration & ResourceGrants<IntegrationPermission> & { secrets: IntegrationSecret[] };

export function oneIntegrationOperationProcedure<TKind extends IntegrationKind>(
  resources: IntegrationOperationsResources,
  descriptor: SourceProcedureDescriptor & { readonly access: { readonly kind: "protected" } },
  action: "query" | "interact",
  kinds: readonly TKind[],
) {
  return authenticatedProcedure(descriptor)
    .use(({ context, next }) =>
      withManagementSnapshot(
        resources,
        context,
        async (snapshot) => next({ context: { integrationOperationsSnapshot: snapshot } }),
        descriptor.kind === "mutation" ? "mutation" : "read",
      ),
    )
    .input(z.object({ integrationId: z.string() }))
    .use(async ({ context, next }, input) => {
      const integration = await getOneIntegrationAsync(
        resources,
        context.integrationOperationsSnapshot,
        input.integrationId,
        action,
        kinds,
      );
      return next({ context: { integrationOperation: integration } });
    });
}

export function getWriteResources(resources: IntegrationOperationsResources) {
  if (resources.writes.kind === "unbound") {
    throw new ORPCError("PRECONDITION_FAILED", { message: "Integration write authority is not bound" });
  }
  return resources.writes.snapshots;
}

export function getHttpResources(resources: IntegrationOperationsResources) {
  if (resources.http.kind === "unbound") {
    throw new ORPCError("PRECONDITION_FAILED", { message: "Integration HTTP transport is not bound" });
  }
  return resources.http;
}

export async function createAppIfNecessaryAsync(
  resources: IntegrationOperationsResources,
  snapshot: IntegrationManagementSnapshot,
  app: z.infer<typeof integrationCreateSchema>["app"],
) {
  if (!app) return null;
  if ("id" in app) return app.id;
  resources.logger.info("Creating app", { name: app.name });
  const appId = resources.createId();
  await snapshot.db.insert(resources.tables.apps).values({
    id: appId,
    name: app.name,
    description: app.description,
    iconUrl: app.iconUrl,
    href: app.href,
    pingUrl: app.pingUrl,
  });
  resources.logger.info("Created app", { id: appId, name: app.name });
  return appId;
}

export async function createNativeRequest<TKind extends IntegrationKind>(
  resources: IntegrationOperationsResources,
  snapshot: IntegrationManagementSnapshot,
  context: AuthenticatedBackendContext,
  integration: { id: string; name: string; kind: TKind; url: string },
  externalUrl: string | null,
): Promise<IntegrationRuntimeRequest<BackendPrincipal, TKind>> {
  await snapshot.assertCurrentAsync();
  context.signal.throwIfAborted();
  const configuration = await resources.captureConfigurationAsync(snapshot, integration, externalUrl);
  if (
    configuration.id !== integration.id ||
    configuration.name !== integration.name ||
    configuration.kind !== integration.kind ||
    configuration.url !== integration.url ||
    configuration.externalUrl !== externalUrl
  ) {
    throw new ORPCError("PRECONDITION_FAILED", { message: "Integration configuration is no longer current" });
  }
  await snapshot.assertCurrentAsync();
  context.signal.throwIfAborted();
  return {
    principal: snapshot.principal,
    integration: { ...configuration, kind: integration.kind },
    signal: context.signal,
    deadlineAt: resources.clock.now() + resources.executionTimeoutMs,
  };
}

export async function hasNativeQueryAccessAsync(
  resources: IntegrationOperationsResources,
  snapshot: IntegrationManagementSnapshot,
  integrations: readonly IntegrationAccessEvidence[],
) {
  const identity = await createIntegrationAccessHelpers(resources).getIdentityAsync(snapshot);
  const result = await hasQueryAccessToIntegrationsAsync(
    resources.getAuthorizationRepository(snapshot),
    identity,
    integrations,
  );
  await snapshot.assertCurrentAsync();
  return result;
}

export async function getOneIntegrationAsync<TKind extends IntegrationKind>(
  resources: IntegrationOperationsResources,
  snapshot: IntegrationManagementSnapshot,
  integrationId: string,
  action: "query" | "interact",
  kinds: readonly TKind[],
) {
  const { and, eq, inArray } = resources.operators;
  const metadata = {
    action,
    cardinality: "one",
    userId: snapshot.principal.user.id,
    requestedIntegrationIds: [integrationId],
    allowedIntegrationKinds: kinds,
  };
  resources.logger.debug("Resolving integration access", metadata);
  const access = createIntegrationAccessHelpers(resources);
  const identity = await access.getIdentityAsync(snapshot);
  const integration = await snapshot.db.query.integrations.findFirst({
    where: and(eq(resources.tables.integrations.id, integrationId), inArray(resources.tables.integrations.kind, kinds)),
    with: {
      app: true,
      secrets: true,
      ...access.getIntegrationAccessRelations(identity),
      items: { with: { item: true } },
    },
  });
  await snapshot.assertCurrentAsync();
  if (!integration) {
    resources.logger.warn("Integration access target was not found", metadata);
    throw new ORPCError("NOT_FOUND", {
      message: `Integration with id ${integrationId} not found or not of kinds ${kinds.join(",")}`,
    });
  }
  const allowed =
    action === "interact"
      ? constructIntegrationPermissions(integration, identity).hasInteractAccess
      : await hasNativeQueryAccessAsync(resources, snapshot, [integration]);
  if (!allowed) {
    resources.logger.warn("Integration access denied", {
      action,
      userId: snapshot.principal.user.id,
      integrationIds: [integration.id],
      integrationKinds: [integration.kind],
    });
    throw new ORPCError("FORBIDDEN", {
      message:
        action === "interact"
          ? "User does not have permission to interact with at least one of the specified integrations"
          : "User does not have permission to query at least one of the specified integration",
    });
  }
  resources.logger.debug("Integration access granted", { ...metadata, resolvedIntegrationKinds: [integration.kind] });
  const kind = kinds.find((candidate) => candidate === integration.kind);
  if (!kind) {
    resources.logger.error("Database returned an integration outside the requested kinds", {
      integrationKind: integration.kind,
      allowedIntegrationKinds: kinds,
    });
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Integration kind validation failed" });
  }
  const { secrets, items: _items, groupPermissions: _groups, userPermissions: _users, ...rest } = integration;
  return {
    ...rest,
    kind,
    externalUrl: rest.app?.href ?? null,
    decryptedSecrets: secrets.map((secret) => ({ ...secret, value: resources.codec.decryptSecret(secret.value) })),
  };
}

export async function getAccessibleMediaRequestSearchIntegrationsAsync(
  resources: IntegrationOperationsResources,
  snapshot: IntegrationManagementSnapshot,
  integrationIds?: string[],
) {
  const { eq, inArray, and, asc } = resources.operators;
  const { groupMembers, integrations, integrationUserPermissions, integrationGroupPermissions } = resources.tables;
  const userId = snapshot.principal.user.id;
  const groups = await snapshot.db.query.groupMembers.findMany({ where: eq(groupMembers.userId, userId) });
  const rows = await snapshot.db.query.integrations.findMany({
    where:
      integrationIds && integrationIds.length > 0
        ? and(inArray(integrations.id, integrationIds), inArray(integrations.kind, mediaRequestSearchKinds))
        : inArray(integrations.kind, mediaRequestSearchKinds),
    orderBy: asc(integrations.name),
    with: {
      app: true,
      secrets: true,
      items: { with: { item: true } },
      userPermissions: { where: eq(integrationUserPermissions.userId, userId) },
      groupPermissions: {
        where: inArray(
          integrationGroupPermissions.groupId,
          groups.map(({ groupId }) => groupId),
        ),
      },
    },
  });
  await snapshot.assertCurrentAsync();
  if (integrationIds && rows.length !== integrationIds.length) {
    throw new ORPCError("NOT_FOUND", { message: "One or more media request search integrations were not found" });
  }
  const checked = await Promise.all(
    rows.map(async (integration) => ({
      integration,
      hasAccess: await hasNativeQueryAccessAsync(resources, snapshot, [integration]),
    })),
  );
  if (integrationIds && checked.some(({ hasAccess }) => !hasAccess)) {
    throw new ORPCError("FORBIDDEN", {
      message: "User does not have permission to query one or more media request search integrations",
    });
  }
  return checked
    .filter(({ hasAccess }) => hasAccess)
    .map(({ integration }) => {
      const kind = mediaRequestSearchKinds.find((candidate) => candidate === integration.kind);
      if (!kind) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Integration kind validation failed" });
      return { ...integration, kind };
    });
}

export async function selectIntegrationForHttpRequest(
  resources: IntegrationOperationsResources,
  snapshot: IntegrationManagementSnapshot,
  selector: { integrationId?: string; integrationName?: string; integrationKind?: IntegrationKind },
) {
  const { eq, asc } = resources.operators;
  const { integrations } = resources.tables;
  const access = createIntegrationAccessHelpers(resources);
  const identity = await access.getIdentityAsync(snapshot);
  const relations = { secrets: true as const, ...access.getIntegrationAccessRelations(identity) };
  let integration: HttpIntegration | undefined;
  if (selector.integrationId) {
    integration = await snapshot.db.query.integrations.findFirst({
      where: eq(integrations.id, selector.integrationId),
      with: relations,
    });
    if (!integration || !constructIntegrationPermissions(integration, identity).hasFullAccess) {
      throw new ORPCError("FORBIDDEN", { message: "Arbitrary integration requests require full integration access" });
    }
  } else {
    const where = selector.integrationName
      ? eq(integrations.name, selector.integrationName)
      : selector.integrationKind
        ? eq(integrations.kind, selector.integrationKind)
        : undefined;
    if (!where) throw new ORPCError("BAD_REQUEST", { message: "An integration selector is required" });
    const matches = await snapshot.db.query.integrations.findMany({
      where,
      orderBy: [asc(integrations.name), asc(integrations.id)],
      with: relations,
    });
    integration = matches.find((entry) => constructIntegrationPermissions(entry, identity).hasFullAccess);
    if (!integration) throw new ORPCError("FORBIDDEN", { message: "No matching integration with full access" });
  }
  await snapshot.assertCurrentAsync();
  const unavailableReason = getIntegrationHttpUnavailableReason(integration.kind);
  if (unavailableReason) throw new ORPCError("BAD_REQUEST", { message: unavailableReason });
  return integration;
}

export function resolveIntegrationRequestUrl(baseUrl: string, path: string): URL {
  if (
    /^[a-z][a-z\d+.-]*:/i.test(path) ||
    path.startsWith("//") ||
    /[\\\s]/u.test(path) ||
    Array.from(path).some((character) => character.charCodeAt(0) <= 0x1f || character.charCodeAt(0) === 0x7f)
  ) {
    throw new ORPCError("BAD_REQUEST", { message: "path must be a relative integration endpoint" });
  }
  try {
    const base = new URL(baseUrl);
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
      throw new Error();
    }
    const directory = new URL(base);
    if (!directory.pathname.endsWith("/")) directory.pathname += "/";
    const target = new URL(path.replace(/^\//, ""), directory);
    if (target.origin !== base.origin || target.username || target.password || target.hash) throw new Error();
    assertCustomWidgetPathScope(target, base.pathname);
    return target;
  } catch {
    throw new ORPCError("BAD_REQUEST", {
      message: "path must stay within the saved integration URL without credentials or a fragment",
    });
  }
}

function createSecretRedactor(secrets: CustomWidgetAuthConfig["secrets"]) {
  const values = secrets.map(({ value }) => value).filter(Boolean);
  const username = secrets.find(({ kind }) => kind === "username")?.value;
  const password = secrets.find(({ kind }) => kind === "password")?.value;
  if (username && password) values.push(`${username}:${password}`);
  const sensitive = [
    ...new Set(
      values.flatMap((value) => [
        value,
        JSON.stringify(value).slice(1, -1),
        encodeURIComponent(value),
        Buffer.from(value).toString("base64"),
      ]),
    ),
  ].toSorted((left, right) => right.length - left.length);
  return (value: string) => {
    for (const secret of sensitive) value = value.replaceAll(secret, "[REDACTED]");
    return value;
  };
}

export function redactIntegrationResponse(data: unknown, secrets: CustomWidgetAuthConfig["secrets"]): unknown {
  const redact = createSecretRedactor(secrets);
  const visit = (value: unknown): unknown => {
    if (typeof value === "string") return redact(value);
    if (
      (typeof value === "number" || typeof value === "boolean" || value === null) &&
      redact(String(value)) !== String(value)
    ) {
      return "[REDACTED]";
    }
    if (Array.isArray(value)) return value.map(visit);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [redact(key), visit(child)]));
    }
    return value;
  };
  return visit(data);
}

function redactMappedError(error: MappedError, redact: (value: string) => string): MappedError {
  return {
    name: redact(error.name),
    message: redact(error.message),
    metadata: error.metadata.map(({ key, value }) => ({
      key: redact(key),
      value: typeof value === "string" ? redact(value) : redact(String(value)) === String(value) ? value : "[REDACTED]",
    })),
    cause: error.cause ? redactMappedError(error.cause, redact) : undefined,
  };
}

export async function testOperationConnectionAsync(
  resources: IntegrationOperationsResources,
  snapshot: IntegrationManagementSnapshot,
  signal: AbortSignal,
  integration: ConnectionForm,
  stored: Parameters<typeof resolveConnectionSecretsAsync>[4] = [],
) {
  const metadata = { integrationName: integration.name, integrationKind: integration.kind };
  resources.logger.info("Testing connection", metadata);
  const decryptedSecrets = await resolveConnectionSecretsAsync(resources, snapshot, signal, integration, stored);
  const input = {
    id: integration.id,
    name: integration.name,
    url: integration.url,
    kind: integration.kind,
    decryptedSecrets,
    externalUrl: null,
  };
  const lease = await resources.testing.acquireResourcesAsync(snapshot, input, signal).catch(() => {
    signal.throwIfAborted();
    throw new Error("Integration connection test resources could not be acquired");
  });
  try {
    await snapshot.assertCurrentAsync();
    signal.throwIfAborted();
    const result = await withIntegrationRuntimeAsync(lease.runtime, async () => {
      const client = await resources.testing.createIntegrationAsync(input);
      await snapshot.assertCurrentAsync();
      signal.throwIfAborted();
      return client.testConnectionAsync();
    });
    await snapshot.assertCurrentAsync();
    signal.throwIfAborted();
    if (result.success) {
      resources.logger.info("Tested connection successfully", metadata);
      return result;
    }
    const mapped = mapTestConnectionError(result.error);
    const redact = createSecretRedactor(decryptedSecrets);
    const common = {
      name: redact(mapped.name),
      message: redact(mapped.message),
      cause: mapped.cause ? redactMappedError(mapped.cause, redact) : undefined,
    };
    resources.logger.error("Integration connection test failed", { integrationId: integration.id, type: mapped.type });
    if (mapped.type === "certificate") {
      return {
        success: false as const,
        error: {
          ...mapped,
          ...common,
          data: { ...mapped.data, certificate: mapped.data.certificate },
        },
      };
    }
    if (mapped.type === "statusCode") {
      return {
        success: false as const,
        error: { ...mapped, ...common, data: { ...mapped.data, url: redact(mapped.data.url) } },
      };
    }
    return { success: false as const, error: { ...mapped, ...common } };
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof ORPCError) {
      throw new ORPCError(error.code, { message: createSecretRedactor(decryptedSecrets)(error.message) });
    }
    throw new Error("Integration connection test failed");
  } finally {
    await lease.releaseAsync().catch(() => {
      throw new Error("Integration connection test resources could not be released");
    });
  }
}

export async function getIntegrationHttpConnection(
  resources: IntegrationOperationsResources,
  snapshot: IntegrationManagementSnapshot,
  context: AuthenticatedBackendContext,
  integration: Awaited<ReturnType<typeof selectIntegrationForHttpRequest>>,
) {
  try {
    const http = getHttpResources(resources);
    await snapshot.assertCurrentAsync();
    context.signal.throwIfAborted();
    const secrets = integration.secrets.map(({ kind, value }) => ({
      kind,
      value: resources.codec.decryptSecret(value),
    }));
    const baseUrl = new URL(integration.url);
    const cacheVersion = createHash("sha256")
      .update(JSON.stringify([integration.id, integration.kind, integration.url, integration.secrets]))
      .digest("hex")
      .slice(0, 16);
    return {
      baseUrl: baseUrl.href,
      networkScope: "loopback" as const,
      pathPrefix: baseUrl.pathname,
      redactSecrets: secrets,
      cacheVersion,
      resolveConnectionAsync: async () => {
        try {
          const request = await createNativeRequest(resources, snapshot, context, integration, null);
          const authentication = await resources.native.getHttpAuthenticationAsync(request);
          const headers = authentication.headers;
          const query = authentication.query ?? {};
          const body = authentication.body;
          const derivedSecrets = [...(authentication.redactValues ?? [])];
          for (const [name, value] of Object.entries(headers)) {
            if (name.toLowerCase() === "authorization") derivedSecrets.push(value, value.slice(value.indexOf(" ") + 1));
          }
          const auth: CustomWidgetAuthConfig = {
            type: "integration",
            headers,
            query,
            body,
            secrets: [
              ...secrets,
              ...derivedSecrets.map((value) => ({ kind: "authentication", value })),
              ...Object.entries(query).map(([name, value]) => ({
                kind: "authenticationQuery",
                value: `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
              })),
              ...(body ? [{ kind: "authentication", value: body.value }] : []),
            ],
          };
          const tls: CustomWidgetHttpRequest["tls"] =
            baseUrl.protocol === "https:" ? await http.getTlsOptionsAsync(snapshot, context.signal) : undefined;
          await snapshot.assertCurrentAsync();
          context.signal.throwIfAborted();
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
    throw new ORPCError("PRECONDITION_FAILED", { message: "Integration connection could not be resolved" });
  }
}
