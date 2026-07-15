import type { CustomJsxRequest } from "@homarr/custom-widgets/core";
import {
  hashRuntimeParams,
  renderRequestBody as renderDomainBody,
  renderRequestTarget as renderDomainTarget,
  validateRuntimeParams as validateDomainParams,
} from "@homarr/custom-widgets/server";
import type { CustomJsxRuntimeParams } from "@homarr/custom-widgets/server";

import { toTrpcError } from "./domain-error";

export type { CustomJsxRuntimeParams } from "@homarr/custom-widgets/server";
export { hashRuntimeParams };

export function validateRuntimeParams(request: CustomJsxRequest, params: CustomJsxRuntimeParams): void {
  try {
    validateDomainParams(request, params);
  } catch (error) {
    toTrpcError(error);
  }
}

export function renderRequestBody(request: CustomJsxRequest["bodyTemplate"], params: CustomJsxRuntimeParams) {
  try {
    return renderDomainBody(request, params);
  } catch (error) {
    toTrpcError(error);
  }
}

export function renderRequestTarget(baseUrl: string, request: CustomJsxRequest, params: CustomJsxRuntimeParams) {
  try {
    return renderDomainTarget(baseUrl, request, params);
  } catch (error) {
    toTrpcError(error);
  }
}
