import { TRPCError } from "@trpc/server";
import { JSONPath } from "jsonpath-plus";
import superjson from "superjson";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import { customWidgetDefinitions } from "@homarr/db/schema";
import { eq } from "@homarr/db";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { executeFlowGraph } from "@homarr/custom-widget-nodes";
import type { FlowGraph } from "@homarr/custom-widget-nodes";

import type { DisplayConfig } from "@homarr/validation/custom-widget";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

const logger = createLogger({ module: "widget:customApi" });

const FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_PROTOCOLS = /^https?:\/\//;

const validateUrl = (baseUrl: string, endpoint: string): URL => {
  if (!ALLOWED_PROTOCOLS.test(baseUrl)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Base URL must use http or https protocol" });
  }

  if (/^https?:\/\//.test(endpoint)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Endpoint must be a relative path, not an absolute URL" });
  }

  const url = new URL(endpoint, baseUrl);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Requests to localhost are not allowed" });
  }

  return url;
};

const authHandlers: Record<string, (headers: Headers, url: URL, apiKey: string, headerName?: string) => void> = {
  bearer: (headers, _url, apiKey) => {
    headers.set("Authorization", `Bearer ${apiKey}`);
  },
  apiKeyHeader: (headers, _url, apiKey, headerName) => {
    headers.set(headerName ?? "X-API-Key", apiKey);
  },
  apiKeyQuery: (_headers, url, apiKey, headerName) => {
    url.searchParams.set(headerName ?? "api_key", apiKey);
  },
};

const applyAuth = (
  headers: Headers,
  url: URL,
  authType: string,
  secrets: Array<{ kind: string; value: string }>,
  headerName?: string | null,
) => {
  const secretMap: Record<string, string> = {};
  for (const s of secrets) {
    secretMap[s.kind] = s.value;
  }

  if (authType === "basic" && secretMap.username && secretMap.password) {
    const credentials = Buffer.from(`${secretMap.username}:${secretMap.password}`).toString("base64");
    headers.set("Authorization", `Basic ${credentials}`);
    return;
  }

  const handler = authHandlers[authType];
  if (handler && secretMap.apiKey) {
    handler(headers, url, secretMap.apiKey, headerName ?? undefined);
  }
};

const extractors: Record<string, (json: unknown, config: DisplayConfig) => unknown> = {
  singleValue: (json, config) => ({
    type: "singleValue" as const,
    label: "label" in config ? (config.label ?? "") : "",
    unit: "unit" in config ? (config.unit ?? "") : "",
    value: JSONPath({ path: "jsonPath" in config ? config.jsonPath : "$", json: json as object, wrap: false }),
  }),
  keyValue: (json, config) => ({
    type: "keyValue" as const,
    entries: ("mappings" in config ? config.mappings : []).map((m) => ({
      label: m.label,
      unit: m.unit,
      value: JSONPath({ path: m.jsonPath, json: json as object, wrap: false }),
    })),
  }),
  table: (json, config) => {
    const tablePath = "tablePath" in config ? config.tablePath : "$";
    const columns = "columns" in config ? config.columns : [];
    const rows = JSONPath({ path: tablePath, json: json as object, wrap: true }) as unknown[];
    const flatRows = Array.isArray(rows[0]) ? (rows[0] as unknown[]) : rows;
    return {
      type: "table" as const,
      columns: columns.map((c) => c.header),
      rows: flatRows.map((row) => columns.map((c) => JSONPath({ path: c.jsonPath, json: row as object, wrap: false }))),
    };
  },
};

export const customApiRouter = createTRPCRouter({
  getData: protectedProcedure.input(z.object({ definitionId: z.string() })).query(async ({ ctx, input }) => {
    const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.definitionId),
      with: { secrets: true },
    });

    if (!definition) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
    }

    const decryptedSecrets = definition.secrets.map((s) => ({
      kind: s.kind,
      value: decryptSecret(s.value),
    }));

    if (definition.flowGraph) {
      try {
        const graph = JSON.parse(definition.flowGraph) as FlowGraph;
        const secretMap: Record<string, string> = {};
        for (const s of decryptedSecrets) {
          secretMap[s.kind] = s.value;
        }
        return await executeFlowGraph(graph, secretMap);
      } catch (error) {
        logger.error("Failed to execute flow graph", { definitionId: input.definitionId, error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to execute flow graph",
        });
      }
    }

    const url = validateUrl(definition.baseUrl, definition.endpoint);
    const headers = new Headers({ Accept: "application/json" });

    if (definition.method !== "GET" && definition.requestBody) {
      headers.set("Content-Type", "application/json");
    }

    applyAuth(headers, url, definition.authType, decryptedSecrets, definition.headerName);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: definition.method,
        headers,
        body: definition.method !== "GET" ? definition.requestBody : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `API returned ${response.status}: ${response.statusText}`,
        });
      }

      const json: unknown = await response.json();
      const displayConfig = superjson.parse(definition.displayConfig) as DisplayConfig;
      const extractor = extractors[displayConfig.type] ?? extractors.singleValue!;

      return extractor!(json, displayConfig);
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      logger.error("Failed to fetch custom API data", { definitionId: input.definitionId, error });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch data from external API",
      });
    } finally {
      clearTimeout(timeout);
    }
  }),
});
