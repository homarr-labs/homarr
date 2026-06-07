import { TRPCError } from "@trpc/server";
import { JSONPath } from "jsonpath-plus";
import superjson from "superjson";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import { customWidgetDefinitions } from "@homarr/db/schema";
import { eq } from "@homarr/db";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { createTRPCRouter, protectedProcedure } from "../../trpc";

const logger = createLogger({ module: "widget:customApi" });

const FETCH_TIMEOUT_MS = 10_000;

const validateUrl = (urlString: string): URL => new URL(urlString);

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

const extractors: Record<string, (json: unknown, config: Record<string, unknown>) => unknown> = {
  singleValue: (json, c) => ({
    type: "singleValue",
    label: (c.label as string) ?? "",
    unit: (c.unit as string) ?? "",
    value: JSONPath({ path: (c.jsonPath as string) ?? "$", json: json as object, wrap: false }),
    valueSize: c.valueSize ?? "lg",
    labelPosition: c.labelPosition ?? "below",
  }),
  keyValue: (json, c) => ({
    type: "keyValue",
    entries: ((c.mappings as Array<{ label: string; jsonPath: string; unit: string }>) ?? []).map((m) => ({
      label: m.label,
      unit: m.unit,
      value: JSONPath({ path: m.jsonPath, json: json as object, wrap: false }),
    })),
    layout: c.layout ?? "list",
    columns: c.columns ?? 2,
  }),
  table: (json, c) => {
    const tablePath = (c.tablePath as string) ?? "$";
    const columns = (c.columns as Array<{ header: string; jsonPath: string }>) ?? [];
    const rows = JSONPath({ path: tablePath, json: json as object, wrap: true }) as unknown[];
    const flatRows = Array.isArray(rows[0]) ? (rows[0] as unknown[]) : rows;
    return {
      type: "table",
      columns: columns.map((col) => col.header),
      rows: flatRows.map((row) =>
        columns.map((col) => JSONPath({ path: col.jsonPath, json: row as object, wrap: false })),
      ),
      striped: c.striped ?? true,
      compact: c.compact ?? false,
    };
  },
  statGrid: (json, c) => ({
    type: "statGrid",
    items: ((c.items as Array<{ label: string; jsonPath: string; unit: string; color?: string }>) ?? []).map(
      (item) => ({
        label: item.label,
        unit: item.unit,
        color: item.color ?? "blue",
        value: JSONPath({ path: item.jsonPath, json: json as object, wrap: false }),
      }),
    ),
    columns: c.columns ?? 2,
    cardStyle: c.cardStyle ?? "filled",
  }),
  progressBars: (json, c) => ({
    type: "progressBars",
    bars: (
      (c.bars as Array<{ label: string; valuePath: string; maxPath?: string; unit: string; color?: string }>) ?? []
    ).map((bar) => {
      const value = JSONPath({ path: bar.valuePath, json: json as object, wrap: false });
      const max = bar.maxPath ? JSONPath({ path: bar.maxPath, json: json as object, wrap: false }) : undefined;
      return {
        label: bar.label,
        unit: bar.unit,
        color: bar.color ?? "blue",
        value: Number(value) || 0,
        max: max !== undefined ? Number(max) || 100 : undefined,
      };
    }),
    showPercentage: c.showPercentage ?? true,
    barSize: c.barSize ?? "md",
  }),
  statusIndicator: (json, c) => ({
    type: "statusIndicator",
    items: ((c.items as Array<{ label: string; jsonPath: string; goodValues: string[] }>) ?? []).map((item) => {
      const value = JSONPath({ path: item.jsonPath, json: json as object, wrap: false });
      const isGood = item.goodValues.some((gv) => String(value).toLowerCase() === gv.toLowerCase());
      return { label: item.label, value: String(value ?? "unknown"), isGood };
    }),
    layout: c.layout ?? "list",
    dotSize: c.dotSize ?? "md",
  }),
  countGrid: (json, c) => ({
    type: "countGrid",
    items: ((c.items as Array<{ label: string; jsonPath: string; unit: string }>) ?? []).map((item) => ({
      label: item.label,
      unit: item.unit,
      value: JSONPath({ path: item.jsonPath, json: json as object, wrap: false }),
    })),
    columns: c.columns ?? 2,
    valueSize: c.valueSize ?? "md",
  }),
  raw: (json, c) => ({
    type: "raw",
    data: JSONPath({ path: (c.jsonPath as string) ?? "$", json: json as object, wrap: false }),
    maxHeight: c.maxHeight ?? 300,
  }),
  actionButton: (_json, c) => ({
    type: "actionButton",
    buttonLabel: c.buttonLabel ?? "Execute",
    buttonColor: c.buttonColor ?? "blue",
    confirmText: c.confirmText ?? "",
    successMessage: c.successMessage ?? "",
  }),
  customJsx: (json, config) => ({
    type: "customJsx" as const,
    template: config.template as string,
    data: json,
  }),
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

    if (!definition.enabled) {
      return { type: "disabled" };
    }

    let displayConfig: Record<string, unknown>;
    try {
      displayConfig = superjson.parse(definition.displayConfig) as Record<string, unknown>;
    } catch {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Widget has corrupt display configuration" });
    }

    if (definition.displayType === "actionButton") {
      return extractors.actionButton!(null, displayConfig);
    }

    const decryptedSecrets = definition.secrets.map((s) => ({
      kind: s.kind,
      value: decryptSecret(s.value),
    }));

    const url = validateUrl(definition.url);
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
        redirect: "follow",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `API returned ${response.status}: ${response.statusText}`,
        });
      }

      const json: unknown = await response.json();
      const displayType = (displayConfig.type as string) ?? definition.displayType;
      const extractor = extractors[displayType] ?? extractors.singleValue!;

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
