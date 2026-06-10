import { randomBytes } from "crypto";

import { hashPasswordAsync } from "@homarr/auth";
import { generateSecureRandomToken } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { db } from "@homarr/db";
import { apiKeys } from "@homarr/db/schema";

import { consumeAuthCode, verifyPkce } from "../_store";

const logger = createLogger({ module: "mcpOAuthToken" });

interface RateLimitStore {
  failures: Map<string, { count: number; resetAt: number }>;
  timer: ReturnType<typeof setInterval> | null;
}

const TOKEN_RATE_WINDOW_MS = 60_000;
const TOKEN_MAX_FAILURES = 10;

declare global {
  var mcpTokenRateLimit: RateLimitStore | undefined;
}

const store =
  globalThis.mcpTokenRateLimit ??
  (globalThis.mcpTokenRateLimit = {
    failures: new Map(),
    timer: null,
  });
const tokenFailures = store.failures;

if (!store.timer) {
  store.timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of tokenFailures) {
      if (entry.resetAt < now) tokenFailures.delete(key);
    }
  }, TOKEN_RATE_WINDOW_MS);
  store.timer.unref();
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}

function recordTokenFailure(ip: string) {
  const now = Date.now();
  const existing = tokenFailures.get(ip);
  if (!existing || existing.resetAt < now) {
    tokenFailures.set(ip, { count: 1, resetAt: now + TOKEN_RATE_WINDOW_MS });
    return;
  }
  existing.count++;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = tokenFailures.get(ip);

  if (entry && entry.resetAt >= now && entry.count >= TOKEN_MAX_FAILURES) {
    return Response.json(
      { error: "rate_limited", error_description: "Too many requests, try again later" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let params: Record<string, string>;
  try {
    const body = await req.formData().catch(() => null);
    params = body
      ? (Object.fromEntries(body.entries()) as Record<string, string>)
      : ((await req.json()) as Record<string, string>);
  } catch {
    return Response.json(
      { error: "invalid_request", error_description: "Could not parse request body" },
      { status: 400 },
    );
  }

  const { grant_type, code, code_verifier, redirect_uri } = params;

  if (grant_type !== "authorization_code") {
    return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
  }

  if (!code || !code_verifier) {
    return Response.json(
      { error: "invalid_request", error_description: "Missing code or code_verifier" },
      { status: 400 },
    );
  }

  if (code.length > 256 || code_verifier.length > 256) {
    return Response.json({ error: "invalid_request", error_description: "Parameter too long" }, { status: 400 });
  }

  const authCode = consumeAuthCode(code);
  if (!authCode) {
    recordTokenFailure(ip);
    return Response.json(
      { error: "invalid_grant", error_description: "Invalid or expired authorization code" },
      { status: 400 },
    );
  }

  if (redirect_uri && redirect_uri !== authCode.redirectUri) {
    recordTokenFailure(ip);
    return Response.json({ error: "invalid_grant", error_description: "redirect_uri mismatch" }, { status: 400 });
  }

  if (!verifyPkce(code_verifier, authCode.codeChallenge, authCode.codeChallengeMethod)) {
    recordTokenFailure(ip);
    return Response.json({ error: "invalid_grant", error_description: "PKCE verification failed" }, { status: 400 });
  }

  try {
    const id = randomBytes(4).toString("hex");
    const randomToken = generateSecureRandomToken(24);
    const hashedToken = await hashPasswordAsync(randomToken);

    await db.insert(apiKeys).values({
      id,
      apiKey: hashedToken,
      userId: authCode.userId,
    });

    const accessToken = `${id}.${randomToken}`;

    return Response.json({
      access_token: accessToken,
      token_type: "Bearer",
      scope: "mcp:tools",
    });
  } catch (error) {
    logger.error("Failed to create API key during OAuth token exchange", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "server_error", error_description: "Failed to issue access token" }, { status: 500 });
  }
}
