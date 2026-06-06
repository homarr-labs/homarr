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
import type { DisplayConfig } from "@homarr/validation/custom-widget";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

const logger = createLogger({ module: "custom-widget" });

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

  create: protectedProcedure.input(customWidgetCreateSchema).mutation(async ({ ctx, input }) => {
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

  update: protectedProcedure.input(customWidgetUpdateSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    ensureOwnerOrAdmin(existing.creatorId, ctx.session.user.id, ctx.session.user.permissions);

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

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    ensureOwnerOrAdmin(existing.creatorId, ctx.session.user.id, ctx.session.user.permissions);

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

  import: protectedProcedure.input(customWidgetImportSchema).mutation(async ({ ctx, input }) => {
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

  migrateToFlow: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
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

  preview: protectedProcedure
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

      const ALLOWED_PROTOCOLS = /^https?:\/\//;
      if (!ALLOWED_PROTOCOLS.test(input.baseUrl)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Base URL must use http or https protocol" });
      }

      const url = new URL(input.endpoint, input.baseUrl);
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
          signal: controller.signal,
        });

        const responseInfo = { status: response.status, statusText: response.statusText };

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          return { success: false as const, error: `HTTP ${response.status}: ${response.statusText}`, responseInfo, rawResponse: body.slice(0, 2000) };
        }

        const json: unknown = await response.json();
        const displayConfig = input.displayConfig as DisplayConfig;

        const extractors: Record<string, (j: unknown, c: DisplayConfig) => unknown> = {
          singleValue: (j, c) => ({
            type: "singleValue" as const,
            label: "label" in c ? (c.label ?? "") : "",
            unit: "unit" in c ? (c.unit ?? "") : "",
            value: JSONPath({ path: "jsonPath" in c ? c.jsonPath : "$", json: j as object, wrap: false }),
          }),
          keyValue: (j, c) => ({
            type: "keyValue" as const,
            entries: ("mappings" in c ? c.mappings : []).map((m) => ({
              label: m.label,
              unit: m.unit,
              value: JSONPath({ path: m.jsonPath, json: j as object, wrap: false }),
            })),
          }),
          table: (j, c) => {
            const tablePath = "tablePath" in c ? c.tablePath : "$";
            const columns = "columns" in c ? c.columns : [];
            const rows = JSONPath({ path: tablePath, json: j as object, wrap: true }) as unknown[];
            const flatRows = Array.isArray(rows[0]) ? (rows[0] as unknown[]) : rows;
            return {
              type: "table" as const,
              columns: columns.map((col) => col.header),
              rows: flatRows.map((row) => columns.map((col) => JSONPath({ path: col.jsonPath, json: row as object, wrap: false }))),
            };
          },
        };

        const extractor = extractors[displayConfig.type] ?? extractors.singleValue!;
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

  migrateAll: protectedProcedure.mutation(async ({ ctx }) => {
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
