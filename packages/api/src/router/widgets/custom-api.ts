import { getCustomWidgetIntegrationCacheVersion, resolveCustomWidgetSource } from "../custom-widget/source-resolver";
import { ApiError } from "../../procedure";
import { parse as parseSuperJson } from "superjson";
import { z } from "zod/v4";

import { isRecord } from "@homarr/common";
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
import type { CustomJsxRequest } from "@homarr/custom-widgets/core";
import type { RequestLimitInput } from "@homarr/custom-widgets/server";

import { createApiRouter, protectedProcedure, publicProcedure } from "../../procedure";
import type { createApiContext } from "../../procedure";
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

type RouterContext = ReturnType<typeof createApiContext>;
type ResolvedDefinition = Awaited<ReturnType<typeof resolvePlacedDefinitionAsync>>;

const parseItemOptions = (raw: string): CustomWidgetItemOptions => {
  try {
    const options = parseSuperJson(raw) as Record<string, unknown>;
    if (typeof options.definitionId !== "string" || options.definitionId.length === 0) throw new Error();
    return {
      definitionId: options.definitionId,
      configuration: isRecord(options.configuration) ? options.configuration : {},
      configurationVersion:
        typeof options.configurationVersion === "number" && Number.isInteger(options.configurationVersion)
          ? options.configurationVersion
          : 1,
      refreshInterval: typeof options.refreshInterval === "number" ? options.refreshInterval : undefined,
    };
  } catch {
    throw new ApiError({ code: "NOT_FOUND", message: "Custom widget item not found" });
  }
};

async function resolvePlacedDefinitionAsync(context: RouterContext, itemId: string) {
  const item = await context.db.query.items.findFirst({
    where: eq(items.id, itemId),
    columns: { id: true, boardId: true, kind: true, options: true },
  });
  if (!item || item.kind !== "customApi") {
    throw new ApiError({ code: "NOT_FOUND", message: "Custom widget item not found" });
  }

  await throwIfActionForbiddenAsync(context, eq(boards.id, item.boardId), "view");
  const itemOptions = parseItemOptions(item.options);
  const stored = await context.db.query.customWidgetDefinitions.findFirst({
    where: eq(customWidgetDefinitions.id, itemOptions.definitionId),
    with: { secrets: true },
  });
  if (!stored) {
    const legacy = await context.db.query.legacyCustomWidgetDefinitions.findFirst({
      where: eq(legacyCustomWidgetDefinitions.id, itemOptions.definitionId),
      columns: { id: true },
    });
    if (legacy) {
      throw new ApiError({
        code: "PRECONDITION_FAILED",
        message: "LEGACY_CUSTOM_WIDGET_MIGRATION_REQUIRED",
      });
    }
    throw new ApiError({ code: "NOT_FOUND", message: "Custom widget unavailable" });
  }
  if (!stored.enabled) throw new ApiError({ code: "FORBIDDEN", message: "Widget is disabled" });

  const definition = parseStoredCustomWidgetDefinition(stored);
  const configuration =
    itemOptions.configurationVersion === stored.updatedAt.getTime()
      ? { ...getCustomWidgetDefaultOptions(definition.options), ...itemOptions.configuration }
      : normalizeCustomWidgetOptions(definition.options, itemOptions.configuration);
  const issues = validateCustomWidgetOptions(definition.options, configuration);
  if (issues.length > 0) {
    throw new ApiError({
      code: "PRECONDITION_FAILED",
      message: `Custom widget configuration needs repair: ${issues[0]?.path} ${issues[0]?.message}`,
    });
  }
  return { item, stored, definition, itemOptions, configuration };
}

const findRequest = (resolved: ResolvedDefinition, requestId: string, kind: "query" | "action") => {
  const request = resolved.definition.requests[requestId];
  if (request?.kind !== kind) throw new ApiError({ code: "NOT_FOUND", message: "Named request not found" });
  if (!request) throw new ApiError({ code: "NOT_FOUND", message: "Named request not found" });
  return { id: requestId, ...request };
};

