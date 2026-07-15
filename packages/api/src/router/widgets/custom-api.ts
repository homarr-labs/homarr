import { TRPCError } from "@trpc/server";
import { parse as parseSuperJson } from "superjson";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { eq } from "@homarr/db";
import { boards, customWidgetDefinitions, items } from "@homarr/db/schema";
import type { BoardPermission } from "@homarr/definitions";
import {
  customJsxDisplayConfigV2Schema,
  displayConfigSchema,
  extractActionButtonDisplay,
  extractDisplayDataWithFallback,
} from "@homarr/custom-widgets/core";
import type { CustomJsxRequest, CustomWidgetMethod, DisplayConfig } from "@homarr/custom-widgets/core";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import { executeCustomWidgetRequest } from "../custom-widget/request-executor";
import { hashRuntimeParams, renderRequestBody, renderRequestTarget } from "../custom-widget/request-manifest";
import { acquireCustomWidgetRequestLimit } from "../custom-widget/request-limits";

const logger = createLogger({ module: "widget:customApi" });

const runtimeParamsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
const itemInputSchema = z.object({ itemId: z.string().min(1) });
const namedRequestInputSchema = itemInputSchema.extend({
  requestId: z.string().min(1).max(64),
  params: runtimeParamsSchema.default({}),
});

type RouterContext = Parameters<typeof throwIfActionForbiddenAsync>[0];
type ResolvedDefinition = Awaited<ReturnType<typeof resolvePlacedDefinitionAsync>>;

const parseItemOptions = (raw: string): { definitionId: string } => {
  try {
    const options = parseSuperJson(raw) as Record<string, unknown>;
    if (typeof options.definitionId !== "string" || options.definitionId.length === 0) throw new Error();
    return { definitionId: options.definitionId };
  } catch {
    throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget item not found" });
  }
};

const parseDisplayConfig = (raw: string): DisplayConfig => {
  try {
    return displayConfigSchema.parse(parseSuperJson(raw));
  } catch (error) {
    logger.error("Invalid custom widget display configuration", { error });
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Custom widget network access needs review",
    });
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
  const { definitionId } = parseItemOptions(item.options);
  const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
    where: eq(customWidgetDefinitions.id, definitionId),
    with: { secrets: true },
  });
  if (!definition) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
  }
  if (!definition.enabled) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Widget is disabled" });
  }

  return { item, definition, displayConfig: parseDisplayConfig(definition.displayConfig) };
}

const getDecryptedSecrets = (resolved: ResolvedDefinition) =>
  resolved.definition.secrets.map((secret) => ({ kind: secret.kind, value: decryptSecret(secret.value) }));

const getAuth = (resolved: ResolvedDefinition, mode: "inherit" | "none" = "inherit") =>
  mode === "none"
    ? undefined
    : {
        type: resolved.definition.authType,
        secrets: getDecryptedSecrets(resolved),
        headerName: resolved.definition.headerName,
      };

const getNetworkScope = (displayConfig: DisplayConfig) =>
  displayConfig.type === "customJsx" && "jsxApiVersion" in displayConfig && displayConfig.jsxApiVersion === 2
    ? displayConfig.networkScope
    : ("private" as const);

const getV2Config = (resolved: ResolvedDefinition) => {
  const parsed = customJsxDisplayConfigV2Schema.safeParse(resolved.displayConfig);
  if (!parsed.success) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This template must be reviewed and migrated to named requests",
    });
  }
  return parsed.data;
};

const findNamedRequest = (resolved: ResolvedDefinition, requestId: string, kind: "query" | "action") => {
  const request = getV2Config(resolved).requests.find((candidate) => candidate.id === requestId);
  if (!request || request.kind !== kind) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Named request not found" });
  }
  return request;
};

const getCacheKey = (
  resolved: ResolvedDefinition,
  request: CustomJsxRequest,
  params: Record<string, string | number | boolean>,
) => {
  const digest = hashRuntimeParams(params);
  return `custom-jsx:${resolved.item.id}:${request.id}:${digest}`;
};

const assertUpstreamSuccess = (response: { ok: boolean; status: number; statusText: string }) => {
  if (!response.ok) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: `API returned ${response.status}: ${response.statusText}` });
  }
};

