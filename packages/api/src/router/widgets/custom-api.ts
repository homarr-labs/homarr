import { TRPCError } from "@trpc/server";
import { parse as parseSuperJson } from "superjson";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import { eq } from "@homarr/db";
import { boards, customWidgetDefinitions, items, legacyCustomWidgetDefinitions } from "@homarr/db/schema";
import type { BoardPermission } from "@homarr/definitions";
import {
  getCustomWidgetConfirmation,
  getCustomWidgetDefaultOptions,
  normalizeCustomWidgetOptions,
  validateCustomWidgetOptions,
} from "@homarr/custom-widgets/core";
import type { CustomJsxRequest, CustomWidgetSource } from "@homarr/custom-widgets/core";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import { executeCustomWidgetRequest, invalidateCustomWidgetResponseCache } from "../custom-widget/request-executor";
import {
  hashRuntimeParams,
  renderRequestBody,
  renderRequestTarget,
  resolveCustomWidgetRequestValues,
} from "../custom-widget/request-manifest";
import { acquireCustomWidgetRequestLimit } from "../custom-widget/request-limits";
import { getCustomWidgetCacheVersion } from "../custom-widget/cache-version";
import { parseStoredCustomWidgetDefinition } from "../custom-widget/stored-definition";

const runtimeParamsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
const itemInputSchema = z.object({ itemId: z.string().min(1) });
const namedRequestInputSchema = itemInputSchema.extend({
  requestId: z.string().min(1).max(64),
  params: runtimeParamsSchema.default({}),
});
interface CustomWidgetItemOptions {
  definitionId: string;
  configuration: Record<string, unknown>;
  configurationVersion: number;
  refreshInterval?: number;
}

type RouterContext = Parameters<typeof throwIfActionForbiddenAsync>[0];
type ResolvedDefinition = Awaited<ReturnType<typeof resolvePlacedDefinitionAsync>>;

const parseItemOptions = (raw: string): CustomWidgetItemOptions => {
  try {
    const options = parseSuperJson(raw) as Record<string, unknown>;
    if (typeof options.definitionId !== "string" || options.definitionId.length === 0) throw new Error();
    return {
      definitionId: options.definitionId,
      configuration:
        options.configuration !== null &&
        typeof options.configuration === "object" &&
        !Array.isArray(options.configuration)
          ? (options.configuration as Record<string, unknown>)
          : {},
      configurationVersion:
        typeof options.configurationVersion === "number" && Number.isInteger(options.configurationVersion)
          ? options.configurationVersion
          : 1,
      refreshInterval: typeof options.refreshInterval === "number" ? options.refreshInterval : undefined,
    };
  } catch {
    throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget item not found" });
  }
};

