import { TRPCError } from "@trpc/server";
import { JSONPath } from "jsonpath-plus";
import superjson from "superjson";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import { eq } from "@homarr/db";
import { createLogger } from "@homarr/core/infrastructure/logs";
import {
  customWidgetAuthTypes,
  customWidgetCreateSchema,
  customWidgetDisplayTypes,
  customWidgetImportSchema,
  customWidgetMethods,
  customWidgetSecretKinds,
  customWidgetUpdateSchema,
} from "@homarr/validation/custom-widget";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../../trpc";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");

const logger = createLogger({ module: "custom-widget" });

const validateUrl = (urlString: string): URL => new URL(urlString);

let _importJsonSchema: Record<string, unknown> | null = null;
function getImportJsonSchema() {
  if (!_importJsonSchema) {
    _importJsonSchema = {
      ...z.toJSONSchema(customWidgetImportSchema),
      title: "Homarr Custom Widget",
      description:
        "Schema for importing/exporting custom widget definitions in Homarr. " +
        "All jsonPath fields use JSONPath syntax (e.g. $.data.count, $.items[0].name). " +
        "The displayConfig must match the chosen displayType. " +
        "Secrets (API keys, passwords) are not included in exports and must be configured separately after import.",
    };
  }
  return _importJsonSchema;
}

