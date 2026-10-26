import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/core/infrastructure/certificates";
import { createCustomCheckServerIdentity } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";
import {
  assertJsonBudget as assertDomainJsonBudget,
  assertSafeStaticHeaders as assertDomainSafeStaticHeaders,
  executeCustomWidgetRequest as executeDomainRequest,
  invalidateCustomWidgetResponseCache as invalidateDomainResponseCache,
  MAX_REQUEST_BODY_BYTES,
  MAX_RESPONSE_BODY_BYTES,
  MAX_RESPONSE_JSON_DEPTH,
  MAX_RESPONSE_JSON_NODES,
  resolveSameOriginTarget as resolveDomainTarget,
  validateCustomWidgetUrl as validateDomainUrl,
} from "@homarr/custom-widgets/server";
import type { CustomWidgetHttpRequest, CustomWidgetHttpResponse } from "@homarr/custom-widgets/server";

import { toTrpcError } from "./domain-error";

export type {
  CustomWidgetAuthConfig,
  CustomWidgetHttpRequest,
  CustomWidgetHttpResponse,
} from "@homarr/custom-widgets/server";
export { MAX_REQUEST_BODY_BYTES, MAX_RESPONSE_BODY_BYTES, MAX_RESPONSE_JSON_DEPTH, MAX_RESPONSE_JSON_NODES };

const logger = createLogger({ module: "custom-widget:http" });

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

export async function executeCustomWidgetRequest(input: CustomWidgetHttpRequest): Promise<CustomWidgetHttpResponse> {
  try {
    return await executeDomainRequest({
      ...input,
      resolveConnectionAsync: async () => {
        const connection = (await input.resolveConnectionAsync?.()) ?? input;
        if (validateDomainUrl(connection.baseUrl).protocol !== "https:" || connection.tls) return connection;
        const [ca, hostnames] = await Promise.all([
          getAllTrustedCertificatesAsync(),
          getTrustedCertificateHostnamesAsync(),
        ]);
        return { ...connection, tls: { ca, checkServerIdentity: createCustomCheckServerIdentity(hostnames) } };
      },
      logError: (event) => logger.error("Custom widget request failed", event),
    });
  } catch (error) {
    toTrpcError(error);
  }
}

export const invalidateCustomWidgetResponseCache = (prefixes: readonly string[]) =>
  invalidateDomainResponseCache(prefixes);
