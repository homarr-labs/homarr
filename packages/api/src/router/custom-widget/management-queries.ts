import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { eq, or } from "@homarr/db";
import { boards, customWidgetDefinitions } from "@homarr/db/schema";
import {
  getCustomWidgetConfirmation,
  getCustomWidgetDefaultOptions,
  getCustomWidgetSecretRequirements,
} from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure, protectedProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import { parseStoredCustomWidgetDefinition, safeParseStoredCustomWidgetDefinition } from "./stored-definition";
import { executeCustomWidgetRequest } from "./request-executor";
import {
  hashRuntimeParams,
  renderRequestBody,
  renderRequestTarget,
  resolveCustomWidgetRequestValues,
} from "./request-manifest";
import { acquireCustomWidgetRequestLimit } from "./request-limits";
import { getCustomWidgetCacheVersion } from "./cache-version";

const manageProcedure = permissionRequiredProcedure.requiresPermission("custom-widget-manage");
const logger = createLogger({ module: "custom-widget:management" });

export const managementQueryProcedures = {
  list: manageProcedure
    .meta({ mcp: { enabled: true, description: "List all Custom JSX widgets." } })
    .query(async ({ ctx }) => {
      const definitions = await ctx.db.query.customWidgetDefinitions.findMany({
        orderBy: (table, { asc }) => asc(table.name),
        with: { secrets: true },
      });
      return definitions.map((definition) => {
        const result = safeParseStoredCustomWidgetDefinition(definition);
        if (!result.success) {
          logger.warn("Skipped parsing invalid custom widget definition", {
            id: definition.id,
            issueCount: result.issues.length,
          });
          return {
            id: definition.id,
            name: definition.name,
            description: definition.description ?? undefined,
            iconUrl: definition.iconUrl ?? undefined,
            sources: [],
            requestCount: 0,
            missingSecrets: [],
            options: {},
            updatedAt: definition.updatedAt,
            enabled: definition.enabled,
            valid: false as const,
            validationIssues: result.issues,
          };
        }

        const widget = result.widget;
        const configuredSecrets = new Set(definition.secrets.map((secret) => `${secret.sourceId}:${secret.kind}`));
        return {
          id: definition.id,
          name: widget.name,
          description: widget.description,
          iconUrl: widget.iconUrl,
          sources: Object.entries(widget.sources).map(([id, { name, baseUrl, networkScope, auth }]) => ({
            id,
            name,
            origin: new URL(baseUrl).origin,
            networkScope,
            authType: typeof auth === "string" ? auth : auth.type,
          })),
          requestCount: Object.keys(widget.requests).length,
          missingSecrets: getCustomWidgetSecretRequirements(widget.sources).filter(
            (requirement) => !configuredSecrets.has(`${requirement.sourceId}:${requirement.kind}`),
          ),
          options: widget.options,
          updatedAt: definition.updatedAt,
          enabled: definition.enabled,
          valid: true as const,
          validationIssues: [],
        };
      });
    }),

  get: manageProcedure
    .meta({ mcp: { enabled: true, description: "Get one Custom JSX widget without secret values." } })
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
        with: { secrets: true },
      });
      if (!definition) throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
      return {
        id: definition.id,
        ...parseStoredCustomWidgetDefinition(definition),
        enabled: definition.enabled,
        createdAt: definition.createdAt,
        updatedAt: definition.updatedAt,
        secrets: definition.secrets.map((secret) => ({
          sourceId: secret.sourceId,
          kind: secret.kind,
          hasValue: true,
          updatedAt: secret.updatedAt,
        })),
      };
    }),

  available: protectedProcedure
    .input(z.object({ boardId: z.string(), currentId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");
      const definitions = await ctx.db.query.customWidgetDefinitions.findMany({
        where: input.currentId
          ? or(eq(customWidgetDefinitions.enabled, true), eq(customWidgetDefinitions.id, input.currentId))
          : eq(customWidgetDefinitions.enabled, true),
        orderBy: (table, { asc }) => asc(table.name),
      });
      return definitions.flatMap((definition) => {
        const result = safeParseStoredCustomWidgetDefinition(definition);
        if (!result.success) {
          logger.warn("Excluded invalid custom widget definition from board picker", { id: definition.id });
          return [];
        }

        const widget = result.widget;
        return {
          id: definition.id,
          name: definition.name,
          description: definition.description,
          iconUrl: definition.iconUrl,
          options: widget.options,
          defaultOptions: getCustomWidgetDefaultOptions(widget.options),
          template: widget.template,
          sources: Object.entries(widget.sources).map(([id, { name, networkScope, auth }]) => ({
            id,
            name,
            networkScope,
            authType: typeof auth === "string" ? auth : auth.type,
          })),
          requestCapabilities: Object.entries(widget.requests).map(
            ([id, { kind, method, trigger, permission, confirmation, invalidates }]) => ({
              id,
              kind,
              method,
              trigger,
              minimumBoardPermission: permission,
              confirmation: getCustomWidgetConfirmation({ method, confirmation }),
              invalidates,
            }),
          ),
          optionRequests: Object.entries(widget.requests).flatMap(([id, request]) =>
            request.kind === "query" ? [{ id }] : [],
          ),
          updatedAt: definition.updatedAt,
        };
      });
    }),

  optionRequest: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        definitionId: z.string(),
        requestId: z.string(),
        params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
      }),
    )
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");
      const stored = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.definitionId),
        with: { secrets: true },
      });
      if (!stored || !stored.enabled) throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget not found" });
      const definition = parseStoredCustomWidgetDefinition(stored);
      const requestDefinition = definition.requests[input.requestId];
      if (requestDefinition?.kind !== "query")
        throw new TRPCError({ code: "NOT_FOUND", message: "Option query not found" });
      const request = { id: input.requestId, ...requestDefinition };
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), request.permission);
      const source = definition.sources[request.source];
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Option query source not found" });
      const release = await acquireCustomWidgetRequestLimit({
        category: "query",
        userId: ctx.session.user.id,
        itemId: `configuration:${input.boardId}`,
        definitionId: input.definitionId,
      });
      try {
        const values = resolveCustomWidgetRequestValues(request, input.params, {});
        const authType = typeof source.auth === "string" ? source.auth : source.auth.type;
        const response = await executeCustomWidgetRequest({
          baseUrl: source.baseUrl,
          targetUrl: renderRequestTarget(source.baseUrl, request, values),
          method: request.method,
          body: renderRequestBody(request, values),
          staticHeaders: request.headers,
          auth:
            request.auth === "none" || authType === "none"
              ? undefined
              : {
                  type: authType,
                  secrets: stored.secrets
                    .filter((secret) => secret.sourceId === request.source)
                    .map((secret) => ({ kind: secret.kind, value: decryptSecret(secret.encryptedValue) })),
                  headerName:
                    typeof source.auth === "object" && source.auth.type === "apiKeyHeader"
                      ? source.auth.name
                      : typeof source.auth === "object" && source.auth.type === "apiKeyQuery"
                        ? source.auth.name
                        : undefined,
                },
          networkScope: source.networkScope,
          kind: "query",
          cacheKey: `custom-widget:options:${input.definitionId}:${getCustomWidgetCacheVersion(stored)}:${request.id}:${hashRuntimeParams(values)}`,
          cacheTtlSeconds: request.cacheSeconds ?? 30,
        });
        return {
          ok: response.ok,
          status: response.status,
          data: response.data,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        };
      } finally {
        await release();
      }
    }),
};
