import { TRPCError } from "@trpc/server";
import { JSONPath } from "jsonpath-plus";
import superjson from "superjson";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import { eq } from "@homarr/db";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { flatDefinitionToFlowGraph } from "@homarr/custom-widget-nodes";
import {
  customWidgetCreateSchema,
  customWidgetImportSchema,
  customWidgetUpdateSchema,
} from "@homarr/validation/custom-widget";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure } from "../../trpc";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");

const logger = createLogger({ module: "custom-widget" });

const ALLOWED_PROTOCOLS = /^https?:\/\//;
const PRIVATE_IP_RANGES = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|fc|fd|fe80|::1|localhost)/i;

const validateBaseUrl = (baseUrl: string, endpoint: string): URL => {
  if (!ALLOWED_PROTOCOLS.test(baseUrl)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Base URL must use http or https protocol" });
  }
  const url = new URL(endpoint, baseUrl);
  if (PRIVATE_IP_RANGES.test(url.hostname)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Requests to private/internal addresses are not allowed" });
  }
  return url;
};

const ensureOwnerOrAdmin = (creatorId: string | null, userId: string, permissions: string[]) => {
  if (permissions.includes("admin")) return;
  if (creatorId === userId) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "You can only modify your own custom widget definitions" });
};

export const customWidgetRouter = createTRPCRouter({
  all: protectedProcedure.query(async ({ ctx }) => {
    const definitions = await ctx.db.query.customWidgetDefinitions.findMany({
      orderBy: (table, { asc }) => asc(table.name),
    });

    return definitions.map((def) => ({
      id: def.id,
      name: def.name,
      description: def.description,
      iconUrl: def.iconUrl,
      baseUrl: def.baseUrl,
      endpoint: def.endpoint,
      method: def.method,
      displayType: def.displayType,
      authType: def.authType,
    }));
  }),

  byId: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
      with: { secrets: true },
    });

    if (!definition) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
    }

    return {
      ...definition,
      displayConfig: superjson.parse(definition.displayConfig) as Record<string, unknown>,
      flowGraph: definition.flowGraph ?? null,
      secrets: definition.secrets.map((s) => ({
        kind: s.kind,
        hasValue: true,
        updatedAt: s.updatedAt,
      })),
    };
  }),

  create: adminProcedure.input(customWidgetCreateSchema).mutation(async ({ ctx, input }) => {
    const id = createId();

    await ctx.db.insert(customWidgetDefinitions).values({
      id,
      name: input.name,
      description: input.description,
      iconUrl: input.iconUrl,
      baseUrl: input.baseUrl,
      authType: input.authType,
      headerName: input.headerName,
      endpoint: input.endpoint,
      method: input.method,
      requestBody: input.requestBody,
      displayType: input.displayType,
      displayConfig: superjson.stringify(input.displayConfig),
      creatorId: ctx.session.user.id,
    });

    if (input.secrets.length > 0) {
      await ctx.db.insert(customWidgetSecrets).values(
        input.secrets.map((secret) => ({
          kind: secret.kind,
          value: encryptSecret(secret.value),
          definitionId: id,
          updatedAt: new Date(),
        })),
      );
    }

    logger.info("Created custom widget definition", { id, name: input.name });
    return { id };
  }),

  update: adminProcedure.input(customWidgetUpdateSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const { id, secrets, flowGraph, ...updateFields } = input;
    const updateValues: Record<string, unknown> = { updatedAt: new Date() };

    if (flowGraph !== undefined) {
      updateValues.flowGraph = flowGraph;
    }

    for (const [key, value] of Object.entries(updateFields)) {
      if (value === undefined) continue;
      updateValues[key] = key === "displayConfig" ? superjson.stringify(value) : value;
    }

    await ctx.db.update(customWidgetDefinitions).set(updateValues).where(eq(customWidgetDefinitions.id, id));

    if (secrets && secrets.length > 0) {
      await ctx.db.delete(customWidgetSecrets).where(eq(customWidgetSecrets.definitionId, id));
      await ctx.db.insert(customWidgetSecrets).values(
        secrets.map((secret) => ({
          kind: secret.kind,
          value: encryptSecret(secret.value),
          definitionId: id,
          updatedAt: new Date(),
        })),
      );
    }

    logger.info("Updated custom widget definition", { id });
  }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    await ctx.db.delete(customWidgetDefinitions).where(eq(customWidgetDefinitions.id, input.id));
    logger.info("Deleted custom widget definition", { id: input.id });
  }),

  export: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });

    if (!definition) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return {
      $schema: "homarr-custom-widget-v1" as const,
      name: definition.name,
      description: definition.description,
      iconUrl: definition.iconUrl,
      baseUrl: definition.baseUrl,
      authType: definition.authType,
      headerName: definition.headerName,
      endpoint: definition.endpoint,
      method: definition.method,
      requestBody: definition.requestBody,
      displayType: definition.displayType,
      displayConfig: superjson.parse(definition.displayConfig) as Record<string, unknown>,
    };
  }),

  import: adminProcedure.input(customWidgetImportSchema).mutation(async ({ ctx, input }) => {
    const id = createId();

    await ctx.db.insert(customWidgetDefinitions).values({
      id,
      name: input.name,
      description: input.description,
      iconUrl: input.iconUrl,
      baseUrl: input.baseUrl,
      authType: input.authType,
      headerName: input.headerName,
      endpoint: input.endpoint,
      method: input.method,
      requestBody: input.requestBody,
      displayType: input.displayType,
      displayConfig: superjson.stringify(input.displayConfig),
      creatorId: ctx.session.user.id,
    });

    logger.info("Imported custom widget definition", { id, name: input.name });
    return { id };
  }),

  migrateToFlow: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });

    if (!definition) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    if (definition.flowGraph) {
      return { alreadyMigrated: true };
    }

    const flowGraph = flatDefinitionToFlowGraph({
      baseUrl: definition.baseUrl,
      endpoint: definition.endpoint,
      method: definition.method,
      authType: definition.authType,
      headerName: definition.headerName,
      displayType: definition.displayType,
      displayConfig: definition.displayConfig,
    });

    await ctx.db
      .update(customWidgetDefinitions)
      .set({ flowGraph: JSON.stringify(flowGraph), updatedAt: new Date() })
      .where(eq(customWidgetDefinitions.id, input.id));

    logger.info("Migrated custom widget to flow graph", { id: input.id });
    return { alreadyMigrated: false, flowGraph };
  }),

  preview: adminProcedure
    .input(
      z.object({
        baseUrl: z.string().min(1),
        endpoint: z.string().min(1),
        method: z.string(),
        authType: z.string(),
        headerName: z.string().optional(),
        requestBody: z.string().optional(),
        displayType: z.string(),
        displayConfig: z.record(z.string(), z.unknown()),
        secrets: z.array(z.object({ kind: z.string(), value: z.string() })),
        definitionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const secrets = [...input.secrets];

      if (input.definitionId) {
        const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.definitionId),
          with: { secrets: true },
        });
        if (existing) {
          for (const dbSecret of existing.secrets) {
            if (!secrets.some((s) => s.kind === dbSecret.kind)) {
              secrets.push({ kind: dbSecret.kind, value: decryptSecret(dbSecret.value) });
            }
          }
        }
      }

      const url = validateBaseUrl(input.baseUrl, input.endpoint);
      const headers = new Headers({ Accept: "application/json" });

      if (input.method !== "GET" && input.requestBody) {
        headers.set("Content-Type", "application/json");
      }

      const secretMap: Record<string, string> = {};
      for (const s of secrets) {
        secretMap[s.kind] = s.value;
      }

      const authHandlers: Record<string, (h: Headers, u: URL, key: string, name?: string) => void> = {
        bearer: (h, _u, key) => h.set("Authorization", `Bearer ${key}`),
        apiKeyHeader: (h, _u, key, name) => h.set(name ?? "X-API-Key", key),
        apiKeyQuery: (_h, u, key, name) => u.searchParams.set(name ?? "api_key", key),
      };

      if (input.authType === "basic" && secretMap.username && secretMap.password) {
        const creds = Buffer.from(`${secretMap.username}:${secretMap.password}`).toString("base64");
        headers.set("Authorization", `Basic ${creds}`);
      } else {
        const handler = authHandlers[input.authType];
        if (handler && secretMap.apiKey) {
          handler(headers, url, secretMap.apiKey, input.headerName);
        }
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      try {
        const response = await fetch(url.toString(), {
          method: input.method,
          headers,
          body: input.method !== "GET" ? input.requestBody : undefined,
          redirect: "error",
          signal: controller.signal,
        });

        const responseInfo = { status: response.status, statusText: response.statusText };

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          return { success: false as const, error: `HTTP ${response.status}: ${response.statusText}`, responseInfo, rawResponse: body.slice(0, 2000) };
        }

        const json: unknown = await response.json();
        const displayConfig = input.displayConfig;

        const extractors: Record<string, (j: unknown, c: Record<string, unknown>) => unknown> = {
          singleValue: (j, c) => ({
            type: "singleValue",
            label: (c.label as string) ?? "",
            unit: (c.unit as string) ?? "",
            value: JSONPath({ path: (c.jsonPath as string) ?? "$", json: j as object, wrap: false }),
            valueSize: c.valueSize ?? "lg",
            labelPosition: c.labelPosition ?? "below",
          }),
          keyValue: (j, c) => ({
            type: "keyValue",
            entries: ((c.mappings as Array<{ label: string; jsonPath: string; unit: string }>) ?? []).map((m) => ({
              label: m.label,
              unit: m.unit,
              value: JSONPath({ path: m.jsonPath, json: j as object, wrap: false }),
            })),
            layout: c.layout ?? "list",
            columns: c.columns ?? 2,
          }),
          table: (j, c) => {
            const tablePath = (c.tablePath as string) ?? "$";
            const columns = (c.columns as Array<{ header: string; jsonPath: string }>) ?? [];
            const rows = JSONPath({ path: tablePath, json: j as object, wrap: true }) as unknown[];
            const flatRows = Array.isArray(rows[0]) ? (rows[0] as unknown[]) : rows;
            return {
              type: "table",
              columns: columns.map((col) => col.header),
              rows: flatRows.map((row) => columns.map((col) => JSONPath({ path: col.jsonPath, json: row as object, wrap: false }))),
              striped: c.striped ?? true,
              compact: c.compact ?? false,
            };
          },
          statGrid: (j, c) => ({
            type: "statGrid",
            items: ((c.items as Array<{ label: string; jsonPath: string; unit: string; color?: string }>) ?? []).map((item) => ({
              label: item.label,
              unit: item.unit,
              color: item.color ?? "blue",
              value: JSONPath({ path: item.jsonPath, json: j as object, wrap: false }),
            })),
            columns: c.columns ?? 2,
            cardStyle: c.cardStyle ?? "filled",
          }),
          progressBars: (j, c) => ({
            type: "progressBars",
            bars: ((c.bars as Array<{ label: string; valuePath: string; maxPath?: string; unit: string; color?: string }>) ?? []).map((bar) => {
              const value = JSONPath({ path: bar.valuePath, json: j as object, wrap: false });
              const max = bar.maxPath ? JSONPath({ path: bar.maxPath, json: j as object, wrap: false }) : undefined;
              return { label: bar.label, unit: bar.unit, color: bar.color ?? "blue", value: Number(value) || 0, max: max !== undefined ? Number(max) || 100 : undefined };
            }),
            showPercentage: c.showPercentage ?? true,
            barSize: c.barSize ?? "md",
          }),
          statusIndicator: (j, c) => ({
            type: "statusIndicator",
            items: ((c.items as Array<{ label: string; jsonPath: string; goodValues: string[] }>) ?? []).map((item) => {
              const value = JSONPath({ path: item.jsonPath, json: j as object, wrap: false });
              const isGood = item.goodValues.some((gv) => String(value).toLowerCase() === gv.toLowerCase());
              return { label: item.label, value: String(value ?? "unknown"), isGood };
            }),
            layout: c.layout ?? "list",
            dotSize: c.dotSize ?? "md",
          }),
          countGrid: (j, c) => ({
            type: "countGrid",
            items: ((c.items as Array<{ label: string; jsonPath: string; unit: string }>) ?? []).map((item) => ({
              label: item.label,
              unit: item.unit,
              value: JSONPath({ path: item.jsonPath, json: j as object, wrap: false }),
            })),
            columns: c.columns ?? 2,
            valueSize: c.valueSize ?? "md",
          }),
          raw: (j, c) => ({
            type: "raw",
            data: JSONPath({ path: (c.jsonPath as string) ?? "$", json: j as object, wrap: false }),
            maxHeight: c.maxHeight ?? 300,
          }),
          actionButton: (_j, c) => ({
            type: "actionButton",
            buttonLabel: c.buttonLabel ?? "Execute",
            buttonColor: c.buttonColor ?? "blue",
          }),
        };

        const displayType = (displayConfig as { type?: string }).type ?? input.displayType;
        const extractor = extractors[displayType] ?? extractors.singleValue!;
        const displayData = extractor!(json, displayConfig);

        return {
          success: true as const,
          responseInfo,
          rawResponse: JSON.stringify(json, null, 2).slice(0, 5000),
          displayData,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return {
          success: false as const,
          error: error instanceof Error ? error.message : "Failed to fetch data",
          responseInfo: null,
          rawResponse: null,
        };
      } finally {
        clearTimeout(timeout);
      }
    }),

  duplicate: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
      with: { secrets: true },
    });

    if (!definition) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const newId = createId();
    await ctx.db.insert(customWidgetDefinitions).values({
      id: newId,
      name: `${definition.name} (copy)`,
      description: definition.description,
      iconUrl: definition.iconUrl,
      baseUrl: definition.baseUrl,
      authType: definition.authType,
      headerName: definition.headerName,
      endpoint: definition.endpoint,
      method: definition.method,
      requestBody: definition.requestBody,
      displayType: definition.displayType,
      displayConfig: definition.displayConfig,
      flowGraph: definition.flowGraph,
      creatorId: ctx.session.user.id,
    });

    if (definition.secrets.length > 0) {
      await ctx.db.insert(customWidgetSecrets).values(
        definition.secrets.map((s) => ({
          kind: s.kind,
          value: s.value,
          definitionId: newId,
          updatedAt: new Date(),
        })),
      );
    }

    logger.info("Duplicated custom widget definition", { sourceId: input.id, newId });
    return { id: newId, name: `${definition.name} (copy)` };
  }),

  execute: protectedProcedure.input(z.object({ definitionId: z.string() })).mutation(async ({ ctx, input }) => {
    const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.definitionId),
      with: { secrets: true },
    });

    if (!definition) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
    }

    ensureOwnerOrAdmin(definition.creatorId, ctx.session.user.id, ctx.session.user.permissions);

    const decryptedSecrets = definition.secrets.map((s) => ({
      kind: s.kind,
      value: decryptSecret(s.value),
    }));

    const url = validateBaseUrl(definition.baseUrl, definition.endpoint);
    const headers = new Headers({ Accept: "application/json" });

    if (definition.method !== "GET" && definition.requestBody) {
      headers.set("Content-Type", "application/json");
    }

    const secretMap: Record<string, string> = {};
    for (const s of decryptedSecrets) {
      secretMap[s.kind] = s.value;
    }

    const authHandlers: Record<string, (h: Headers, u: URL, key: string, name?: string) => void> = {
      bearer: (h, _u, key) => h.set("Authorization", `Bearer ${key}`),
      apiKeyHeader: (h, _u, key, name) => h.set(name ?? "X-API-Key", key),
      apiKeyQuery: (_h, u, key, name) => u.searchParams.set(name ?? "api_key", key),
    };

    if (definition.authType === "basic" && secretMap.username && secretMap.password) {
      const creds = Buffer.from(`${secretMap.username}:${secretMap.password}`).toString("base64");
      headers.set("Authorization", `Basic ${creds}`);
    } else {
      const handler = authHandlers[definition.authType];
      if (handler && secretMap.apiKey) {
        handler(headers, url, secretMap.apiKey, definition.headerName ?? undefined);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(url.toString(), {
        method: definition.method,
        headers,
        body: definition.method !== "GET" ? definition.requestBody : undefined,
        redirect: "error",
        signal: controller.signal,
      });

      const responseInfo = { status: response.status, statusText: response.statusText };

      if (!response.ok) {
        return { success: false as const, error: `HTTP ${response.status}: ${response.statusText}`, responseInfo };
      }

      logger.info("Executed custom widget action", { definitionId: input.definitionId, status: response.status });
      return { success: true as const, responseInfo };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      return { success: false as const, error: error instanceof Error ? error.message : "Request failed", responseInfo: null };
    } finally {
      clearTimeout(timeout);
    }
  }),

  migrateAll: adminProcedure.mutation(async ({ ctx }) => {
    const definitions = await ctx.db.query.customWidgetDefinitions.findMany();
    let migrated = 0;

    for (const definition of definitions) {
      if (definition.flowGraph) continue;

      const flowGraph = flatDefinitionToFlowGraph({
        baseUrl: definition.baseUrl,
        endpoint: definition.endpoint,
        method: definition.method,
        authType: definition.authType,
        headerName: definition.headerName,
        displayType: definition.displayType,
        displayConfig: definition.displayConfig,
      });

      await ctx.db
        .update(customWidgetDefinitions)
        .set({ flowGraph: JSON.stringify(flowGraph), updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, definition.id));

      migrated++;
    }

    logger.info("Migrated all custom widgets to flow graphs", { count: migrated });
    return { migrated, total: definitions.length };
  }),
});