const withRequestLimit = async <T>(
  ctx: RouterContext,
  resolved: ResolvedDefinition,
  category: "query" | "action" | "delete",
  callback: () => Promise<T>,
) => {
  const release = await acquireCustomWidgetRequestLimit({
    category,
    userId: ctx.session?.user.id,
    itemId: resolved.item.id,
    definitionId: resolved.definition.id,
  });
  try {
    return await callback();
  } finally {
    await release();
  }
};

export const customApiRouter = createTRPCRouter({
  getData: publicProcedure.input(itemInputSchema).query(async ({ ctx, input }) => {
    const resolved = await resolvePlacedDefinitionAsync(ctx, input.itemId);
    const { definition, displayConfig } = resolved;

    if (definition.displayType === "actionButton") {
      return {
        ...(extractActionButtonDisplay(displayConfig) as Record<string, unknown>),
        requiresConfirmation: definition.method === "DELETE",
      };
    }
    if (definition.method !== "GET") {
      return { type: "networkAccessNeedsReview" as const };
    }

    const response = await withRequestLimit(ctx, resolved, "query", () =>
      executeCustomWidgetRequest({
        baseUrl: definition.url,
        method: "GET",
        auth: getAuth(resolved),
        networkScope: getNetworkScope(displayConfig),
        kind: "query",
        cacheKey: `custom-widget:base:${resolved.item.id}`,
      }),
    );
    assertUpstreamSuccess(response);
    return extractDisplayDataWithFallback(response.data, definition.displayType, displayConfig);
  }),

  queryRequest: publicProcedure.input(namedRequestInputSchema).query(async ({ ctx, input }) => {
    const resolved = await resolvePlacedDefinitionAsync(ctx, input.itemId);
    const request = findNamedRequest(resolved, input.requestId, "query");
    const targetUrl = renderRequestTarget(resolved.definition.url, request, input.params);
    const response = await withRequestLimit(ctx, resolved, "query", () =>
      executeCustomWidgetRequest({
        baseUrl: resolved.definition.url,
        targetUrl,
        method: "GET",
        staticHeaders: request.staticHeaders,
        auth: getAuth(resolved, request.auth),
        networkScope: getV2Config(resolved).networkScope,
        kind: "query",
        cacheKey: getCacheKey(resolved, request, input.params),
        cacheTtlSeconds: request.cacheTtlSeconds,
      }),
    );
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    };
  }),

  executeBaseAction: protectedProcedure
    .input(itemInputSchema.extend({ confirmed: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolvePlacedDefinitionAsync(ctx, input.itemId);
      const { definition } = resolved;
      if (definition.displayType !== "actionButton") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only actionButton widgets can use this action" });
      }

      const permission: BoardPermission = definition.method === "DELETE" ? "full" : "modify";
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, resolved.item.boardId), permission);
      if (definition.method === "DELETE" && input.confirmed !== true) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "DELETE actions require confirmation" });
      }

      const response = await withRequestLimit(ctx, resolved, definition.method === "DELETE" ? "delete" : "action", () =>
        executeCustomWidgetRequest({
          baseUrl: definition.url,
          method: definition.method,
          body: definition.method === "GET" ? undefined : (definition.requestBody ?? undefined),
          auth: getAuth(resolved),
          networkScope: getNetworkScope(resolved.displayConfig),
          kind: definition.method === "GET" ? "query" : "action",
        }),
      );
      return {
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        responseInfo: { status: response.status, statusText: response.statusText },
      };
    }),

  executeAction: protectedProcedure
    .input(namedRequestInputSchema.extend({ confirmed: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolvePlacedDefinitionAsync(ctx, input.itemId);
      const request = findNamedRequest(resolved, input.requestId, "action");
      if (request.method === "DELETE" && input.confirmed !== true) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "DELETE actions require confirmation" });
      }

      await throwIfActionForbiddenAsync(
        ctx,
        eq(boards.id, resolved.item.boardId),
        request.minimumBoardPermission as BoardPermission,
      );
      const targetUrl = renderRequestTarget(resolved.definition.url, request, input.params);
      const response = await withRequestLimit(ctx, resolved, request.method === "DELETE" ? "delete" : "action", () =>
        executeCustomWidgetRequest({
          baseUrl: resolved.definition.url,
          targetUrl,
          method: request.method as CustomWidgetMethod,
          body: renderRequestBody(request.bodyTemplate, input.params),
          staticHeaders: request.staticHeaders,
          auth: getAuth(resolved, request.auth),
          networkScope: getV2Config(resolved).networkScope,
          kind: "action",
        }),
      );
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      };
    }),
});
