import { TRPCError } from "@trpc/server";
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
  displayConfigSchema,
} from "@homarr/validation/custom-widget";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../../trpc";
import { applyAuth } from "./auth";
import { extractDisplayDataWithFallback } from "./display-data";
import { parseDisplayConfig } from "./parse-display-config";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");

const logger = createLogger({ module: "custom-widget" });

const FETCH_TIMEOUT_MS = 10_000;

const validateUrl = (urlString: string): URL => new URL(urlString);

const updateFieldSerializers: Record<string, (value: unknown) => unknown> = {
  displayConfig: (value) => superjson.stringify(value),
};

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

    const displayConfig = parseDisplayConfig(
      definition.displayConfig,
      input.id,
      logger,
      "Corrupt displayConfig in custom widget",
    );

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
      const serialize = updateFieldSerializers[key];
      if (serialize) {
        updateValues[key] = serialize(value);
      } else {
        updateValues[key] = value;
      }
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
      displayConfig: parseDisplayConfig(
        definition.displayConfig,
        input.id,
        logger,
        "Corrupt displayConfig during export",
      ),
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
        displayConfig: displayConfigSchema,
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

      applyAuth(headers, url, input.authType, secrets, input.headerName);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

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
        const displayData = extractDisplayDataWithFallback(json, input.displayType, input.displayConfig);

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
