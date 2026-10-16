import { HTTPException } from "hono/http-exception";

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

export async function hashToken(value: string): Promise<string> {
  return Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))).toString("base64url");
}

export function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HTTPException(400, { message: "Expected a JSON object" });
  }
  return value as Record<string, unknown>;
}

/** Reject secret-bearing/accidental extra fields before they reach SQLite. */
export function onlyFields(value: Record<string, unknown>, allowed: string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new HTTPException(400, { message: `Unexpected field: ${key}` });
  }
}

export function textField(value: unknown, name: string, max = 200): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
    throw new HTTPException(400, { message: `Invalid ${name}` });
  }
  return value.trim();
}

export function idField(value: unknown, name: string): string {
  const result = textField(value, name, 128);
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(result)) throw new HTTPException(400, { message: `Invalid ${name}` });
  return result;
}

export function numberField(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new HTTPException(400, { message: `Invalid ${name}` });
  }
  return value;
}

export function connectionUrl(value: unknown, type: "direct" | "relay"): string | null {
  if (value === null || value === undefined || value === "") return null;
  const input = textField(value, `${type} URL`, 2048);
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new HTTPException(400, { message: `Invalid ${type} URL` });
  }
  const protocols = ["https:", "wss:", "http:", "ws:"];
  // HTTP/WS is only accepted for local development; Tailscale supports HTTPS.
  if (
    (url.protocol === "http:" || url.protocol === "ws:") &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    throw new HTTPException(400, { message: "Use HTTPS or WSS outside loopback" });
  }
  if (!protocols.includes(url.protocol) || url.username || url.password || url.hash || url.search) {
    throw new HTTPException(400, { message: `Invalid ${type} URL` });
  }
  return url.toString().replace(/\/$/, "");
}

export function publicJwk(value: unknown, name: string): JsonWebKey {
  const key = record(value);
  onlyFields(key, ["kty", "crv", "x", "y", "ext", "key_ops", "alg", "use"]);
  if (key.kty !== "EC" || key.crv !== "P-256" || typeof key.x !== "string" || typeof key.y !== "string") {
    throw new HTTPException(400, { message: `Invalid ${name}; expected a public P-256 key` });
  }
  if (!/^[\w-]{43}$/.test(key.x) || !/^[\w-]{43}$/.test(key.y)) {
    throw new HTTPException(400, { message: `Invalid ${name} coordinates` });
  }
  // Normalize away all optional fields. In particular private key material is never accepted.
  return { kty: "EC", crv: "P-256", x: key.x, y: key.y };
}
