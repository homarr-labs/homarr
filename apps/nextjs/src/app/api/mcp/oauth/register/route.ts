import { registerClient } from "../_store";

interface RateLimitStore {
  attempts: Map<string, { count: number; resetAt: number }>;
  timer: ReturnType<typeof setInterval> | null;
}

const REGISTER_RATE_WINDOW_MS = 60_000;
const REGISTER_MAX_ATTEMPTS = 5;

declare global {
  var mcpRegisterRateLimit: RateLimitStore | undefined;
}

const store =
  globalThis.mcpRegisterRateLimit ??
  (globalThis.mcpRegisterRateLimit = {
    attempts: new Map(),
    timer: null,
  });
const registerAttempts = store.attempts;

if (!store.timer) {
  store.timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of registerAttempts) {
      if (entry.resetAt < now) registerAttempts.delete(key);
    }
  }, REGISTER_RATE_WINDOW_MS);
  store.timer.unref();
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}

function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = registerAttempts.get(ip);

  if (entry && entry.resetAt >= now && entry.count >= REGISTER_MAX_ATTEMPTS) {
    return Response.json(
      { error: "rate_limited", error_description: "Too many registration attempts, try again later" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const existing = registerAttempts.get(ip);
  if (!existing || existing.resetAt < now) {
    registerAttempts.set(ip, { count: 1, resetAt: now + REGISTER_RATE_WINDOW_MS });
  } else {
    existing.count++;
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return Response.json({ error: "invalid_request", error_description: "Invalid JSON body" }, { status: 400 });
  }

  const redirectUris = body.redirect_uris;
  const clientName = typeof body.client_name === "string" ? body.client_name.slice(0, 256) : "MCP Client";

  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || redirectUris.length > 10) {
    return Response.json(
      { error: "invalid_client_metadata", error_description: "redirect_uris must be an array of 1-10 URIs" },
      { status: 400 },
    );
  }

  const validUris = redirectUris.filter((uri): uri is string => typeof uri === "string" && isValidRedirectUri(uri));
  if (validUris.length !== redirectUris.length) {
    return Response.json(
      { error: "invalid_client_metadata", error_description: "All redirect_uris must be valid http or https URLs" },
      { status: 400 },
    );
  }

  const result = registerClient(validUris, clientName);
  if (!result) {
    return Response.json(
      { error: "server_error", error_description: "Too many registered clients, please try again later" },
      { status: 503 },
    );
  }

  return Response.json(
    {
      client_id: result.clientId,
      client_secret: result.clientSecret,
      redirect_uris: validUris,
      client_name: clientName,
      token_endpoint_auth_method: "none",
    },
    { status: 201 },
  );
}
