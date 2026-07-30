import { TRPCError } from "@trpc/server";

import { createLogger } from "@homarr/core/infrastructure/logs";
import {
  assertJsonBudget as assertDomainJsonBudget,
  assertSafeStaticHeaders as assertDomainSafeStaticHeaders,
  classifyAddress,
  executeCustomWidgetRequest as executeDomainRequest,
  MAX_REQUEST_BODY_BYTES,
  MAX_RESPONSE_BODY_BYTES,
  MAX_RESPONSE_JSON_DEPTH,
  MAX_RESPONSE_JSON_NODES,
  resolveAndValidateHost as resolveDomainHost,
  resolveSameOriginTarget as resolveDomainTarget,
  validateCustomWidgetUrl as validateDomainUrl,
} from "@homarr/custom-widgets/server";
import type { CustomWidgetHttpRequest, CustomWidgetHttpResponse } from "@homarr/custom-widgets/server";
import { CustomWidgetDomainError } from "@homarr/custom-widgets/server";

import { toTrpcError } from "./domain-error";
import { invalidateCustomWidgetResponseCache, withCustomWidgetResponseCache } from "./response-cache";

export type {
  CustomWidgetAuthConfig,
  CustomWidgetHttpRequest,
  CustomWidgetHttpResponse,
} from "@homarr/custom-widgets/server";
export {
  classifyAddress,
  MAX_REQUEST_BODY_BYTES,
  MAX_RESPONSE_BODY_BYTES,
  MAX_RESPONSE_JSON_DEPTH,
  MAX_RESPONSE_JSON_NODES,
};

const logger = createLogger({ module: "custom-widget:http" });

export interface CustomWidgetRequestExecutionOptions {
  acquireRequestLimit?: () => Promise<() => Promise<void>>;
}

export function assertJsonBudget(value: unknown): void {
  try {
    assertDomainJsonBudget(value);
  } catch (error) {
    toTrpcError(error);
  }
}

export function assertSafeStaticHeaders(headers: Record<string, string> | undefined): void {
  try {
    assertDomainSafeStaticHeaders(headers);
  } catch (error) {
    toTrpcError(error);
  }
}

export function validateCustomWidgetUrl(value: string | URL): URL {
  try {
    return validateDomainUrl(value);
  } catch (error) {
    toTrpcError(error);
  }
}

export function resolveSameOriginTarget(baseUrl: string, target?: string | URL): URL {
  try {
    return resolveDomainTarget(baseUrl, target);
  } catch (error) {
    toTrpcError(error);
  }
}

export async function resolveAndValidateHost(hostname: string, scope: CustomWidgetHttpRequest["networkScope"]) {
  try {
    return await resolveDomainHost(hostname, scope);
  } catch (error) {
    toTrpcError(error);
  }
}

export async function executeCustomWidgetRequest(
  input: CustomWidgetHttpRequest,
  options: CustomWidgetRequestExecutionOptions = {},
): Promise<CustomWidgetHttpResponse> {
  try {
    return await withCustomWidgetResponseCache(input, async () => {
      const release = await options.acquireRequestLimit?.();
      try {
        return await executeDomainRequest({
          ...input,
          cacheKey: undefined,
          cacheTtlSeconds: undefined,
          logError: (event) => {
            if (event.reason === "timeout") return;
            logger.error("Custom widget request failed", {
              event: "custom_widget_request_failed",
              ...event,
            });
          },
        });
      } finally {
        await release?.();
      }
    });
  } catch (error) {
    if (error instanceof CustomWidgetDomainError) {
      logger.warn("Custom widget request rejected", {
        event:
          error.reason === "timeout"
            ? "custom_widget_request_timeout"
            : error.code === "FORBIDDEN"
              ? "custom_widget_network_scope_rejected"
              : error.code === "BAD_GATEWAY"
                ? "custom_widget_upstream_failed"
                : "custom_widget_request_rejected",
        code: error.code,
        origin: safeOrigin(input.baseUrl),
        method: input.method,
      });
      toTrpcError(error);
    }
    if (error instanceof TRPCError) throw error;
    logger.error("Custom widget request failed", {
      event: "custom_widget_request_failed",
      errorName: "UnexpectedTransportError",
      origin: safeOrigin(input.baseUrl),
      method: input.method,
    });
    throw new TRPCError({ code: "BAD_GATEWAY", message: "External request failed" });
  }
}

export { invalidateCustomWidgetResponseCache };

function safeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return "invalid";
  }
}
