/** Browser/Bun WebCrypto only. No application-controlled arithmetic or key agreement. */
export interface WorkerIdentity {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicJwk: JsonWebKey;
}

const encoder = new TextEncoder();
export const utf8 = (value: string): Uint8Array<ArrayBuffer> => encoder.encode(value);
export const MAX_FRAME_BYTES = 1_048_576;

export function toBase64Url(value: Uint8Array): string {
  const native = value as Uint8Array & { toBase64?: (options: { alphabet: "base64url"; omitPadding: true }) => string };
  if (native.toBase64) return native.toBase64({ alphabet: "base64url", omitPadding: true });
  let binary = "";
  for (let offset = 0; offset < value.length; offset += 8192) {
    binary += String.fromCharCode(...value.subarray(offset, offset + 8192));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function fromBase64Url(value: string, maximum = MAX_FRAME_BYTES): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1 || value.length > Math.ceil((maximum * 4) / 3)) {
    throw new Error("Invalid base64url encoding");
  }
  const native = Uint8Array as unknown as {
    fromBase64?: (value: string, options: { alphabet: "base64url" }) => Uint8Array<ArrayBuffer>;
  };
  let result: Uint8Array<ArrayBuffer>;
  if (native.fromBase64) result = native.fromBase64(value, { alphabet: "base64url" });
  else {
    const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
    result = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }
  if (result.length > maximum || toBase64Url(result) !== value) throw new Error("Invalid base64url encoding");
  return result;
}

export function publicIdentityJwk(value: unknown): JsonWebKey {
  if (!value || typeof value !== "object") throw new Error("Invalid public key");
  const key = value as JsonWebKey;
  if (
    key.kty !== "EC" ||
    key.crv !== "P-256" ||
    typeof key.x !== "string" ||
    typeof key.y !== "string" ||
    key.d !== undefined
  ) {
    throw new Error("Invalid public key");
  }
  if (fromBase64Url(key.x, 32).length !== 32 || fromBase64Url(key.y, 32).length !== 32)
    throw new Error("Invalid public key");
  return { kty: "EC", crv: "P-256", x: key.x, y: key.y };
}

export async function generateWorkerIdentity(extractable = true): Promise<WorkerIdentity> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, extractable, ["sign", "verify"]);
  return { ...pair, publicJwk: publicIdentityJwk(await crypto.subtle.exportKey("jwk", pair.publicKey)) };
}

export function generateDeviceIdentity(extractable = false): Promise<WorkerIdentity> {
  return generateWorkerIdentity(extractable);
}

export async function importWorkerIdentity(privateJwk: JsonWebKey): Promise<WorkerIdentity> {
  const publicJwk = publicIdentityJwk({ kty: privateJwk.kty, crv: privateJwk.crv, x: privateJwk.x, y: privateJwk.y });
  const [privateKey, publicKey] = await Promise.all([
    crypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]),
    crypto.subtle.importKey("jwk", publicJwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]),
  ]);
  // Import must not silently pair a different public key with this private key.
  const probe = utf8("homarr-identity-import-check-v1");
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, probe);
  if (!(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, signature, probe)))
    throw new Error("Identity key mismatch");
  return { privateKey, publicKey, publicJwk };
}

export function exportWorkerIdentity(identity: WorkerIdentity): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", identity.privateKey);
}

export async function getWorkerId(publicJwk: JsonWebKey): Promise<string> {
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    publicIdentityJwk(publicJwk),
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"],
  );
  const raw = await crypto.subtle.exportKey("raw", publicKey);
  return toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", raw)));
}

export async function signIdentity(identity: WorkerIdentity, data: string | Uint8Array): Promise<string> {
  let bytes = data;
  if (typeof data === "string") bytes = utf8(data);
  return toBase64Url(
    new Uint8Array(
      await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, identity.privateKey, bytes as BufferSource),
    ),
  );
}

export async function verifyIdentity(
  publicJwk: JsonWebKey,
  data: string | Uint8Array,
  signature: string,
): Promise<boolean> {
  try {
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      publicIdentityJwk(publicJwk),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    let bytes = data;
    if (typeof data === "string") bytes = utf8(data);
    const decoded = fromBase64Url(signature, 64);
    if (decoded.length !== 64) return false;
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, decoded, bytes as BufferSource);
  } catch {
    return false;
  }
}

export function randomSecret(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}
