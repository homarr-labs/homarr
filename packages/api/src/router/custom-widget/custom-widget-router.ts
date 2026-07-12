import { createHash } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { stringify as stringifySuperJson } from "superjson";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { boards, customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
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
  customJsxDisplayConfigV2Schema,
  displayConfigSchema,
} from "@homarr/validation/custom-widget";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import { extractActionButtonDisplay, extractDisplayDataWithFallback } from "./display-data";
import { parseDisplayConfig } from "./parse-display-config";
import { executeCustomWidgetRequest } from "./request-executor";
import { hashRuntimeParams, renderRequestBody, renderRequestTarget } from "./request-manifest";
import { acquireCustomWidgetRequestLimit } from "./request-limits";
import {
  appendPreviewJournal,
  createPreviewSession,
  getPreviewJournal,
  getPreviewSession,
  getPreviewSessionSecrets,
  setPreviewSessionLiveActions,
} from "./preview-sessions";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");

const logger = createLogger({ module: "custom-widget" });

const recordPreviewJournal = async (...args: Parameters<typeof appendPreviewJournal>) => {
  try {
    await appendPreviewJournal(...args);
  } catch (error) {
    logger.warn("Failed to append custom widget preview journal", {
      sessionId: args[0].id,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
};

const previewRuntimeParamsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
const previewSessionRequestSchema = z.object({
  sessionId: z.string().min(1),
  requestId: z.string().min(1).max(64),
  params: previewRuntimeParamsSchema.default({}),
});

const updateFieldSerializers: Record<string, (value: unknown) => unknown> = {
  displayConfig: (value) => stringifySuperJson(value),
};

let importJsonSchemaCache: Record<string, unknown> | null = null;
function getImportJsonSchema() {
  if (!importJsonSchemaCache) {
    importJsonSchemaCache = {
      ...z.toJSONSchema(customWidgetImportSchema),
      title: "Homarr Custom Widget",
      description:
        "Schema for importing/exporting custom widget definitions in Homarr. " +
        "All jsonPath fields use JSONPath syntax (e.g. $.data.count, $.items[0].name). " +
        "The displayConfig must match the chosen displayType. " +
        "Secrets (API keys, passwords) are not included in exports and must be configured separately after import.",
    };
  }
  return importJsonSchemaCache;
}

const getTemplateRevision = (template: string) => createHash("sha256").update(template).digest("hex").slice(0, 16);

const validateUpdatedTemplate = (displayConfig: Record<string, unknown>, template: string) => {
  displayConfig.template = template;
  const result = displayConfigSchema.safeParse(displayConfig);
  if (!result.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: result.error.issues
        .map((issue) => `${issue.path.map(String).join(".") || "template"}: ${issue.message}`)
        .join("; "),
    });
  }
  return result.data;
};

export const customWidgetRouter = createTRPCRouter({
  schema: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get the JSON Schema for Homarr custom-widget imports. Use this before generating a widget and before calling validate, create, or update.",
      },
    })
    .query(() => getImportJsonSchema()),

  validate: adminProcedure
    .input(z.object({ widget: z.unknown() }))
    .meta({
      mcp: {
        enabled: true,
        description:
          "Validate a complete custom-widget JSON draft without saving or making network requests. REQUIRED: widget (the homarr-custom-widget-v3 object). Returns structured issue paths and messages so an agent can correct the draft and validate again.",
      },
    })
    .query(({ input }) => {
      const result = customWidgetImportSchema.safeParse(input.widget);
      if (!result.success) {
        return {
          valid: false as const,
          issues: result.error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            code: issue.code,
            message: issue.message,
          })),
        };
      }
      return {
        valid: true as const,
        issues: [],
        widget: result.data,
      };
    }),

  all: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "List all custom-widget definitions. Admin only. Use the returned ID to inspect or update a widget.",
      },
    })
    .query(async ({ ctx }) => {
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

  byId: adminProcedure
    .input(z.object({ id: z.string() }))
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get one complete custom-widget definition for iterative editing. REQUIRED: id. Stored secret values are never returned; only their presence is reported.",
      },
    })
    .query(async ({ ctx, input }) => {
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

  available: protectedProcedure.input(z.object({ boardId: z.string() })).query(async ({ ctx, input }) => {
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");
    return ctx.db.query.customWidgetDefinitions.findMany({
      where: eq(customWidgetDefinitions.enabled, true),
      orderBy: (table, { asc }) => asc(table.name),
      columns: {
        id: true,
        name: true,
        description: true,
        iconUrl: true,
        displayType: true,
      },
    });
  }),

  create: adminProcedure
    .input(customWidgetCreateSchema)
    .meta({
      mcp: {
        enabled: true,
        description:
          "Create a validated custom widget. Admin only. Call customWidget_schema and customWidget_validate first. For Custom JSX use jsxApiVersion 2, named requests, a GET base method, and no inline credentials.",
      },
    })
    .mutation(async ({ ctx, input }) => {
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
        displayConfig: stringifySuperJson(input.displayConfig),
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

  update: adminProcedure
    .input(customWidgetUpdateSchema)
    .meta({
      mcp: {
        enabled: true,
        description:
          "Update an existing custom widget. Admin only. REQUIRED: id. Read it with customWidget_byId, preserve unrelated fields, validate the resulting complete draft, then send the changed fields. Omit secrets to preserve stored credentials.",
      },
    })
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const effectiveDisplayConfig =
        input.displayConfig ??
        parseDisplayConfig(existing.displayConfig, input.id, logger, "Corrupt displayConfig in custom widget update");
      const effectiveMethod = input.method ?? existing.method;
      if (customJsxDisplayConfigV2Schema.safeParse(effectiveDisplayConfig).success && effectiveMethod !== "GET") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Custom JSX v2 base data requests must use GET; mutations belong in named actions",
        });
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
        } else if (
          effectiveAuthType === "none" ||
          (typeof updateFields.authType === "string" && updateFields.authType !== existing.authType)
        ) {
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

  readTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .meta({
      mcp: {
        enabled: true,
        description:
          "Read the JSX template of a custom widget definition as plain text. Returns the template string separately from the full widget config, making it easier to inspect and edit.",
      },
    })
    .query(async ({ ctx, input }) => {
      const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });

      if (!definition) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
      }

      const config = parseDisplayConfig(
        definition.displayConfig,
        input.id,
        logger,
        "Corrupt displayConfig in custom widget readTemplate",
      );

      if (config.type !== "customJsx") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Widget is not using customJsx display type",
        });
      }

      const template = (config.template as string | undefined) ?? "";
      return {
        id: definition.id,
        name: definition.name,
        template,
        templateLines: template.split("\n"),
        revision: getTemplateRevision(template),
      };
    }),

  writeTemplate: adminProcedure
    .input(
      z
        .object({
          id: z.string(),
          template: z.string().optional(),
          templateLines: z.array(z.string()).optional(),
        })
        .refine((data) => data.template !== undefined || data.templateLines !== undefined, {
          message: "Provide either template or templateLines",
        })
        .refine((data) => !(data.template !== undefined && data.templateLines !== undefined), {
          message: "Provide template or templateLines, not both",
        }),
    )
    .meta({
      mcp: {
        enabled: true,
        description:
          "Update only the JSX template of a custom widget definition. Accepts either a single template string or templateLines (array of strings joined with newlines). Validates the template AST before saving. This avoids needing to send the full widget JSON for template-only edits.",
      },
    })
    .mutation(async ({ ctx, input }) => {
      const resolvedTemplate =
        input.templateLines !== undefined ? input.templateLines.join("\n") : (input.template ?? "");

      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
      }

      const displayConfig = parseDisplayConfig(
        existing.displayConfig,
        input.id,
        logger,
        "Corrupt displayConfig in custom widget writeTemplate",
      );

      if (displayConfig.type !== "customJsx") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Widget is not using customJsx display type",
        });
      }

      if (resolvedTemplate.trim().length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Template must not be empty" });
      }
      if (resolvedTemplate.length > 50_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Template exceeds the 50,000 character limit" });
      }

      const validatedConfig = validateUpdatedTemplate(displayConfig, resolvedTemplate);

      await ctx.db
        .update(customWidgetDefinitions)
        .set({ displayConfig: stringifySuperJson(validatedConfig), updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, input.id));

      logger.info("Updated custom widget template", { id: input.id });
      return {
        id: input.id,
        template: resolvedTemplate,
        templateLines: resolvedTemplate.split("\n"),
        revision: getTemplateRevision(resolvedTemplate),
      };
    }),

  patchTemplate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        expectedRevision: z.string().length(16),
        edits: z
          .array(
            z.object({
              startLine: z.number().int().min(1),
              deleteCount: z.number().int().min(0),
              replacementLines: z.array(z.string()),
            }),
          )
          .min(1)
          .max(100),
      }),
    )
    .meta({
      mcp: {
        enabled: true,
        description:
          "Patch selected lines of a Custom JSX template without rewriting the whole template. First call customWidget_readTemplate and pass its revision as expectedRevision. Each edit uses a 1-based startLine, deleteCount, and replacementLines. Edits are applied atomically, then the complete template and named-request references are validated before saving. A stale revision is rejected so the agent can re-read and retry safely.",
      },
    })
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });

      const displayConfig = parseDisplayConfig(
        existing.displayConfig,
        input.id,
        logger,
        "Corrupt displayConfig in custom widget patchTemplate",
      );
      if (displayConfig.type !== "customJsx") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Widget is not using customJsx display type" });
      }

      const currentTemplate = (displayConfig.template as string | undefined) ?? "";
      if (getTemplateRevision(currentTemplate) !== input.expectedRevision) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Template changed since it was read. Read the template again and retry the patch.",
        });
      }

      const lines = currentTemplate.split("\n");
      const edits = input.edits.toSorted((left, right) => right.startLine - left.startLine);
      let nextHigherStart = lines.length + 2;
      for (const edit of edits) {
        if (edit.startLine > lines.length + 1 || edit.startLine + edit.deleteCount - 1 > lines.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Edit at line ${edit.startLine} is out of range` });
        }
        if (edit.startLine + Math.max(edit.deleteCount, 1) > nextHigherStart) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Template patch edits must not overlap" });
        }
        nextHigherStart = edit.startLine;
        lines.splice(edit.startLine - 1, edit.deleteCount, ...edit.replacementLines);
      }

      const template = lines.join("\n");
      const validatedConfig = validateUpdatedTemplate(displayConfig, template);
      await ctx.db
        .update(customWidgetDefinitions)
        .set({ displayConfig: stringifySuperJson(validatedConfig), updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, input.id));

      logger.info("Patched custom widget template", { id: input.id, editCount: input.edits.length });
      return {
        id: input.id,
        template,
        templateLines: lines,
        revision: getTemplateRevision(template),
      };
    }),

  export: adminProcedure
    .input(z.object({ id: z.string() }))
    .meta({
      mcp: {
        enabled: true,
        description:
          "Export one custom widget as a homarr-custom-widget-v3 object suitable for validation, modification, and re-import. REQUIRED: id. Secrets are excluded.",
      },
    })
    .query(async ({ ctx, input }) => {
      const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });

      if (!definition) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        $schema: "homarr-custom-widget-v3" as const,
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

  import: adminProcedure
    .input(customWidgetImportSchema)
    .meta({
      mcp: {
        enabled: true,
        description:
          "Create a custom widget directly from a complete homarr-custom-widget-v3 import object. Admin only. Use customWidget_validate first. This is the preferred creation tool for AI-generated authoring bundles because secrets are omitted and configured separately.",
      },
    })
    .mutation(async ({ ctx, input }) => {
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
        displayConfig: stringifySuperJson(input.displayConfig),
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
        secrets: z.array(z.object({ kind: z.enum(customWidgetSecretKinds), value: z.string() })).default([]),
        definitionId: z.string().optional(),
      }),
    )
    .meta({
      mcp: {
        enabled: true,
        description:
          "Test a custom-widget draft through Homarr's hardened preview executor. Admin only. GET only; actions remain simulated. REQUIRED: url, method GET, authType, displayType, displayConfig. OPTIONAL: definitionId reuses that saved widget's stored credentials; omit secrets whenever possible. Returns sanitized response data, HTTP status, and a short-lived preview session for named query testing.",
      },
    })
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

      const v2Config = customJsxDisplayConfigV2Schema.safeParse(input.displayConfig);
      const previewSession = v2Config.success
        ? await createPreviewSession({
            userId: ctx.session.user.id,
            baseUrl: input.url,
            authType: input.authType,
            headerName: input.headerName,
            secrets,
            networkScope: v2Config.data.networkScope,
            requests: v2Config.data.requests,
            definitionId: input.definitionId,
          })
        : null;
      const storedPreviewSession = previewSession
        ? await getPreviewSession(previewSession.id, ctx.session.user.id)
        : null;

      if (input.method !== "GET") {
        return {
          success: true as const,
          simulated: true as const,
          responseInfo: null,
          rawResponse: null,
          displayData: input.displayType === "actionButton" ? extractActionButtonDisplay(input.displayConfig) : null,
          previewSession,
        };
      }

      const release = await acquireCustomWidgetRequestLimit({
        category: "query",
        userId: ctx.session.user.id,
        itemId: `preview:${ctx.session.user.id}`,
        definitionId: input.definitionId ?? `preview:${ctx.session.user.id}`,
      });
      const startedAt = Date.now();
      try {
        const response = await executeCustomWidgetRequest({
          baseUrl: input.url,
          method: input.method,
          body: undefined,
          auth: { type: input.authType, secrets, headerName: input.headerName },
          networkScope: v2Config.success ? v2Config.data.networkScope : "private",
          kind: "query",
        });
        if (storedPreviewSession) {
          await recordPreviewJournal(storedPreviewSession, {
            requestId: "base",
            kind: "query",
            method: "GET",
            pathTemplate: new URL(input.url).pathname,
            status: response.status,
            durationMs: Date.now() - startedAt,
            simulated: false,
          });
        }
        const responseInfo = { status: response.status, statusText: response.statusText };
        if (!response.ok) {
          return {
            success: false as const,
            error: `HTTP ${response.status}: ${response.statusText}`,
            responseInfo,
            rawResponse: typeof response.data === "string" ? response.data : JSON.stringify(response.data, null, 2),
            previewSession,
          };
        }

        const displayData = extractDisplayDataWithFallback(response.data, input.displayType, input.displayConfig);

        return {
          success: true as const,
          responseInfo,
          rawResponse: typeof response.data === "string" ? response.data : JSON.stringify(response.data, null, 2),
          displayData,
          previewSession,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error("Custom widget preview failed", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return {
          success: false as const,
          error: error instanceof Error ? error.message : "Failed to fetch data",
          responseInfo: null,
          rawResponse: null,
          previewSession,
        };
      } finally {
        await release();
      }
    }),

  previewQuery: adminProcedure
    .input(previewSessionRequestSchema)
    .meta({
      mcp: {
        enabled: true,
        description:
          "Run one named GET query from a short-lived custom-widget preview session. REQUIRED: sessionId from customWidget_preview, requestId declared as a query, and typed params. Uses the hardened executor and returns sanitized response data for another validate/update iteration.",
      },
    })
    .query(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.sessionId, ctx.session.user.id);
      const request = session.requests.find(
        (candidate) => candidate.id === input.requestId && candidate.kind === "query",
      );
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Preview query was not found" });
      const targetUrl = renderRequestTarget(session.baseUrl, request, input.params);
      const release = await acquireCustomWidgetRequestLimit({
        category: "query",
        userId: ctx.session.user.id,
        itemId: `preview:${session.id}`,
        definitionId: session.definitionId ?? `preview:${session.id}`,
      });
      const startedAt = Date.now();
      try {
        const response = await executeCustomWidgetRequest({
          baseUrl: session.baseUrl,
          targetUrl,
          method: "GET",
          staticHeaders: request.staticHeaders,
          auth:
            request.auth === "none"
              ? undefined
              : {
                  type: session.authType,
                  secrets: getPreviewSessionSecrets(session),
                  headerName: session.headerName,
                },
          networkScope: session.networkScope,
          kind: "query",
          cacheKey: `custom-jsx:preview:${session.id}:${request.id}:${hashRuntimeParams(input.params)}`,
          cacheTtlSeconds: request.cacheTtlSeconds,
        });
        await recordPreviewJournal(session, {
          requestId: request.id,
          kind: "query",
          method: "GET",
          pathTemplate: request.pathTemplate,
          status: response.status,
          durationMs: Date.now() - startedAt,
          simulated: false,
        });
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        };
      } finally {
        await release();
      }
    }),

  setPreviewLiveActions: adminProcedure
    .input(z.object({ sessionId: z.string().min(1), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) =>
      setPreviewSessionLiveActions(input.sessionId, ctx.session.user.id, input.enabled),
    ),

  previewJournal: adminProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .meta({
      mcp: {
        enabled: true,
        description:
          "Read the redacted request journal for a custom-widget preview session. REQUIRED: sessionId. Use it to inspect statuses and durations; credentials and parameter values are never returned.",
      },
    })
    .query(async ({ ctx, input }) => getPreviewJournal(input.sessionId, ctx.session.user.id)),

  simulatePreviewAction: adminProcedure
    .input(previewSessionRequestSchema)
    .meta({
      mcp: {
        enabled: true,
        description:
          "Validate and simulate one named custom-widget action without sending a network request. REQUIRED: sessionId from customWidget_preview, action requestId, and typed params. Confirms parameter substitution and records a simulated journal entry. This MCP tool never enables or executes live actions.",
      },
    })
    .mutation(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.sessionId, ctx.session.user.id);
      const request = session.requests.find(
        (candidate) => candidate.id === input.requestId && candidate.kind === "action",
      );
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Preview action was not found" });
      renderRequestTarget(session.baseUrl, request, input.params);
      renderRequestBody(request.bodyTemplate, input.params);
      await recordPreviewJournal(session, {
        requestId: request.id,
        kind: "action",
        method: request.method,
        pathTemplate: request.pathTemplate,
        status: null,
        durationMs: 0,
        simulated: true,
      });
      return {
        ok: true,
        simulated: true as const,
        requestId: request.id,
        method: request.method,
        requiredPermission: request.minimumBoardPermission,
      };
    }),

  previewAction: adminProcedure
    .input(previewSessionRequestSchema.extend({ confirmed: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const session = await getPreviewSession(input.sessionId, ctx.session.user.id);
      const request = session.requests.find(
        (candidate) => candidate.id === input.requestId && candidate.kind === "action",
      );
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Preview action was not found" });
      const targetUrl = renderRequestTarget(session.baseUrl, request, input.params);
      const body = renderRequestBody(request.bodyTemplate, input.params);
      if (!session.liveActions) {
        await recordPreviewJournal(session, {
          requestId: request.id,
          kind: "action",
          method: request.method,
          pathTemplate: request.pathTemplate,
          status: null,
          durationMs: 0,
          simulated: true,
        });
        return { ok: true, status: 0, statusText: "Simulated", data: null, simulated: true as const };
      }
      if (request.method === "DELETE" && input.confirmed !== true) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "DELETE actions require confirmation" });
      }
      const release = await acquireCustomWidgetRequestLimit({
        category: request.method === "DELETE" ? "delete" : "action",
        userId: ctx.session.user.id,
        itemId: `preview:${session.id}`,
        definitionId: session.definitionId ?? `preview:${session.id}`,
      });
      const startedAt = Date.now();
      try {
        const response = await executeCustomWidgetRequest({
          baseUrl: session.baseUrl,
          targetUrl,
          method: request.method,
          body,
          staticHeaders: request.staticHeaders,
          auth:
            request.auth === "none"
              ? undefined
              : {
                  type: session.authType,
                  secrets: getPreviewSessionSecrets(session),
                  headerName: session.headerName,
                },
          networkScope: session.networkScope,
          kind: "action",
        });
        await recordPreviewJournal(session, {
          requestId: request.id,
          kind: "action",
          method: request.method,
          pathTemplate: request.pathTemplate,
          status: response.status,
          durationMs: Date.now() - startedAt,
          simulated: false,
        });
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
          simulated: false as const,
        };
      } finally {
        await release();
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
});
