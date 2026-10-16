import { ApiError } from "../../procedure";

import { FlattenError } from "@homarr/common";
import { CustomWidgetDomainError } from "@homarr/custom-widgets/server";

class RequestLimitTransportError extends FlattenError {}

export function toTrpcError(error: unknown): never {
  if (error instanceof CustomWidgetDomainError) {
    const cause = error.retryAfterMs
      ? new RequestLimitTransportError(error.message, { retryAfterMs: error.retryAfterMs })
      : error;
    throw new ApiError({ code: error.code, message: error.message, cause });
  }
  throw error;
}