async function resolvePlacedDefinitionAsync(ctx: RouterContext, itemId: string) {
  const item = await ctx.db.query.items.findFirst({
    where: eq(items.id, itemId),
    columns: { id: true, boardId: true, kind: true, options: true },
  });
  if (!item || item.kind !== "customApi") {
    throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget item not found" });
  }

  await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "view");
  const itemOptions = parseItemOptions(item.options);
  const stored = await ctx.db.query.customWidgetDefinitions.findFirst({
    where: eq(customWidgetDefinitions.id, itemOptions.definitionId),
    with: { secrets: true },
  });
  if (!stored) {
    const legacy = await ctx.db.query.legacyCustomWidgetDefinitions.findFirst({
      where: eq(legacyCustomWidgetDefinitions.id, itemOptions.definitionId),
      columns: { id: true },
    });
    if (legacy) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "LEGACY_CUSTOM_WIDGET_MIGRATION_REQUIRED",
      });
    }
    throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget unavailable" });
  }
  if (!stored.enabled) throw new TRPCError({ code: "FORBIDDEN", message: "Widget is disabled" });

  const definition = parseStoredCustomWidgetDefinition(stored);
  const configuration =
    itemOptions.configurationVersion === stored.updatedAt.getTime()
      ? { ...getCustomWidgetDefaultOptions(definition.options), ...itemOptions.configuration }
      : normalizeCustomWidgetOptions(definition.options, itemOptions.configuration);
  const issues = validateCustomWidgetOptions(definition.options, configuration);
  if (issues.length > 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Custom widget configuration needs repair: ${issues[0]?.path} ${issues[0]?.message}`,
    });
  }
  return { item, stored, definition, itemOptions, configuration };
}

const findRequest = (resolved: ResolvedDefinition, requestId: string, kind: "query" | "action") => {
  const request = resolved.definition.requests[requestId];
  if (request?.kind !== kind) throw new TRPCError({ code: "NOT_FOUND", message: "Named request not found" });
  if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Named request not found" });
  return { id: requestId, ...request };
};

const findSource = (resolved: ResolvedDefinition, sourceId: string) => {
  const source = resolved.definition.sources[sourceId];
  if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Widget API source not found" });
  return { id: sourceId, ...source };
};

type IdentifiedRequest = CustomJsxRequest & { id: string };
type IdentifiedSource = CustomWidgetSource & { id: string };

const getAuth = (resolved: ResolvedDefinition, source: IdentifiedSource, mode: "inherit" | "none") => {
  const authType = typeof source.auth === "string" ? source.auth : source.auth.type;
  if (mode === "none" || authType === "none") return undefined;
  const secrets = resolved.stored.secrets
    .filter((secret) => secret.sourceId === source.id)
    .map((secret) => ({ kind: secret.kind, value: decryptSecret(secret.encryptedValue) }));
  return {
    type: authType,
    secrets,
    headerName:
      typeof source.auth === "object" && source.auth.type === "apiKeyHeader"
        ? source.auth.name
        : typeof source.auth === "object" && source.auth.type === "apiKeyQuery"
          ? source.auth.name
          : undefined,
  };
};

const withRequestLimit = async <T>(
  ctx: RouterContext,
  resolved: ResolvedDefinition,
  request: IdentifiedRequest,
  callback: () => Promise<T>,
) => {
  const release = await acquireCustomWidgetRequestLimit({
    category: request.kind === "query" ? "query" : request.method === "DELETE" ? "delete" : "action",
    userId: ctx.session?.user.id,
    itemId: resolved.item.id,
    definitionId: resolved.stored.id,
  });
  try {
    return await callback();
  } finally {
    await release();
  }
};

const getCacheKey = (resolved: ResolvedDefinition, request: IdentifiedRequest, params: Record<string, unknown>) =>
  `custom-jsx:${resolved.item.id}:${getCustomWidgetCacheVersion(resolved.stored)}:${request.id}:${hashRuntimeParams(params)}`;

const executeRequest = async (
  ctx: RouterContext,
  resolved: ResolvedDefinition,
  request: IdentifiedRequest,
  params: Record<string, string | number | boolean>,
) => {
  await throwIfActionForbiddenAsync(ctx, eq(boards.id, resolved.item.boardId), request.permission as BoardPermission);
  const source = findSource(resolved, request.source);
  const values = resolveCustomWidgetRequestValues(request, resolved.configuration, params);
  const targetUrl = renderRequestTarget(source.baseUrl, request, values);
  return withRequestLimit(ctx, resolved, request, () =>
    executeCustomWidgetRequest({
      baseUrl: source.baseUrl,
      targetUrl,
      method: request.method,
      body: renderRequestBody(request, values),
      staticHeaders: request.headers,
      auth: getAuth(resolved, source, request.auth),
      networkScope: source.networkScope,
      kind: request.kind,
      cacheKey: request.kind === "query" ? getCacheKey(resolved, request, values) : undefined,
      cacheTtlSeconds: request.cacheSeconds,
    }),
  );
};

export const customApiRouter = createTRPCRouter({
  refresh: publicProcedure.input(itemInputSchema).mutation(async ({ ctx, input }) => {
    const resolved = await resolvePlacedDefinitionAsync(ctx, input.itemId);
    invalidateCustomWidgetResponseCache([
      `custom-jsx:${resolved.item.id}:${getCustomWidgetCacheVersion(resolved.stored)}:`,
    ]);
  }),

  getData: publicProcedure.input(itemInputSchema).query(async ({ ctx, input }) => {
    const resolved = await resolvePlacedDefinitionAsync(ctx, input.itemId);
    const loadRequests = Object.entries(resolved.definition.requests).filter(
      ([, request]) => request.kind === "query" && request.trigger === "load",
    );
    const entries = await Promise.all(
      loadRequests.map(async ([requestId, request]) => {
        try {
          const response = await executeRequest(ctx, resolved, { id: requestId, ...request }, {});
          return [
            requestId,
            {
              data: response.data,
              status: {
                loading: false,
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
              },
            },
          ] as const;
        } catch (error) {
          return [
            requestId,
            {
              data: null,
              status: {
                loading: false,
                ok: false,
                status: 0,
                error: error instanceof Error ? error.message : "Request failed",
              },
            },
          ] as const;
        }
      }),
    );

    return {
      type: "customJsx" as const,
      template: resolved.definition.template,
      queryCacheKey: `${getCustomWidgetCacheVersion(resolved.stored)}:${hashRuntimeParams(resolved.configuration)}`,
      data: Object.fromEntries(entries.map(([id, result]) => [id, result.data])),
      status: Object.fromEntries(entries.map(([id, result]) => [id, result.status])),
      options: resolved.configuration,
      requestCapabilities: Object.entries(resolved.definition.requests).map(([id, request]) => ({
        id,
        kind: request.kind,
        method: request.method,
        trigger: request.trigger,
        minimumBoardPermission: request.permission,
        confirmation: getCustomWidgetConfirmation(request),
        invalidates: request.invalidates ?? [],
      })),
    };
  }),

  queryRequest: publicProcedure.input(namedRequestInputSchema).query(async ({ ctx, input }) => {
    const resolved = await resolvePlacedDefinitionAsync(ctx, input.itemId);
    const request = findRequest(resolved, input.requestId, "query");
    if (request.trigger !== "manual") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Load queries cannot be invoked manually" });
    }
    const response = await executeRequest(ctx, resolved, request, input.params);
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    };
  }),

  executeAction: protectedProcedure
    .input(namedRequestInputSchema.extend({ confirmed: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolvePlacedDefinitionAsync(ctx, input.itemId);
      const request = findRequest(resolved, input.requestId, "action");
      const needsConfirmation = request.confirmation !== undefined || request.method === "DELETE";
      if (needsConfirmation && input.confirmed !== true) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This action requires confirmation" });
      }
      const response = await executeRequest(ctx, resolved, request, input.params);
      if (response.ok && request.invalidates?.length) {
        invalidateCustomWidgetResponseCache(
          request.invalidates.flatMap((requestId) => [
            `custom-jsx:${resolved.item.id}:${getCustomWidgetCacheVersion(resolved.stored)}:${requestId}:`,
            `custom-widget:options:${resolved.stored.id}:${getCustomWidgetCacheVersion(resolved.stored)}:${requestId}:`,
          ]),
        );
      }
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        invalidates: request.invalidates ?? [],
      };
    }),
});
