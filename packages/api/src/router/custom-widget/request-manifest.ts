import type { CustomJsxRequest } from "@homarr/custom-widgets/core";
import {
  hashRuntimeParams,
  renderRequestBody as renderDomainBody,
  renderRequestTarget as renderDomainTarget,
  resolveCustomWidgetRequestValues as resolveDomainValues,
} from "@homarr/custom-widgets/server";
import type { CustomJsxRuntimeParams } from "@homarr/custom-widgets/server";

import { toTrpcError } from "./domain-error";

export type { CustomJsxRuntimeParams } from "@homarr/custom-widgets/server";
export { hashRuntimeParams };

type CustomJsxResolvedValues = ReturnType<typeof resolveDomainValues>;

export function resolveCustomWidgetRequestValues(
  request: CustomJsxRequest,
  options: Record<string, unknown>,
  params: CustomJsxRuntimeParams = {},
) {
  try {
    return resolveDomainValues(request, options, params);
  } catch (error) {
    return toTrpcError(error);
  }
}

export function renderRequestBody(request: CustomJsxRequest, params: CustomJsxResolvedValues) {
  try {
    return renderDomainBody(request, params);
  } catch (error) {
    return toTrpcError(error);
  }
}

export function renderRequestTarget(baseUrl: string, request: CustomJsxRequest, params: CustomJsxResolvedValues) {
  try {
    return renderDomainTarget(baseUrl, request, params);
  } catch (error) {
    return toTrpcError(error);
  }
}
