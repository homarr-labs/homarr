import { Buffer } from "node:buffer";
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

export async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await readLimitedBody(response);
  if (!text) return null;
  try {
    const json = JSON.parse(text) as unknown;
    assertJsonBudget(json);
    return json;
  } catch (error) {
    if (error instanceof CustomWidgetDomainError) throw error;
    if (response.headers.get("content-type")?.toLowerCase().includes("json")) {
      throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Upstream returned invalid JSON" });
    }
    return text;
  }
}

const tooLarge = () =>
  new CustomWidgetDomainError({ code: "PAYLOAD_TOO_LARGE", message: "Response exceeds the 1 MiB limit" });

export function redactResponseSecrets(data: unknown, secrets: Array<{ kind: string; value: string }>): unknown {
  if (secrets.length === 0) return data;
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
