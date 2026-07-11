import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import { customWidgetDefinitions } from "@homarr/db/schema";
import { eq } from "@homarr/db";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { applyAuth } from "../custom-widget/auth";
import { extractActionButtonDisplay, extractDisplayDataWithFallback } from "../custom-widget/display-data";

const logger = createLogger({ module: "widget:customApi" });

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_SIZE = 10_000;

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

const validateUrl = (urlString: string): URL => new URL(urlString);

const resolveTargetUrl = (definitionUrl: string, targetUrl: string): URL => new URL(targetUrl, validateUrl(definitionUrl));

const assertSameOrigin = (definitionUrl: string, targetUrl: URL): void => {
  const definitionOrigin = validateUrl(definitionUrl).origin;
  if (targetUrl.origin !== definitionOrigin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "URL must be on the same domain as the widget definition",
    });
  }
};

const parseResponseData = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const customApiRouter = createTRPCRouter({
  getData: protectedProcedure.input(z.object({ definitionId: z.string() })).query(async ({ ctx, input }) => {
    const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.definitionId),
      with: { secrets: true },
    });

    if (!definition) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
    }

    if (!definition.enabled) {
      return { type: "disabled" };
    }

    let displayConfig: Record<string, unknown>;
    try {
      displayConfig = superjson.parse(definition.displayConfig) as Record<string, unknown>;
    } catch {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Widget has corrupt display configuration" });
    }

    if (definition.displayType === "actionButton") {
      return extractActionButtonDisplay(displayConfig);
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

      if (!response.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `API returned ${response.status}: ${response.statusText}`,
        });
      }

      const json: unknown = await response.json();
      return extractDisplayDataWithFallback(json, definition.displayType, displayConfig);
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      logger.error("Failed to fetch custom API data", { definitionId: input.definitionId, error });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch data from external API",
      });
    } finally {
      clearTimeout(timeout);
    }
  }),

  subFetch: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Proxy an HTTP request from a custom JSX widget to an external API on the same domain as the widget definition. Applies the definition's auth credentials. Requires definitionId from the widget configuration.",
      },
    })
    .input(
      z.object({
        definitionId: z.string(),
        url: z.string().min(1).max(2048),
        method: z.enum(HTTP_METHODS).default("GET"),
        body: z.string().max(MAX_BODY_SIZE).optional(),
        headers: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.body && input.body.length > MAX_BODY_SIZE) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Request body exceeds 10KB limit" });
      }

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

      const decryptedSecrets = definition.secrets.map((s) => ({
        kind: s.kind,
        value: decryptSecret(s.value),
      }));

      const targetUrl = resolveTargetUrl(definition.url, input.url);
      assertSameOrigin(definition.url, targetUrl);

      const headers = new Headers({ Accept: "application/json" });
      if (input.headers) {
        for (const [key, value] of Object.entries(input.headers)) {
          headers.set(key, value);
        }
      }

      if (input.method !== "GET" && input.body) {
        headers.set("Content-Type", "application/json");
      }

      applyAuth(headers, targetUrl, definition.authType, decryptedSecrets, definition.headerName);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(targetUrl.toString(), {
          method: input.method,
          headers,
          body: input.method !== "GET" ? input.body : undefined,
          redirect: "follow",
          signal: controller.signal,
        });

        const data = await parseResponseData(response);

        if (!response.ok) {
          return {
            ok: false as const,
            status: response.status,
            data,
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        return { ok: true as const, status: response.status, data };
      } catch (error) {
        logger.error("SubFetch proxy request failed", { definitionId: input.definitionId, url: input.url, error });
        return {
          ok: false as const,
          status: 0,
          data: null,
          error: error instanceof Error ? error.message : "Request failed",
        };
      } finally {
        clearTimeout(timeout);
      }
    }),
});
