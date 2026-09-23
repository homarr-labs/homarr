import { Buffer } from "node:buffer";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
import type { Response } from "undici";
import { CustomWidgetDomainError } from "./errors";

export const MAX_RESPONSE_BODY_BYTES = 1024 * 1024;
export const MAX_RESPONSE_JSON_DEPTH = 32;
export const MAX_RESPONSE_JSON_NODES = 50_000;

export function assertJsonBudget(value: unknown): void {
  let nodes = 0;
  const visit = (current: unknown, depth: number): void => {
    if (++nodes > MAX_RESPONSE_JSON_NODES)
      throw new CustomWidgetDomainError({ code: "PAYLOAD_TOO_LARGE", message: "Response JSON is too large" });
    if (depth > MAX_RESPONSE_JSON_DEPTH)
      throw new CustomWidgetDomainError({ code: "PAYLOAD_TOO_LARGE", message: "Response JSON is too deeply nested" });
    if (Array.isArray(current)) current.forEach((entry) => visit(entry, depth + 1));
    else if (current !== null && typeof current === "object")
      Object.values(current).forEach((entry) => visit(entry, depth + 1));
  };
  visit(value, 0);
}

async function readLimitedBody(response: Response): Promise<string> {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_RESPONSE_BODY_BYTES) throw tooLarge();
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > MAX_RESPONSE_BODY_BYTES) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/** Bound every decoding stage as well as the on-wire response body. */
export function decodeResponseBody(body: ArrayBuffer, contentEncoding: string | null): ArrayBuffer | Buffer {
  if (!contentEncoding || body.byteLength === 0) return body;
  const encodings = contentEncoding
    .toLowerCase()
    .split(",")
    .map((value) => value.trim());
  if (encodings.length > 3)
    throw new CustomWidgetDomainError({ code: "BAD_GATEWAY", message: "Too many upstream content encodings" });
  let decoded: ArrayBuffer | Buffer = body;
  for (const encoding of encodings.toReversed()) {
    try {
      const options = { maxOutputLength: MAX_RESPONSE_BODY_BYTES };
      switch (encoding) {
        case "identity":
          break;
        case "gzip":
          decoded = gunzipSync(decoded, options);
          break;
        case "deflate":
          decoded = inflateSync(decoded, options);
          break;
        case "br":
          decoded = brotliDecompressSync(decoded, options);
          break;
        default:
          throw new CustomWidgetDomainError({ code: "BAD_GATEWAY", message: "Unsupported upstream content encoding" });
      }
    } catch (error) {
      if (error instanceof CustomWidgetDomainError) throw error;
      if (error instanceof Error && "code" in error && error.code === "ERR_BUFFER_TOO_LARGE") throw tooLarge();
      throw new CustomWidgetDomainError({ code: "BAD_GATEWAY", message: "Invalid compressed upstream response" });
    }
  }
  return decoded;
}

export async function parseResponseBody(response: Response, textFallback = false): Promise<unknown> {
  const text = await readLimitedBody(response);
  if (!text) return null;
  try {
    const json = JSON.parse(text) as unknown;
    assertJsonBudget(json);
    return json;
  } catch (error) {
    if (error instanceof CustomWidgetDomainError) throw error;
    if (!textFallback && response.headers.get("content-type")?.toLowerCase().includes("json")) {
      throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Upstream returned invalid JSON" });
    }
    return text;
  }
}

const tooLarge = () =>
  new CustomWidgetDomainError({ code: "PAYLOAD_TOO_LARGE", message: "Response exceeds the 1 MiB limit" });

export function redactResponseSecrets(data: unknown, secrets: Array<{ kind: string; value: string }>): unknown {
  if (secrets.length === 0) return data;
  const values = secrets.filter(({ value }) => value.length > 0);
  const username = secrets.find(({ kind }) => kind === "username")?.value;
  const password = secrets.find(({ kind }) => kind === "password")?.value;
  if (username && password) values.push({ kind: "basic", value: `${username}:${password}` });
  const sensitive = new Set<string>();
  const embedded = new Set<string>();
  for (const { kind, value } of values) {
    for (const encoded of [
      value,
      JSON.stringify(value).slice(1, -1),
      encodeURIComponent(value),
      Buffer.from(value).toString("base64"),
      Buffer.from(value).toString("base64").replace(/=+$/u, ""),
      Buffer.from(value).toString("base64url"),
    ]) {
      sensitive.add(encoded);
      // Usernames and short credentials can be ordinary words or characters in response data.
      if (kind !== "username" && value.length >= 12) embedded.add(encoded);
    }
  }
  const embeddedValues = [...embedded].toSorted((a, b) => b.length - a.length);
  const redactEmbedded = (value: string) => {
    for (const secret of embeddedValues) value = value.replaceAll(secret, "[REDACTED]");
    return value;
  };
  const visit = (value: unknown): unknown => {
    if (typeof value === "string") {
      if (sensitive.has(value)) return "[REDACTED]";
      return redactEmbedded(value);
    }
    if ((typeof value === "number" || typeof value === "boolean" || value === null) && sensitive.has(String(value)))
      return "[REDACTED]";
    if (Array.isArray(value)) return value.map(visit);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [redactEmbedded(key), visit(child)]));
    }
    return value;
  };
  return visit(data);
}
