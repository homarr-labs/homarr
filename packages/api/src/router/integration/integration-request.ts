import { Buffer } from "node:buffer";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { constructIntegrationPermissions } from "@homarr/auth/shared";
import { decryptSecret } from "@homarr/common/server";
import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/core/infrastructure/certificates";
import { createCustomCheckServerIdentity } from "@homarr/core/infrastructure/http";
import { CustomWidgetDomainError, executeCustomWidgetRequest } from "@homarr/custom-widgets/server";
import type { CustomWidgetAuthConfig, CustomWidgetHttpRequest } from "@homarr/custom-widgets/server";
import { eq, inArray } from "@homarr/db";
import { groupMembers, integrations, integrationGroupPermissions, integrationUserPermissions } from "@homarr/db/schema";
import type { IntegrationKind } from "@homarr/definitions";

import { protectedProcedure } from "../../trpc";

export const integrationRequestSchema = z.object({
  integrationId: z.string().min(1).max(128),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().min(1).max(8192),
  body: z.json().optional(),
  confirmed: z
    .boolean()
    .optional()
    .describe("Required for DELETE after the user confirms the deletion and its effects"),
});

export function resolveIntegrationRequestUrl(baseUrl: string, path: string): URL {
  // Reject parser normalization tricks as well as ordinary absolute URLs.
  // eslint-disable-next-line no-control-regex -- Reject URL parser control-character normalization.
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//") || /[\\\s\u0000-\u001f\u007f]/u.test(path)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "path must be a relative URL on the integration origin" });
  }
  try {
    const base = new URL(baseUrl);
    const target = new URL(path, base);
    if (
      !["http:", "https:"].includes(base.protocol) ||
      base.username ||
      base.password ||
      target.origin !== base.origin ||
      target.username ||
      target.password ||
      target.hash
    )
      throw new Error();
    return target;
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "path must resolve to the integration origin without credentials or a fragment",
    });
  }
}

// Match the existing adapters; never guess authentication from secret names alone.
const requestAuth = {
  sonarr: "apiKeyHeader",
  radarr: "apiKeyHeader",
  lidarr: "apiKeyHeader",
  readarr: "apiKeyHeader",
  prowlarr: "apiKeyHeader",
  overseerr: "apiKeyHeader",
  jellyseerr: "apiKeyHeader",
  seerr: "apiKeyHeader",
  immich: "apiKeyHeader",
  slskd: "apiKeyHeader",
  homeAssistant: "bearer",
  coolify: "bearer",
  audiobookshelf: "bearer",
  speedtestTracker: "bearer",
  adGuardHome: "basic",
  nextcloud: "basic",
} satisfies Partial<Record<IntegrationKind, string>>;

export function resolveIntegrationRequestAuth(
  kind: IntegrationKind,
  secrets: CustomWidgetAuthConfig["secrets"],
): CustomWidgetAuthConfig {
  if (!(kind in requestAuth)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This integration's authentication is not supported by integration_request",
    });
  }
  const type = requestAuth[kind as keyof typeof requestAuth];
  let required = ["apiKey"];
  if (type === "basic") required = ["username", "password"];
  if (required.some((key) => !secrets.some((secret) => secret.kind === key && secret.value))) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Integration credentials are incomplete" });
  }
  return { type, secrets };
}

export function redactIntegrationResponse(data: unknown, secrets: CustomWidgetAuthConfig["secrets"]): unknown {
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
  ].toSorted((a, b) => b.length - a.length);
  const redact = (value: string) => {
    for (const secret of sensitive) value = value.replaceAll(secret, "[REDACTED]");
    return value;
  };
  const visit = (value: unknown): unknown => {
    if (typeof value === "string") return redact(value);
    if (
      (typeof value === "number" || typeof value === "boolean" || value === null) &&
      redact(String(value)) !== String(value)
    )
      return "[REDACTED]";
    if (Array.isArray(value)) return value.map(visit);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [redact(key), visit(child)]));
    }
    return value;
  };
  return visit(data);
}

export const integrationRequestProcedure = protectedProcedure
  .meta({
    mcp: {
      enabled: true,
      description:
        "Make an authenticated HTTP request to a configured integration using its stored credentials. Get integrationId from integration_all. Every method requires hasFullAccess because arbitrary endpoints can expose service credentials or mutate state. DELETE requires confirmed=true after user confirmation, including effects such as deleting files. Returns {status,data}, including upstream error statuses. Use the service's API documentation to choose the method, relative path and optional JSON body; consult official docs with your browsing tools, or ask the user for API docs if unavailable. Absolute URLs and redirects are rejected. 15 second deadline, 1 MiB response, 10 KiB JSON body. Supports Sonarr, Radarr, Lidarr, Readarr, Prowlarr, Overseerr, Jellyseerr, Seerr, Immich, slskd, Home Assistant, Coolify, Audiobookshelf, Speedtest Tracker, AdGuard Home and Nextcloud; other authentication schemes are rejected. Never suggest bypassing a permission denial.",
    },
  })
  .input(integrationRequestSchema)
  .mutation(async ({ ctx, input }) => {
    const groups = await ctx.db.query.groupMembers.findMany({ where: eq(groupMembers.userId, ctx.session.user.id) });
    const integration = await ctx.db.query.integrations.findFirst({
      where: eq(integrations.id, input.integrationId),
      with: {
        secrets: true,
        userPermissions: { where: eq(integrationUserPermissions.userId, ctx.session.user.id) },
        groupPermissions: {
          where: inArray(
            integrationGroupPermissions.groupId,
            groups.map(({ groupId }) => groupId),
          ),
        },
      },
    });
    // Arbitrary GET endpoints can expose service credentials or mutate state.
    if (!integration || !constructIntegrationPermissions(integration, ctx.session).hasFullAccess) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Missing integration permission: hasFullAccess" });
    }
    const targetUrl = resolveIntegrationRequestUrl(integration.url, input.path);
    if (input.method === "DELETE" && input.confirmed !== true) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This action requires confirmation" });
    }
    if (input.method === "GET" && input.body !== undefined) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "GET requests cannot include a body" });
    }
    // Decrypt only after authorization, using the same snapshot as the URL and permissions.
    // Do not log upstream data or retain error causes.
    try {
      const secrets = integration.secrets.map(({ kind, value }) => ({ kind, value: decryptSecret(value) }));
      const auth = resolveIntegrationRequestAuth(integration.kind, secrets);
      let tls: CustomWidgetHttpRequest["tls"];
      if (targetUrl.protocol === "https:") {
        const [ca, hostnames] = await Promise.all([
          getAllTrustedCertificatesAsync(),
          getTrustedCertificateHostnamesAsync(),
        ]);
        tls = { ca, checkServerIdentity: createCustomCheckServerIdentity(hostnames) };
      }
      const response = await executeCustomWidgetRequest({
        baseUrl: integration.url,
        targetUrl,
        method: input.method,
        body: JSON.stringify(input.body),
        auth,
        tls,
        networkScope: "loopback",
        kind: "action", // Disable redirects for reads and writes alike; never cache this tool.
        timeoutMs: 15_000,
        textFallback: true,
      });
      return { status: response.status, data: redactIntegrationResponse(response.data, secrets) };
    } catch (error) {
      if (error instanceof TRPCError) throw new TRPCError({ code: error.code, message: error.message });
      if (error instanceof CustomWidgetDomainError) {
        throw new TRPCError({
          code: error.code,
          message: "Integration request failed (timeout, response limit, redirect or invalid target)",
        });
      }
      throw new TRPCError({ code: "BAD_GATEWAY", message: "Integration request failed" });
    }
  });
