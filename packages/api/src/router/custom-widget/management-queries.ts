import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import { eq, or } from "@homarr/db";
import { boards, customWidgetDefinitions, legacyCustomWidgetDefinitions } from "@homarr/db/schema";
import { collectCustomWidgetRequestReferences } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure, protectedProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import { parseStoredCustomWidgetDefinition } from "./stored-definition";
import { executeCustomWidgetRequest } from "./request-executor";
import {
  hashRuntimeParams,
  renderRequestBody,
  renderRequestTarget,
  resolveCustomWidgetRequestValues,
} from "./request-manifest";
import { acquireCustomWidgetRequestLimit } from "./request-limits";
import { getCustomWidgetCacheVersion } from "./cache-version";
import { buildLegacyCustomWidgetMigrationPrompt } from "./legacy-migration";
import {
  mapAvailableCustomWidget,
  mapCustomWidgetListItem,
  mapLegacyAvailableCustomWidget,
  mapLegacyCustomWidgetListItem,
} from "./management-query-mappers";

const manageProcedure = permissionRequiredProcedure.requiresPermission("custom-widget-manage");

export const managementQueryProcedures = {
  list: manageProcedure
    .meta({ mcp: { enabled: true, description: "List all Custom JSX widgets." } })
    .query(async ({ ctx }) => {
      const [definitions, legacyDefinitions] = await Promise.all([
        ctx.db.query.customWidgetDefinitions.findMany({
          orderBy: (table, { asc }) => asc(table.name),
          with: { secrets: true },
        }),
        ctx.db.query.legacyCustomWidgetDefinitions.findMany({
          orderBy: (table, { asc }) => asc(table.name),
          with: { secrets: true },
        }),
      ]);
      const current = definitions.map(mapCustomWidgetListItem);
      const legacy = legacyDefinitions.map(mapLegacyCustomWidgetListItem);
      return [...current, ...legacy].toSorted((left, right) => left.name.localeCompare(right.name));
    }),

  legacyMigrationPrompt: manageProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const definition = await ctx.db.query.legacyCustomWidgetDefinitions.findFirst({
      where: eq(legacyCustomWidgetDefinitions.id, input.id),
      with: { secrets: true },
    });
    if (!definition) throw new TRPCError({ code: "NOT_FOUND", message: "Legacy custom widget not found" });
    return {
      id: definition.id,
      version: 1 as const,
      prompt: buildLegacyCustomWidgetMigrationPrompt(
        definition,
        definition.secrets.map(({ kind }) => kind),
      ),
    };
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
      const available = definitions.flatMap(mapAvailableCustomWidget);
      if (!input.currentId || available.some(({ id }) => id === input.currentId)) return available;
      const legacy = await ctx.db.query.legacyCustomWidgetDefinitions.findFirst({
        where: eq(legacyCustomWidgetDefinitions.id, input.currentId),
      });
      if (!legacy) return available;
      return [...available, mapLegacyAvailableCustomWidget(legacy)];
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
        const values = resolveOptionRequestValues(request, input.params);
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

export function resolveOptionRequestValues(
  request: Parameters<typeof resolveCustomWidgetRequestValues>[0],
  configuration: NonNullable<Parameters<typeof resolveCustomWidgetRequestValues>[2]>,
) {
  const references = collectCustomWidgetRequestReferences(request);
  const options: Record<string, unknown> = {};
  const params: typeof configuration = {};
  for (const name of references.options) {
    const value = configuration[name];
    if (value !== undefined) options[name] = value;
  }
  for (const name of references.params) {
    const value = configuration[name];
    if (value !== undefined) params[name] = value;
  }
  return resolveCustomWidgetRequestValues(request, options, params);
}