const findSource = (resolved: ResolvedDefinition, sourceId: string) => {
  const source = resolved.definition.sources[sourceId];
  if (!source) throw new ApiError({ code: "NOT_FOUND", message: "Widget API source not found" });
  return { id: sourceId, ...source };
};

type IdentifiedRequest = CustomJsxRequest & { id: string };

const withRequestLimit = async <T>(
  context: RouterContext,
  resolved: ResolvedDefinition,
  category: RequestLimitInput["category"],
  callback: () => Promise<T>,
  load?: RequestLimitInput["load"],
) => {
  const release = await acquireCustomWidgetRequestLimit({
    category,
    userId: context.session?.user.id,
    anonymousId: context.requestIdentity?.key ?? "unattributed",
    itemId: resolved.item.id,
    definitionId: resolved.stored.id,
    load,
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
  context: RouterContext,
  resolved: ResolvedDefinition,
  request: IdentifiedRequest,
  params: Record<string, string | number | boolean>,
  load?: RequestLimitInput["load"],
) => {
  await throwIfActionForbiddenAsync(
    context,
    eq(boards.id, resolved.item.boardId),
    request.permission as BoardPermission,
  );
  const source = findSource(resolved, request.source);
  // A worker share publishes this exact stored read, not arbitrary integration access.
  // Input may select declared request parameters, but cannot choose the source or method.
  let sourceContext: typeof context & { publishedIntegrationRead?: { readonly integrationId: string } } = context;
  if (
    context.workerAccess?.role === "viewer" &&
    request.kind === "query" &&
    request.permission === "view" &&
    source.type === "integration" &&
    source.integrationId
  ) {
    sourceContext = { ...context, publishedIntegrationRead: { integrationId: source.integrationId } };
  }
  const values = resolveCustomWidgetRequestValues(request, resolved.configuration, params);
  let category: RequestLimitInput["category"] = "query";
  if (request.kind === "action") category = request.method === "DELETE" ? "delete" : "action";
  return withRequestLimit(
    context,
    resolved,
    category,
    async () => {
      const connection = await resolveCustomWidgetSource(sourceContext, source, request, () =>
        resolved.stored.secrets
          .filter((secret) => secret.sourceId === source.id)
          .map((secret) => ({ kind: secret.kind, value: decryptSecret(secret.encryptedValue) })),
      );
      if (load?.signal?.aborted)
        throw new ApiError({ code: "BAD_REQUEST", message: "Custom widget load was cancelled" });
      const targetUrl = renderRequestTarget(connection.baseUrl, request, values);
      const response = await executeCustomWidgetRequest({
        ...connection,
        targetUrl,
        method: request.method,
        body: renderRequestBody(request, values),
        staticHeaders: request.headers,
        kind: request.kind,
        cacheKey:
          request.kind === "query" ? `${getCacheKey(resolved, request, values)}:${connection.cacheVersion}` : undefined,
        cacheTtlSeconds: request.cacheSeconds,
      });
      return { ...response, sourceCacheVersion: connection.cacheVersion };
    },
    load,
  );
};

export const customApiRouter = createApiRouter({
  refresh: publicProcedure.input(itemInputSchema).mutation(async ({ context, input }) => {
    const resolved = await resolvePlacedDefinitionAsync(context, input.itemId);
    try {
      await withRequestLimit(context, resolved, "refresh", async () => {
        invalidateCustomWidgetResponseCache([
          `custom-jsx:${resolved.item.id}:${getCustomWidgetCacheVersion(resolved.stored)}:`,
        ]);
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === "TOO_MANY_REQUESTS") {
        throw new ApiError({
          code: "TOO_MANY_REQUESTS",
          message: "Custom widget refresh limit exceeded. Please wait before refreshing again.",
          cause: error.cause,
        });
      }
      throw error;
    }
  }),

  getData: publicProcedure.input(itemInputSchema).query(async ({ context, input, signal }) => {
    const resolved = await resolvePlacedDefinitionAsync(context, input.itemId);
    const loadRequests = Object.entries(resolved.definition.requests).filter(
      ([, request]) => request.kind === "query" && request.trigger === "load",
    );
    const entries = await Promise.all(
      loadRequests.map(async ([requestId, request]) => {
        try {
          const response = await executeRequest(context, resolved, { id: requestId, ...request }, {}, { signal });
          return [
            requestId,
            {
              sourceId: request.source,
              sourceCacheVersion: response.sourceCacheVersion,
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
              sourceId: request.source,
              sourceCacheVersion:
                resolved.definition.sources[request.source]?.type === "integration" ? "unavailable" : "",
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
    const integrationVersions = new Map<string, string>();
    for (const [, result] of entries) {
      if (!result.sourceCacheVersion) continue;
      if (result.sourceCacheVersion === "unavailable" && integrationVersions.has(result.sourceId)) continue;
      integrationVersions.set(result.sourceId, result.sourceCacheVersion);
    }
    const loadSourceIds = new Set(loadRequests.map(([, request]) => request.source));
    const manualSourceIds = new Set<string>();
    for (const request of Object.values(resolved.definition.requests)) {
      if (request.kind !== "query" || request.trigger !== "manual" || loadSourceIds.has(request.source)) continue;
      if (resolved.definition.sources[request.source]?.type !== "integration") continue;
      manualSourceIds.add(request.source);
    }
    const manualIntegrationVersions = await Promise.all(
      [...manualSourceIds].map(async (sourceId) => {
        const source = resolved.definition.sources[sourceId];
        if (source?.type !== "integration") return [sourceId, "unavailable"] as const;
        try {
          const version = await withRequestLimit(context, resolved, "metadata", () =>
            getCustomWidgetIntegrationCacheVersion(context, source),
          );
          return [sourceId, version] as const;
        } catch {
          return [sourceId, "unavailable"] as const;
        }
      }),
    );
    for (const [sourceId, version] of manualIntegrationVersions) integrationVersions.set(sourceId, version);
    const integrationCacheKey = [...integrationVersions]
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([sourceId, version]) => `${sourceId}:${version}`)
      .join(":");

    return {
      type: "customJsx" as const,
      template: resolved.definition.template,
      queryCacheKey: `${getCustomWidgetCacheVersion(resolved.stored)}:${hashRuntimeParams(resolved.configuration)}:${integrationCacheKey}`,
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

  // Board publication is a narrower contract than the interactive widget runtime.
  // Even an owner caller cannot turn a read share into modify/full load queries.
  getShareData: publicProcedure.input(itemInputSchema).query(async ({ context, input, signal }) => {
    const resolved = await resolvePlacedDefinitionAsync(context, input.itemId);
    const requests = Object.entries(resolved.definition.requests).filter(
      ([, request]) => request.kind === "query" && request.trigger === "load" && request.permission === "view",
    );
    const entries = await Promise.all(
      requests.map(async ([id, request]) => {
        try {
          const response = await executeRequest(context, resolved, { id, ...request }, {}, { signal });
          return [id, { data: response.data, status: { ok: response.ok, status: response.status } }] as const;
        } catch {
          return [id, { data: null, status: { ok: false, status: 0 } }] as const;
        }
      }),
    );
    return {
      data: Object.fromEntries(entries.map(([id, result]) => [id, result.data])),
      status: Object.fromEntries(entries.map(([id, result]) => [id, result.status])),
    };
  }),

  queryRequest: publicProcedure.input(namedRequestInputSchema).query(async ({ context, input }) => {
    const resolved = await resolvePlacedDefinitionAsync(context, input.itemId);
    const request = findRequest(resolved, input.requestId, "query");
    if (request.trigger !== "manual") {
      throw new ApiError({ code: "BAD_REQUEST", message: "Load queries cannot be invoked manually" });
    }
    const response = await executeRequest(context, resolved, request, input.params);
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
    .mutation(async ({ context, input }) => {
      const resolved = await resolvePlacedDefinitionAsync(context, input.itemId);
      const request = findRequest(resolved, input.requestId, "action");
      const needsConfirmation = request.confirmation !== undefined || request.method === "DELETE";
      if (needsConfirmation && input.confirmed !== true) {
        throw new ApiError({ code: "PRECONDITION_FAILED", message: "This action requires confirmation" });
      }
      const response = await executeRequest(context, resolved, request, input.params);
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
