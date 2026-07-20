import { createHash } from "node:crypto";

import { CustomWidgetDomainError } from "./errors";

import { isCustomWidgetParameterIdentifier } from "../core";
import type { CustomJsxRequest } from "../core";

import { resolveSameOriginTarget } from "./request-executor";

export type CustomJsxRuntimeParams = Record<string, string | number | boolean>;

export const validateRuntimeParams = (request: CustomJsxRequest, params: CustomJsxRuntimeParams) => {
  const declaredNames = Object.keys(request.parameters).toSorted();
  const suppliedNames = Object.keys(params).toSorted();
  if (
    declaredNames.length !== suppliedNames.length ||
    declaredNames.some((name, index) => name !== suppliedNames[index])
  ) {
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Request parameters do not match the manifest" });
  }
  for (const [name, expectedType] of Object.entries(request.parameters)) {
    if (typeof params[name] !== expectedType) {
      throw new CustomWidgetDomainError({
        code: "BAD_REQUEST",
        message: `Request parameter '${name}' must be ${expectedType}`,
      });
    }
  }
};

export const renderBoundValue = (template: unknown, params: CustomJsxRuntimeParams): unknown => {
  const substitute = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(substitute);
    if (value !== null && typeof value === "object") {
      const entries = Object.entries(value);
      if (entries.length === 1 && entries[0]?.[0] === "$param" && typeof entries[0][1] === "string") {
        const parameter = params[entries[0][1]];
        if (parameter === undefined) {
          throw new CustomWidgetDomainError({
            code: "BAD_REQUEST",
            message: `Unknown body parameter '${entries[0][1]}'`,
          });
        }
        return parameter;
      }
      return Object.fromEntries(entries.map(([key, child]) => [key, substitute(child)]));
    }
    return value;
  };
  return substitute(template);
};

export const renderRequestBody = (
  template: CustomJsxRequest["bodyTemplate"],
  params: CustomJsxRuntimeParams,
): string | undefined => {
  if (template === undefined) return undefined;
  return JSON.stringify(renderBoundValue(template, params));
};

export const renderRequestTarget = (baseUrl: string, request: CustomJsxRequest, params: CustomJsxRuntimeParams) => {
  validateRuntimeParams(request, params);
  const path = request.pathTemplate.replaceAll(/\{([^{}]+)\}/g, (_placeholder, name: string) => {
    if (!isCustomWidgetParameterIdentifier(name)) {
      throw new CustomWidgetDomainError({
        code: "BAD_REQUEST",
        message: `Path template contains an invalid placeholder '${name}'`,
      });
    }
    const value = params[name];
    if (value === undefined) {
      throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: `Unknown path parameter '${name}'` });
    }
    return encodeURIComponent(String(value));
  });
  if (/[{}]/.test(path)) {
    throw new CustomWidgetDomainError({
      code: "BAD_REQUEST",
      message: "Path template contains an invalid placeholder",
    });
  }
  const target = resolveSameOriginTarget(baseUrl, new URL(path, baseUrl));
  for (const [name, template] of Object.entries(request.queryTemplate ?? {})) {
    const value = renderBoundValue(template, params);
    if (!["string", "number", "boolean"].includes(typeof value)) {
      throw new CustomWidgetDomainError({
        code: "BAD_REQUEST",
        message: `Query parameter '${name}' must resolve to a string, number, or boolean`,
      });
    }
    target.searchParams.set(name, String(value));
  }
  return target;
};

export const hashRuntimeParams = (params: CustomJsxRuntimeParams) => {
  const stableParams = Object.fromEntries(
    Object.entries(params).toSorted(([left], [right]) => left.localeCompare(right)),
  );
  return createHash("sha256").update(JSON.stringify(stableParams)).digest("hex");
};
