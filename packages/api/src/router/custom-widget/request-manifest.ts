import { createHash } from "node:crypto";

import { TRPCError } from "@trpc/server";

import type { CustomJsxRequest } from "@homarr/validation/custom-widget";

import { resolveSameOriginTarget } from "./request-executor";

export type CustomJsxRuntimeParams = Record<string, string | number | boolean>;

export const validateRuntimeParams = (request: CustomJsxRequest, params: CustomJsxRuntimeParams) => {
  const declaredNames = Object.keys(request.parameters).toSorted();
  const suppliedNames = Object.keys(params).toSorted();
  if (
    declaredNames.length !== suppliedNames.length ||
    declaredNames.some((name, index) => name !== suppliedNames[index])
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Request parameters do not match the manifest" });
  }
  for (const [name, expectedType] of Object.entries(request.parameters)) {
    if (typeof params[name] !== expectedType) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Request parameter '${name}' must be ${expectedType}` });
    }
  }
};

export const renderRequestBody = (
  template: CustomJsxRequest["bodyTemplate"],
  params: CustomJsxRuntimeParams,
): string | undefined => {
  if (template === undefined) return undefined;
  const substitute = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(substitute);
    if (value !== null && typeof value === "object") {
      const entries = Object.entries(value);
      if (entries.length === 1 && entries[0]?.[0] === "$param" && typeof entries[0][1] === "string") {
        const parameter = params[entries[0][1]];
        if (parameter === undefined) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown body parameter '${entries[0][1]}'` });
        }
        return parameter;
      }
      return Object.fromEntries(entries.map(([key, child]) => [key, substitute(child)]));
    }
    return value;
  };
  return JSON.stringify(substitute(template));
};

export const renderRequestTarget = (baseUrl: string, request: CustomJsxRequest, params: CustomJsxRuntimeParams) => {
  validateRuntimeParams(request, params);
  const path = request.pathTemplate.replaceAll(/\{([a-z][a-z0-9_-]*)\}/g, (_placeholder, name: string) => {
    const value = params[name];
    if (value === undefined) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown path parameter '${name}'` });
    }
    return encodeURIComponent(String(value));
  });
  if (/[{}]/.test(path)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Path template contains an invalid placeholder" });
  }
  return resolveSameOriginTarget(baseUrl, new URL(path, baseUrl));
};

export const hashRuntimeParams = (params: CustomJsxRuntimeParams) => {
  const stableParams = Object.fromEntries(
    Object.entries(params).toSorted(([left], [right]) => left.localeCompare(right)),
  );
  return createHash("sha256").update(JSON.stringify(stableParams)).digest("hex");
};
