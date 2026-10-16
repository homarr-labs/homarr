import { timingSafeEqual } from "node:crypto";
import { getWorkerId, signIdentity, verifyIdentity } from "@homarr/remote-protocol";

import type { WorkerSigningIdentity } from "./types";

export function randomSecret() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

export async function fingerprint(publicJwk: JsonWebKey) {
  return getWorkerId(publicJwk);
}

export async function hash(value: string) {
  const result = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Buffer.from(result).toString("base64url");
}

export function hashesEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function sign(identity: WorkerSigningIdentity, payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${await signIdentity(identity, body)}`;
}

export async function verify(identity: WorkerSigningIdentity, token: string): Promise<unknown> {
  if (typeof token !== "string" || token.length > 8192) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) return null;
  try {
    const valid = await verifyIdentity(identity.publicJwk, body, signature);
    if (!valid) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}