export const customWidgetRouter = createTRPCRouter({
  schema: publicProcedure.query(() => getImportJsonSchema()),

  all: protectedProcedure.query(async ({ ctx }) => {
    const definitions = await ctx.db.query.customWidgetDefinitions.findMany({
      orderBy: (table, { asc }) => asc(table.name),
    });

    return definitions.map((def) => ({
      id: def.id,
      name: def.name,
      description: def.description,
      iconUrl: def.iconUrl,
      url: def.url,
      method: def.method,
      displayType: def.displayType,
      authType: def.authType,
      enabled: def.enabled,
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

    let displayConfig: Record<string, unknown>;
    try {
      displayConfig = superjson.parse(definition.displayConfig) as Record<string, unknown>;
    } catch {
      logger.error("Corrupt displayConfig in custom widget", { id: input.id });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Widget has corrupt display configuration" });
    }

    return {
      ...definition,
      enabled: definition.enabled,
      displayConfig,
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
      url: input.url,
      authType: input.authType,
      headerName: input.headerName,
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

    const { id, secrets, ...updateFields } = input;
    const updateValues: Record<string, unknown> = { updatedAt: new Date() };

    for (const [key, value] of Object.entries(updateFields)) {
      if (value === undefined) continue;
      updateValues[key] = key === "displayConfig" ? superjson.stringify(value) : value;
    }

    await ctx.db.update(customWidgetDefinitions).set(updateValues).where(eq(customWidgetDefinitions.id, id));

    if (secrets !== undefined) {
      const effectiveAuthType = (updateFields.authType as string | undefined) ?? existing.authType;

      if (secrets.length > 0) {
        await ctx.db.delete(customWidgetSecrets).where(eq(customWidgetSecrets.definitionId, id));
        await ctx.db.insert(customWidgetSecrets).values(
          secrets.map((secret) => ({
            kind: secret.kind,
            value: encryptSecret(secret.value),
            definitionId: id,
            updatedAt: new Date(),
          })),
        );
      } else if (effectiveAuthType === "none") {
        await ctx.db.delete(customWidgetSecrets).where(eq(customWidgetSecrets.definitionId, id));
      }
    }

    logger.info("Updated custom widget definition", { id });
  }),

  toggleEnabled: adminProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db
        .update(customWidgetDefinitions)
        .set({ enabled: input.enabled, updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, input.id));
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

  export: adminProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });

    if (!definition) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return {
      $schema: "homarr-custom-widget-v2" as const,
      name: definition.name,
      description: definition.description,
      iconUrl: definition.iconUrl,
      url: definition.url,
      authType: definition.authType,
      headerName: definition.headerName,
      method: definition.method,
      requestBody: definition.requestBody,
      displayType: definition.displayType,
      displayConfig: (() => {
        try {
          return superjson.parse(definition.displayConfig) as Record<string, unknown>;
        } catch {
          logger.error("Corrupt displayConfig during export", { id: input.id });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Widget has corrupt display configuration" });
        }
      })(),
    };
  }),

  import: adminProcedure.input(customWidgetImportSchema).mutation(async ({ ctx, input }) => {
    const id = createId();

    await ctx.db.insert(customWidgetDefinitions).values({
      id,
      name: input.name,
      description: input.description,
      iconUrl: input.iconUrl,
      url: input.url,
      authType: input.authType,
      headerName: input.headerName,
      method: input.method,
      requestBody: input.requestBody,
      displayType: input.displayType,
      displayConfig: superjson.stringify(input.displayConfig),
      creatorId: ctx.session.user.id,
    });

    logger.info("Imported custom widget definition", { id, name: input.name });
    return { id };
  }),

  preview: adminProcedure
    .input(
      z.object({
        url: z.string().url(),
        method: z.enum(customWidgetMethods),
        authType: z.enum(customWidgetAuthTypes),
        headerName: z.string().optional(),
        requestBody: z.string().optional(),
        displayType: z.enum(customWidgetDisplayTypes),
        displayConfig: z.record(z.string(), z.unknown()),
        secrets: z.array(z.object({ kind: z.enum(customWidgetSecretKinds), value: z.string() })),
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

      const url = validateUrl(input.url);
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
          redirect: "follow",
          signal: controller.signal,
        });

        const responseInfo = { status: response.status, statusText: response.statusText };

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          return {
            success: false as const,
            error: `HTTP ${response.status}: ${response.statusText}`,
            responseInfo,
            rawResponse: body,
          };
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
              rows: flatRows.map((row) =>
                columns.map((col) => JSONPath({ path: col.jsonPath, json: row as object, wrap: false })),
              ),
              striped: c.striped ?? true,
              compact: c.compact ?? false,
            };
          },
          statGrid: (j, c) => ({
            type: "statGrid",
            items: ((c.items as Array<{ label: string; jsonPath: string; unit: string; color?: string }>) ?? []).map(
              (item) => ({
                label: item.label,
                unit: item.unit,
                color: item.color ?? "blue",
                value: JSONPath({ path: item.jsonPath, json: j as object, wrap: false }),
              }),
            ),
            columns: c.columns ?? 2,
            cardStyle: c.cardStyle ?? "filled",
          }),
          progressBars: (j, c) => ({
            type: "progressBars",
            bars: (
              (c.bars as Array<{ label: string; valuePath: string; maxPath?: string; unit: string; color?: string }>) ??
              []
            ).map((bar) => {
              const value = JSONPath({ path: bar.valuePath, json: j as object, wrap: false });
              const max = bar.maxPath ? JSONPath({ path: bar.maxPath, json: j as object, wrap: false }) : undefined;
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
        const extractor = extractors[displayType] ?? extractors.singleValue;
        const displayData = extractor?.(json, displayConfig);

        return {
          success: true as const,
          responseInfo,
          rawResponse: JSON.stringify(json, null, 2),
          displayData,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error("Custom widget preview failed", { error });
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
      url: definition.url,
      authType: definition.authType,
      headerName: definition.headerName,
      method: definition.method,
      requestBody: definition.requestBody,
      displayType: definition.displayType,
      displayConfig: definition.displayConfig,
      enabled: definition.enabled,
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

    if (!definition.enabled) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Widget is disabled" });
    }

    if (definition.displayType !== "actionButton") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Only actionButton widgets can be executed" });
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
        redirect: "follow",
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
      logger.error("Custom widget execute failed", { definitionId: input.definitionId, error });
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Request failed",
        responseInfo: null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }),
});
