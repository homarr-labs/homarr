import type { IntegrationKind } from "@homarr/definitions";

export interface IntegrationHttpAuth {
  type: "apiKeyHeader" | "bearer" | "basic";
  secrets: Array<{ kind: string; value: string }>;
}

export class IntegrationHttpAuthError extends Error {
  readonly code: "BAD_REQUEST" | "PRECONDITION_FAILED";
  constructor(input: { code: "BAD_REQUEST" | "PRECONDITION_FAILED"; message: string }) {
    super(input.message);
    this.code = input.code;
  }
}

// Match the existing adapters; never guess authentication from secret names alone.
export const integrationHttpAuth = {
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
} as const satisfies Partial<Record<IntegrationKind, string>>;

export function resolveIntegrationHttpAuth(
  kind: IntegrationKind,
  secrets: IntegrationHttpAuth["secrets"],
): IntegrationHttpAuth {
  if (!(kind in integrationHttpAuth)) {
    throw new IntegrationHttpAuthError({
      code: "BAD_REQUEST",
      message: "This integration's authentication is not supported by HTTP requests",
    });
  }
  const type = integrationHttpAuth[kind as keyof typeof integrationHttpAuth];
  let required = ["apiKey"];
  if (type === "basic") required = ["username", "password"];
  if (required.some((key) => !secrets.some((secret) => secret.kind === key && secret.value))) {
    throw new IntegrationHttpAuthError({
      code: "PRECONDITION_FAILED",
      message: "Integration credentials are incomplete",
    });
  }
  return { type, secrets };
}
