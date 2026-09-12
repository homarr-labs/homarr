import { lookup } from "node:dns/promises";
import { performance } from "node:perf_hooks";
import { Agent, Headers, fetch } from "undici";
import { z } from "zod/v4";

import { getBoundConnection } from "./connections";
import type { PackageContext } from "./types";
import { diagnoseWidgetService } from "./service-diagnostics";

export const widgetHttpInputSchema = z.object({
  connection: z.string().min(1),
  path: z.string().default("/"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]).default("GET"),
  query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  responseType: z.enum(["json", "text", "base64"]).default("json"),
});

export async function fetchWidgetConnection(
  ctx: PackageContext,
  bindings: Record<string, string>,
  input: z.infer<typeof widgetHttpInputSchema>,
  signal?: AbortSignal,
) {
  const { configuration, secrets } = await getBoundConnection(ctx, bindings, input.connection);
  if (configuration.kind !== "http" || !configuration.baseUrl)
    throw new Error("This operation requires an HTTP connection; use getWidgetConnection for other services");
  const baseUrl = new URL(configuration.baseUrl);
  const url = new URL(input.path, `${configuration.baseUrl.replace(/\/$/u, "")}/`);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("HTTP connections require HTTP or HTTPS");
  if (url.origin !== baseUrl.origin) throw new Error("Use a separate connection for a different origin");
  for (const [key, value] of Object.entries(input.query ?? {})) url.searchParams.set(key, String(value));
  const headers = new Headers({ ...configuration.headers, ...input.headers });
  if (configuration.auth === "bearer") headers.set("authorization", `Bearer ${secrets.token ?? ""}`);
  if (configuration.auth === "basic")
    headers.set(
      "authorization",
      `Basic ${Buffer.from(`${secrets.username ?? ""}:${secrets.password ?? ""}`).toString("base64")}`,
    );
  if (configuration.auth === "cookie") headers.set("cookie", secrets.cookie ?? "");
  if (configuration.auth === "query") {
    for (const [name, value] of Object.entries(secrets)) {
      if (name !== "tlsKey") url.searchParams.set(name, value);
    }
  }
  if (configuration.auth === "headers") {
    for (const [name, value] of Object.entries(secrets)) {
      if (name !== "tlsKey") headers.set(name, value);
    }
  }
  let body: string | undefined;
  if (input.body !== undefined) {
    if (typeof input.body === "string") body = input.body;
    else {
      body = JSON.stringify(input.body);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    }
  }
  const dispatcher = new Agent({ connect: { ...configuration.tls, key: secrets.tlsKey } });
  const deadline = AbortSignal.timeout(configuration.timeoutMs);
  const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const started = performance.now();
  try {
    const response = await fetch(url, {
      method: input.method,
      headers,
      body,
      dispatcher,
      signal: requestSignal,
      redirect: "manual",
    });
    const chunks: Uint8Array[] = [];
    let length = 0;
    if (response.body) {
      for await (const chunk of response.body) {
        length += chunk.byteLength;
        if (length > configuration.maxResponseBytes) {
          throw new Error(`Response exceeds the connection limit of ${configuration.maxResponseBytes} bytes`);
        }
        chunks.push(chunk);
      }
    }
    const buffer = Buffer.concat(chunks, length);
    let data: unknown = new TextDecoder().decode(buffer);
    if (input.responseType === "base64") data = Buffer.from(buffer).toString("base64");
    else if (input.responseType === "json" && buffer.byteLength > 0) data = JSON.parse(data as string);
    return {
      data,
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
      durationMs: Math.round(performance.now() - started),
      updatedAt: new Date().toISOString(),
    };
  } finally {
    await dispatcher.close();
  }
}

export async function diagnoseWidgetConnection(ctx: PackageContext, id: string) {
  const { configuration } = await getBoundConnection(ctx, { target: id }, "target");
  if (configuration.kind === "service") return diagnoseWidgetService(configuration);
  if (!configuration.baseUrl) return { status: "integration" as const, addresses: [] };
  const url = new URL(configuration.baseUrl);
  let addresses: Awaited<ReturnType<typeof lookup>>[] = [];
  try {
    addresses = await lookup(url.hostname.replace(/^\[|\]$/gu, ""), { all: true });
  } catch (error) {
    return {
      status: "dnsError" as const,
      stage: "dns",
      hostname: url.hostname,
      addresses,
      error: diagnosticError(error),
    };
  }
  let response;
  try {
    response = await fetchWidgetConnection(
      ctx,
      { target: id },
      { connection: "target", path: url.href, method: "GET", responseType: "text" },
    );
  } catch (error) {
    const details = diagnosticError(error);
    let stage = "connection";
    if (/CERT|TLS|SSL|SELF_SIGNED|UNABLE_TO_VERIFY/iu.test(details.code ?? "")) stage = "tls";
    return { status: "unavailable" as const, stage, hostname: url.hostname, addresses, error: details };
  }
  let sampleFields: string[] = [];
  if (typeof response.data === "string") {
    try {
      const sample: unknown = JSON.parse(response.data);
      if (sample && typeof sample === "object" && !Array.isArray(sample))
        sampleFields = Object.keys(sample).slice(0, 24);
    } catch {
      /* Non-JSON sources are valid connections. */
    }
  }
  return {
    status: connectionStatus(response.status),
    stage: "response",
    hostname: url.hostname,
    addresses,
    httpStatus: response.status,
    contentType: response.contentType,
    durationMs: response.durationMs,
    sampleFields,
  };
}

function diagnosticError(error: unknown) {
  if (!(error instanceof Error)) return { message: "Connection failed", code: undefined };
  let source = error;
  if (error.cause instanceof Error) source = error.cause;
  let code: string | undefined;
  if ("code" in source && typeof source.code === "string") code = source.code;
  return { message: source.message, code };
}

function connectionStatus(status: number) {
  if (status === 401 || status === 403) return "credentialsRequired" as const;
  if (status >= 400) return "httpError" as const;
  if (status >= 300) return "redirect" as const;
  return "connected" as const;
}
