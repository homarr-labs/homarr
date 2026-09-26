import { createLogger } from "@homarr/core/infrastructure/logs";
import {
  executeCustomWidgetRequest as executeDomainRequest,
  invalidateCustomWidgetResponseCache as invalidateDomainResponseCache,
} from "@homarr/custom-widgets/server";
import type { CustomWidgetHttpRequest, CustomWidgetHttpResponse } from "@homarr/custom-widgets/server";

import { toTrpcError } from "./domain-error";

const logger = createLogger({ module: "custom-widget:http" });

export async function executeCustomWidgetRequest(input: CustomWidgetHttpRequest): Promise<CustomWidgetHttpResponse> {
  try {
    return await executeDomainRequest({
      ...input,
      logError: (event) => logger.error("Custom widget request failed", event),
    });
  } catch (error) {
    toTrpcError(error);
  }
}

export const invalidateCustomWidgetResponseCache = (prefixes: readonly string[]) =>
  invalidateDomainResponseCache(prefixes);
