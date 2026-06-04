import { z } from "zod/v4";

import type { IntegrationErrorData } from "../base/errors/integration-error";
import { IntegrationError } from "../base/errors/integration-error";

// All tested versions (v11–v15) share the same API paths.
// The version only controls the auth mechanism:
//   v15     → Authorization: Bearer <token>  (introduced in v15)
//   legacy  → ?token= query parameter        (all versions before v15)
export type TechnitiumVersion = "v15" | "legacy";

export const apiPaths = {
  login: "/api/user/login",
  logout: "/api/user/logout",
  stats: "/api/dashboard/stats/get",
  settingsGet: "/api/settings/get",
  settingsSet: "/api/settings/set",
  temporaryDisable: "/api/settings/temporaryDisableBlocking",
} as const satisfies Record<string, `/${string}`>;

// Technitium always returns HTTP 200. Auth/permission state is signalled in the body:
//   status: "ok"            → success
//   status: "invalid-token" → session expired or invalid API key
//   status: "error"         → permission denied or other server-side error
export type TechnitiumStatus = "ok" | "invalid-token" | "error";

// Internal signal thrown when Technitium reports the token as expired.
// Extends IntegrationError so the @HandleIntegrationErrors decorator re-throws it as-is
// instead of wrapping it, allowing withTokenRetryAsync to catch it by type.
export class TokenExpiredError extends IntegrationError {
  constructor(integration: IntegrationErrorData) {
    super(integration, "Token expired", {});
    this.name = TokenExpiredError.name;
  }
}

// Cached in Redis: the token (empty for API key users) and the detected auth version.
export type StoredSession = { token: string; version: TechnitiumVersion };

// ─── pure utilities ──────────────────────────────────────────────────────────

/** Parses the server version string from a login response into a TechnitiumVersion. */
export function parseTechnitiumVersion(infoVersion: string | undefined): TechnitiumVersion {
  return parseInt(infoVersion?.split(".")[0] ?? "0") >= 15 ? "v15" : "legacy";
}

/**
 * Parses the status and data from a Technitium HTTP response.
 * Technitium always returns HTTP 200 — auth/error state is in the body's `status` field.
 */
export async function readTechnitiumBodyAsync(response: {
  json(): Promise<unknown>;
}): Promise<{ status: TechnitiumStatus; data: Record<string, unknown> }> {
  const data = (await response.json()) as Record<string, unknown>;
  const status = (data["status"] as TechnitiumStatus | undefined) ?? "error";
  return { status, data };
}

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const loginResponseSchema = z.object({
  status: z.literal("ok"),
  token: z.string(),
  // info.version is returned when includeInfo=true is passed; used to determine the API path set.
  info: z.object({ version: z.string() }).optional(),
});

export const statsGetResponseSchema = z.object({
  status: z.literal("ok"),
  response: z.object({
    stats: z.object({
      totalQueries: z.number(),
      totalBlocked: z.number(),
      blockedZones: z.number(),
      blockListZones: z.number(),
    }),
  }),
});

export const settingsGetResponseSchema = z.object({
  status: z.literal("ok"),
  response: z.object({
    enableBlocking: z.boolean(),
    temporaryDisableBlockingTill: z.string().nullable().optional(),
  }),
});
