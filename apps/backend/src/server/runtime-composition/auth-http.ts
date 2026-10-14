import type {
  IssuerPublicationOutcome,
  LegacyIssuerHttpAction,
  ProductionSessionRequestConfiguration,
} from "@homarr/auth/nitro/production-sessions";

interface AuthHttpPath {
  readonly pathname: string;
  readonly action: LegacyIssuerHttpAction;
  readonly methods: readonly string[];
  readonly allow: "GET" | "POST" | "GET, POST";
  readonly provider?: ProductionSessionRequestConfiguration["providers"][number];
}

export type AuthHttpSelection =
  | { readonly kind: "pass" }
  | { readonly kind: "method-not-allowed"; readonly allow: AuthHttpPath["allow"] }
  | { readonly kind: "provider-disabled" }
  | { readonly kind: "action"; readonly action: LegacyIssuerHttpAction };

const paths: readonly AuthHttpPath[] = Object.freeze<AuthHttpPath[]>([
  { pathname: "/api/auth/providers", action: "legacy-providers", methods: ["GET"], allow: "GET" },
  { pathname: "/api/auth/csrf", action: "legacy-csrf", methods: ["GET"], allow: "GET" },
  { pathname: "/api/auth/signin", action: "legacy-signin", methods: ["GET"], allow: "GET" },
  {
    pathname: "/api/auth/callback/credentials",
    action: "legacy-credentials",
    methods: ["POST"],
    allow: "POST",
    provider: "credentials",
  },
  {
    pathname: "/api/auth/callback/ldap",
    action: "legacy-ldap",
    methods: ["POST"],
    allow: "POST",
    provider: "ldap",
  },
  {
    pathname: "/api/auth/signin/oidc",
    action: "legacy-oidc",
    methods: ["POST"],
    allow: "POST",
    provider: "oidc",
  },
  {
    pathname: "/api/auth/callback/oidc",
    action: "legacy-oidc",
    methods: ["GET", "POST"],
    allow: "GET, POST",
    provider: "oidc",
  },
  { pathname: "/api/auth/session", action: "legacy-session", methods: ["GET", "POST"], allow: "GET, POST" },
  { pathname: "/api/auth/signout", action: "legacy-signout", methods: ["POST"], allow: "POST" },
]);

export function selectAuthHttpRequest(
  request: Request,
  providers: ProductionSessionRequestConfiguration["providers"],
): AuthHttpSelection {
  const pathname = new URL(request.url).pathname;
  const selected = paths.find((path) => path.pathname === pathname);
  if (!selected) return { kind: "pass" };
  if (!selected.methods.includes(request.method)) return { kind: "method-not-allowed", allow: selected.allow };
  if (selected.provider && !providers.includes(selected.provider)) return { kind: "provider-disabled" };
  return { kind: "action", action: selected.action };
}

export function classifyLegacyAuthHttpOutcome(
  action: LegacyIssuerHttpAction,
  outcome: IssuerPublicationOutcome,
): { readonly kind: "released"; readonly response: Response } | { readonly kind: "held" | "contract-mismatch" } {
  if (outcome.kind !== action) return { kind: "contract-mismatch" };
  if (outcome.publication === "held") return { kind: "held" };
  if (outcome.publication === "released" && outcome.output.type === "response")
    return { kind: "released", response: outcome.output.response };
  return { kind: "contract-mismatch" };
}

export async function cancelAbandonedAuthHttpResponseAsync(response: Response): Promise<void> {
  if (response.bodyUsed || response.body?.locked) throw new Error("AUTH_HTTP_OUTPUT_NOT_OWNED");
  const body = response.body;
  if (!body) return;
  const reader = body.getReader();
  const closed = reader.closed;
  void closed.catch(() => undefined);
  try {
    await reader.cancel(new Error("AUTH_HTTP_OUTPUT_WITHHELD"));
  } finally {
    try {
      await closed;
    } finally {
      reader.releaseLock();
    }
  }
}
