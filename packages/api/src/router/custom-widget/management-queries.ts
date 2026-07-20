import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import { eq, or } from "@homarr/db";
import { boards, customWidgetDefinitions } from "@homarr/db/schema";
import { getCustomWidgetSecretRequirements } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure, protectedProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import { parseStoredCustomWidgetDefinition } from "./stored-definition";
import { executeCustomWidgetRequest } from "./request-executor";
import { hashRuntimeParams, renderRequestBody, renderRequestTarget } from "./request-manifest";
import { acquireCustomWidgetRequestLimit } from "./request-limits";
import { getCustomWidgetCacheVersion } from "./cache-version";

const manageProcedure = permissionRequiredProcedure.requiresPermission("custom-widget-manage");

export const managementQueryProcedures = {
  list: manageProcedure
    .meta({ mcp: { enabled: true, description: "List all Custom JSX widgets." } })
    .query(async ({ ctx }) => {
      const definitions = await ctx.db.query.customWidgetDefinitions.findMany({
        orderBy: (table, { asc }) => asc(table.name),
        with: { secrets: true },
      });
      return definitions.map((definition) => {
        const widget = parseStoredCustomWidgetDefinition(definition);
        const configuredSecrets = new Set(definition.secrets.map((secret) => `${secret.sourceId}:${secret.kind}`));
        return {
          id: definition.id,
          name: widget.name,
          description: widget.description,
          iconUrl: widget.iconUrl,
          sources: widget.sources.map(({ id, name, baseUrl, networkScope, auth }) => ({
            id,
            name,
            origin: new URL(baseUrl).origin,
            networkScope,
            authType: auth.type,
          })),
          requestCount: widget.requests.length,
          missingSecrets: getCustomWidgetSecretRequirements(widget.sources).filter(
            (requirement) => !configuredSecrets.has(`${requirement.sourceId}:${requirement.kind}`),
          ),
          defaultOptions: widget.defaultOptions,
          updatedAt: definition.updatedAt,
          enabled: definition.enabled,
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
      return definitions.map((definition) => {
        const widget = parseStoredCustomWidgetDefinition(definition);
        return {
          id: definition.id,
          name: definition.name,
          description: definition.description,
          iconUrl: definition.iconUrl,
          optionsSchema: widget.optionsSchema,
          defaultOptions: widget.defaultOptions,
          template: widget.template,
          sources: widget.sources.map(({ id, name, networkScope, auth }) => ({
            id,
            name,
            networkScope,
            authType: auth.type,
          })),
          requestCapabilities: widget.requests.map(
            ({ id, kind, method, trigger, minimumBoardPermission, confirmation, invalidates }) => ({
              id,
              kind,
              method,
              trigger,
              minimumBoardPermission,
              confirmation,
              invalidates,
            }),
          ),
          optionRequests: widget.requests
            .filter((request) => request.kind === "query")
            .map(({ id, parameters, optionsBinding }) => ({ id, parameters, optionsBinding })),
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
      const request = definition.requests.find(
        (candidate) => candidate.id === input.requestId && candidate.kind === "query",
      );
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Option query not found" });
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), request.minimumBoardPermission);
      const source = definition.sources.find((candidate) => candidate.id === request.sourceId);
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Option query source not found" });
      const release = await acquireCustomWidgetRequestLimit({
        category: "query",
        userId: ctx.session.user.id,
        itemId: `configuration:${input.boardId}`,
        definitionId: input.definitionId,
      });
      try {
        const response = await executeCustomWidgetRequest({
          baseUrl: source.baseUrl,
          targetUrl: renderRequestTarget(source.baseUrl, request, input.params),
          method: request.method,
          body: renderRequestBody(request.bodyTemplate, input.params),
          staticHeaders: request.staticHeaders,
          auth:
            request.auth === "none" || source.auth.type === "none"
              ? undefined
              : {
                  type: source.auth.type,
                  secrets: stored.secrets
                    .filter((secret) => secret.sourceId === source.id)
                    .map((secret) => ({ kind: secret.kind, value: decryptSecret(secret.encryptedValue) })),
                  headerName:
                    source.auth.type === "apiKeyHeader"
                      ? source.auth.headerName
                      : source.auth.type === "apiKeyQuery"
                        ? source.auth.parameterName
                        : undefined,
                },
          networkScope: source.networkScope,
          kind: "query",
          cacheKey: `custom-widget:options:${input.definitionId}:${getCustomWidgetCacheVersion(stored)}:${request.id}:${hashRuntimeParams(input.params)}`,
          cacheTtlSeconds: request.cacheTtlSeconds ?? 30,
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
